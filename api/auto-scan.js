// 自動スキャン: Yahoo!売れ筋 → Claude翻訳 → eBay価格確認 → 利益30%以上 → 世界ポケット投入
// Vercel Cron: 毎日UTC18時(JST午前3時)に実行

const YAHOO_KEYWORDS = [
  "ポケモンカード",
  "ワンピースカード",
  "ガンプラ",
  "ねんどろいど",
  "フィギュア アニメ",
  "遊戯王カード",
  "プラモデル バンダイ",
  "鬼滅の刃 グッズ",
  "日本酒 プレミアム",
  "腕時計 メンズ ブランド",
];

const EXCLUDE_KEYWORDS = ["予約", "中古", "残りわずか", "取り寄せ", "入荷待ち", "【予約】", "pre-order", "オリパ", "くじ", "ガチャ"];

const PROFIT_THRESHOLD = 0.25;
const USD_JPY = 150;
const EBAY_FEE_RATE = 0.129;
const EBAY_FEE_FIXED = 0.30;
const DAILY_LIMIT = 90;

function estimateShippingJpy(sellPriceUsd) {
  if (sellPriceUsd < 30) return 1200;
  if (sellPriceUsd < 80) return 1950;
  return 2700;
}

export default async function handler(req, res) {
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const appId = process.env.VITE_EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  const yahooClientId = process.env.VITE_YAHOO_CLIENT_ID;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  try {
    // eBay OAuthトークン取得
    const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");
    const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "eBay token error", detail: tokenData });
    }
    const ebayToken = tokenData.access_token;

    const profitable = [];
    const today = new Date();

    for (const keyword of YAHOO_KEYWORDS) {
      if (profitable.length >= DAILY_LIMIT) break;

      // Yahoo!ショッピングでキーワード別売れ筋を取得（新品・在庫あり）
      const yahooUrl = `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?appid=${yahooClientId}&query=${encodeURIComponent(keyword)}&results=20&sort=-sold&in_stock=true&condition=new`;
      const yahooRes = await fetch(yahooUrl);
      const yahooData = await yahooRes.json();
      const rawItems = yahooData.hits || [];

      // 予約品・中古品フィルタリング
      const yahooItems = rawItems.filter(item => {
        const condition = item.condition || "";
        if (condition && condition !== "new") return false;
        if (EXCLUDE_KEYWORDS.some(kw => (item.name || "").includes(kw))) return false;
        if (item.releaseDate) {
          const releaseDate = new Date(item.releaseDate);
          if (releaseDate > today) return false;
        }
        const availability = item.availability || "";
        if (["preOrder", "outOfStock", "backOrder"].includes(availability)) return false;
        return true;
      });

      for (const yahooItem of yahooItems) {
        if (profitable.length >= DAILY_LIMIT) break;

        const buyPriceJpy = yahooItem.price || 0;
        if (buyPriceJpy < 500 || buyPriceJpy > 30000) continue;

        // JANコードがあれば優先、なければClaude翻訳
        const jan = yahooItem.janCode || null;
        let searchKeyword = jan || "";

        if (!jan && anthropicKey) {
          try {
            const translateRes = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 100,
                messages: [{
                  role: "user",
                  content: `この日本語の商品名をeBayで検索するための英語キーワードに変換してください。
ブランド名・シリーズ名・キャラクター名・商品タイプを含む、5〜8語の検索キーワードを返してください。
余計な説明は不要です。キーワードだけを1行で返してください。
商品名: ${yahooItem.name}`,
                }],
              }),
            });
            const translateData = await translateRes.json();
            searchKeyword = translateData.content?.[0]?.text?.trim() || (yahooItem.name || "").slice(0, 50);
          } catch (_) {
            searchKeyword = (yahooItem.name || "").slice(0, 50);
          }
        } else if (!jan) {
          searchKeyword = (yahooItem.name || "").slice(0, 50);
        }

        if (!searchKeyword) continue;

        await sleep(200);

        // eBayで同等品の販売価格を検索（Browse API）
        const ebayRes = await fetch(
          `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(searchKeyword)}&filter=buyingOptions%3A%7BFIXED_PRICE%7D&sort=BEST_MATCH&limit=5`,
          {
            headers: {
              Authorization: `Bearer ${ebayToken}`,
              "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
            },
          }
        );
        const ebayData = await ebayRes.json();
        const ebayItems = ebayData.itemSummaries || [];
        if (ebayItems.length === 0) continue;

        // 価格妥当性チェック（Yahoo価格の1.2〜10倍の範囲内のみ採用）
        const buyPriceUsd = buyPriceJpy / USD_JPY;
        const validPrices = ebayItems
          .map(i => parseFloat(i.price?.value || "0"))
          .filter(p => {
            if (p < 5) return false;
            const ratio = p / buyPriceUsd;
            return ratio >= 1.2 && ratio <= 10;
          });

        if (validPrices.length === 0) continue;

        // 中央値を使う（最安値は競合が激しすぎる場合があるため）
        const sortedPrices = [...validPrices].sort((a, b) => a - b);
        const sellPriceUsd = sortedPrices[Math.floor(sortedPrices.length / 2)];
        const ebayItem = ebayItems.find(i => Math.abs(parseFloat(i.price?.value || "0") - sellPriceUsd) < 0.01) || ebayItems[0];

        // 利益計算（送料は販売価格帯で変動）
        const sellJpy = sellPriceUsd * USD_JPY;
        const ebayFee = (sellPriceUsd * EBAY_FEE_RATE + EBAY_FEE_FIXED) * USD_JPY;
        const shippingJpy = estimateShippingJpy(sellPriceUsd);
        const profitJpy = sellJpy - buyPriceJpy - shippingJpy - ebayFee;
        const profitRate = profitJpy / sellJpy;

        if (profitRate < PROFIT_THRESHOLD) continue;

        // Yahoo商品コード抽出
        const itemCode = extractYahooItemCode(yahooItem.url, yahooItem.code);
        if (!itemCode) continue;

        profitable.push({
          yahooName: (yahooItem.name || "").slice(0, 60),
          ebayTitle: (ebayItem?.title || "").slice(0, 60),
          ebayUrl: ebayItem?.itemWebUrl,
          searchKeyword,
          jan: jan || null,
          sellPriceUsd,
          buyPriceJpy,
          profitJpy: Math.round(profitJpy),
          profitRate: Math.round(profitRate * 100),
          itemCode,
          category: keyword,
        });

        await sleep(300);
      }

      await sleep(500);
    }

    // 世界ポケットに自動投入
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const results = [];
    for (const item of profitable) {
      const spRes = await fetch(`${baseUrl}/api/sekaipocket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemCode: item.itemCode }),
      });
      const spData = await spRes.json();
      results.push({ ...item, sekaipocket: spData.success ? "投入済み" : (spData.error || "失敗") });
      await sleep(2000);
    }

    return res.status(200).json({
      scanned: YAHOO_KEYWORDS.length,
      profitable: profitable.length,
      submitted: results.filter(r => r.sekaipocket === "投入済み").length,
      results,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}

function extractYahooItemCode(url, code) {
  if (url) {
    const m1 = url.match(/store\.shopping\.yahoo\.co\.jp\/([^/]+)\/([^/?#.]+)/);
    if (m1) return `${m1[1]}_${m1[2]}`;
    const m2 = url.match(/item\.shopping\.yahoo\.co\.jp\/detail\/([^/?#]+)/);
    if (m2) return m2[1].replace(/-/, "_");
  }
  return code || null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
