// eBay売れ筋 → Claude翻訳 → Yahoo!Japan逆引き仕入れ → 利益計算
// 根拠のある出品: eBayで既に売れている商品から仕入れ先を探す

const USD_JPY = 150;
const EBAY_FEE_RATE = 0.129;
const EBAY_FEE_FIXED = 0.30;

function estimateShippingJpy(sellPriceUsd) {
  if (sellPriceUsd < 30) return 1200;
  if (sellPriceUsd < 80) return 1950;
  return 2700;
}

function calcProfit(buyPriceJpy, sellPriceUsd) {
  const sellJpy = sellPriceUsd * USD_JPY;
  const ebayFee = (sellPriceUsd * EBAY_FEE_RATE + EBAY_FEE_FIXED) * USD_JPY;
  const shippingJpy = estimateShippingJpy(sellPriceUsd);
  const profitJpy = Math.round(sellJpy - buyPriceJpy - shippingJpy - ebayFee);
  const profitRate = Math.round((profitJpy / sellJpy) * 100);
  return { profitJpy, profitRate };
}

export default async function handler(req, res) {
  const keyword = req.query.keyword || req.body?.keyword || "";
  const limit = Math.min(parseInt(req.query.limit || "20"), 30);

  const appId = process.env.VITE_EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  const yahooClientId = process.env.VITE_YAHOO_CLIENT_ID;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const log = [];

  try {
    // 1. eBay OAuthトークン取得
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
    log.push("✅ eBay認証OK");

    // 2. eBay Browse APIで現行出品を検索（固定価格・ベストマッチ順）
    const ebayRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}&filter=buyingOptions%3A%7BFIXED_PRICE%7D,itemLocationCountry%3AJP&sort=BEST_MATCH&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${ebayToken}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      }
    );
    const ebayData = await ebayRes.json();
    let ebayItems = ebayData.itemSummaries || [];

    // 日本セラー限定で0件ならフィルタなしで再検索
    if (ebayItems.length === 0) {
      const ebayRes2 = await fetch(
        `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}&filter=buyingOptions%3A%7BFIXED_PRICE%7D&sort=BEST_MATCH&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${ebayToken}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          },
        }
      );
      const ebayData2 = await ebayRes2.json();
      ebayItems = ebayData2.itemSummaries || [];
      log.push(`📦 eBay（全セラー）: ${ebayItems.length}件`);
    } else {
      log.push(`📦 eBay（日本セラー）: ${ebayItems.length}件`);
    }

    if (ebayItems.length === 0) {
      return res.status(200).json({ results: [], log: [...log, "⚠ eBay検索結果0件"] });
    }

    const results = [];

    // 3. 各eBay商品についてYahoo!Japanで仕入れ先を逆引き
    for (const ebayItem of ebayItems) {
      const ebayPriceUsd = parseFloat(ebayItem.price?.value || "0");
      if (ebayPriceUsd < 5 || ebayPriceUsd > 500) continue;

      // Claude: eBay英語タイトル → Yahoo!Japan日本語検索キーワード
      let jaKeyword = "";
      if (anthropicKey) {
        try {
          const tr = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 80,
              messages: [{
                role: "user",
                content: `以下のeBay商品タイトルから、Yahoo!ショッピングで同一商品を検索するための日本語キーワードを生成してください。
必ずシリーズ名・商品種別（フィギュア/キーホルダー/カード/プラモ等）・セット数や型番を含めて3〜5語を1行で返してください。説明不要。
タイトル: ${ebayItem.title}`,
              }],
            }),
          });
          const td = await tr.json();
          jaKeyword = td.content?.[0]?.text?.trim() || "";
        } catch (_) {}
      }

      // Yahoo!Japanで仕入れ先を検索
      let yahooPrice = null;
      let yahooUrl = null;
      let yahooName = null;

      if (jaKeyword && yahooClientId) {
        try {
          // 価格フィルターなし — 最安値を取得して実際の利益率を計算する
          const yUrl = `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?appid=${yahooClientId}&query=${encodeURIComponent(jaKeyword)}&results=10&sort=+price&in_stock=true&condition=new`;
          const yRes = await fetch(yUrl);
          const yData = await yRes.json();
          const minYahooPrice = Math.round(ebayPriceUsd * USD_JPY * 0.40);
          const yItems = (yData.hits || []).filter(yi => (yi.price || 0) >= minYahooPrice);

          if (yItems.length > 0) {
            yItems.sort((a, b) => (a.price || 0) - (b.price || 0));
            yahooPrice = yItems[0].price;
            yahooUrl = yItems[0].url;
            yahooName = (yItems[0].name || "").slice(0, 50);
          } else {
            // 見つからなければキーワードを短くして再検索
            const shortKw = jaKeyword.split(/\s|　/).slice(0, 2).join(" ");
            if (shortKw && shortKw !== jaKeyword) {
              const yUrl2 = `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?appid=${yahooClientId}&query=${encodeURIComponent(shortKw)}&results=10&sort=+price&in_stock=true`;
              const yRes2 = await fetch(yUrl2);
              const yData2 = await yRes2.json();
              const yItems2 = (yData2.hits || []).filter(yi => (yi.price || 0) >= minYahooPrice);
              if (yItems2.length > 0) {
                yItems2.sort((a, b) => (a.price || 0) - (b.price || 0));
                yahooPrice = yItems2[0].price;
                yahooUrl = yItems2[0].url;
                yahooName = (yItems2[0].name || "").slice(0, 50);
              }
            }
          }
        } catch (_) {}
      }

      const { profitJpy, profitRate } = yahooPrice
        ? calcProfit(yahooPrice, ebayPriceUsd)
        : { profitJpy: null, profitRate: null };

      results.push({
        ebayTitle: (ebayItem.title || "").slice(0, 70),
        ebayPrice: ebayPriceUsd,
        ebayUrl: ebayItem.itemWebUrl,
        ebayImage: ebayItem.image?.imageUrl || null,
        ebayCondition: ebayItem.condition || null,
        ebayLocation: ebayItem.itemLocation?.country || null,
        yahooPrice,
        yahooUrl,
        yahooName,
        jaKeyword,
        profitJpy,
        profitRate,
        sourcingFound: !!yahooPrice,
      });

      await sleep(250);
    }

    // 仕入先あり→利益率高い順、仕入先なし→後ろ
    results.sort((a, b) => {
      if (a.sourcingFound && !b.sourcingFound) return -1;
      if (!a.sourcingFound && b.sourcingFound) return 1;
      return (b.profitRate ?? -999) - (a.profitRate ?? -999);
    });

    const found = results.filter(r => r.sourcingFound).length;
    log.push(`✅ 仕入先発見: ${found}件 / eBay${results.length}件`);

    return res.status(200).json({ results, log });
  } catch (e) {
    return res.status(500).json({ error: e.message, log });
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
