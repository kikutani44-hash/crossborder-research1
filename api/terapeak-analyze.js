// Terapeak CSVデータ → Yahoo!Japan + Amazon JP 仕入れ逆引き → 利益計算
// POST body: { items: [{title, avgPrice, sales, shippingAvg}] }

const USD_JPY = 150;
const EBAY_FEE_RATE = 0.129;
const EBAY_FEE_FIXED = 0.30;

function estimateShippingJpy(usd) {
  if (usd < 30) return 1200;
  if (usd < 80) return 1950;
  return 2700;
}

function calcProfit(buyJpy, sellUsd) {
  const sellJpy = sellUsd * USD_JPY;
  const fee = (sellUsd * EBAY_FEE_RATE + EBAY_FEE_FIXED) * USD_JPY;
  const ship = estimateShippingJpy(sellUsd);
  const profitJpy = Math.round(sellJpy - buyJpy - ship - fee);
  const profitRate = Math.round((profitJpy / sellJpy) * 100);
  return { profitJpy, profitRate };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items配列が必要です" });
  }

  const yahooClientId = process.env.VITE_YAHOO_CLIENT_ID;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const amazonAccessKey = process.env.AMAZON_ACCESS_KEY;
  const amazonSecretKey = process.env.AMAZON_SECRET_KEY;
  const amazonPartnerTag = process.env.AMAZON_PARTNER_TAG;
  const hasAmazon = !!(amazonAccessKey && amazonSecretKey && amazonPartnerTag);
  const rakutenAppId = process.env.RAKUTEN_APP_ID;
  const hasRakuten = !!rakutenAppId;
  const log = [];

  // フィルタ（平均価格$10以上・販売数は任意）
  const filtered = items.filter(it => (it.avgPrice || 0) >= 10);
  log.push(`📋 入力: ${items.length}件 → フィルタ後: ${filtered.length}件`);

  const results = [];

  for (const item of filtered.slice(0, 40)) {
    const ebayPriceUsd = parseFloat(item.avgPrice || 0);

    // Claude: eBayタイトル → Yahoo!日本語キーワード（汎用版）
    let jaKeyword = "";
    let jaKeywordShort = "";
    let jaKeywordMin = "";
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
            max_tokens: 150,
            messages: [{
              role: "user",
              content: `以下のeBay商品タイトルから、Yahoo!ショッピングで同一商品を検索するための日本語キーワードを3行で返してください。
1行目: 詳細キーワード（ブランド名・型番・商品種別・特徴を含む3〜5語）
2行目: 短縮キーワード（ブランド名と商品種別のみ1〜2語）
3行目: 最小キーワード（商品種別のみ1語、または最も特徴的な固有名詞1語）
説明不要。例：
1行目: G-SHOCK GW-5000 電波ソーラー 腕時計 日本製
2行目: G-SHOCK 腕時計
3行目: G-SHOCK
タイトル: ${item.title}`,
            }],
          }),
        });
        const td = await tr.json();
        const lines = (td.content?.[0]?.text?.trim() || "").split("\n").map(l => l.replace(/^\d行目[:：]\s*/, "").trim());
        jaKeyword = lines[0] || "";
        jaKeywordShort = lines[1] || jaKeyword.split(/\s/).slice(0, 2).join(" ");
        jaKeywordMin = lines[2] || jaKeyword.split(/\s/)[0] || "";
      } catch (_) {}
    }

    const minPrice = Math.round(ebayPriceUsd * USD_JPY * 0.20);

    // Yahoo!Japan仕入れ価格検索（詳細キーワード → 短縮キーワードの順でリトライ）
    let yahooPrice = null, yahooUrl = null, yahooName = null;
    if (yahooClientId) {
      const searchKeywords = [jaKeyword, jaKeywordShort, jaKeywordMin].filter(Boolean);
      for (const kw of searchKeywords) {
        if (yahooPrice) break;
        try {
          const yRes = await fetch(
            `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch` +
            `?appid=${yahooClientId}&query=${encodeURIComponent(kw)}&results=15&sort=%2Bprice&in_stock=true`
          );
          const yData = await yRes.json();
          const yItems = (yData.hits || []).filter(yi => (yi.price || 0) >= minPrice);
          if (yItems.length > 0) {
            yItems.sort((a, b) => (a.price || 0) - (b.price || 0));
            yahooPrice = yItems[0].price;
            yahooUrl = yItems[0].url;
            yahooName = (yItems[0].name || "").slice(0, 50);
          }
        } catch (_) {}
        await sleep(100);
      }
    }

    // Amazon JP仕入れ価格検索
    let amazonPrice = null, amazonUrl = null, amazonName = null, amazonAsin = null;
    if (jaKeyword && hasAmazon) {
      try {
        const aRes = await fetch(
          `/api/amazon-search?keyword=${encodeURIComponent(jaKeyword)}`
        );
        const aData = await aRes.json();
        const aItems = (aData.items || []).filter(ai => (ai.price || 0) >= minPrice);
        if (aItems.length > 0) {
          aItems.sort((a, b) => (a.price || 0) - (b.price || 0));
          amazonPrice = aItems[0].price;
          amazonUrl = aItems[0].url;
          amazonName = (aItems[0].title || "").slice(0, 50);
          amazonAsin = aItems[0].asin;
        }
      } catch (_) {}
    }

    // 楽天市場仕入れ価格検索（詳細 → 短縮の順でリトライ）
    let rakutenPrice = null, rakutenUrl = null, rakutenName = null;
    if (hasRakuten) {
      const searchKeywords = [jaKeyword, jaKeywordShort, jaKeywordMin].filter(Boolean);
      for (const kw of searchKeywords) {
        if (rakutenPrice) break;
        try {
          const rRes = await fetch(
            `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601` +
            `?applicationId=${rakutenAppId}&format=json&keyword=${encodeURIComponent(kw)}&hits=15&sort=%2BitemPrice`
          );
          const rData = await rRes.json();
          const rItems = (rData.Items || [])
            .map(w => w.Item)
            .filter(i => (i.itemPrice || 0) >= minPrice && i.availability === 1);
          if (rItems.length > 0) {
            rItems.sort((a, b) => (a.itemPrice || 0) - (b.itemPrice || 0));
            rakutenPrice = rItems[0].itemPrice;
            rakutenUrl = rItems[0].itemUrl;
            rakutenName = (rItems[0].itemName || "").slice(0, 50);
          }
        } catch (_) {}
        await sleep(100);
      }
    }

    // 最安仕入れ先を選択（Yahoo! / Amazon / 楽天の3択）
    const candidates = [
      { source: "yahoo",   price: yahooPrice,   url: yahooUrl,   name: yahooName },
      { source: "amazon",  price: amazonPrice,  url: amazonUrl,  name: amazonName },
      { source: "rakuten", price: rakutenPrice, url: rakutenUrl, name: rakutenName },
    ].filter(c => c.price !== null);
    candidates.sort((a, b) => a.price - b.price);
    const best = candidates[0] || null;
    const bestPrice = best?.price ?? null;
    const bestUrl   = best?.url   ?? null;
    const bestName  = best?.name  ?? null;
    const bestSource = best?.source ?? null;

    const { profitJpy, profitRate } = bestPrice
      ? calcProfit(bestPrice, ebayPriceUsd)
      : { profitJpy: null, profitRate: null };

    results.push({
      ebayTitle: (item.title || "").slice(0, 70),
      ebayPrice: ebayPriceUsd,
      ebaySales: item.sales || 0,
      ebayRevenue: item.revenue || 0,
      jaKeyword,
      yahooPrice, yahooUrl, yahooName,
      amazonPrice, amazonUrl, amazonName, amazonAsin,
      rakutenPrice, rakutenUrl, rakutenName,
      bestPrice, bestUrl, bestName, bestSource,
      profitJpy,
      profitRate,
      sourcingFound: !!bestPrice,
    });

    await sleep(300);
  }

  results.sort((a, b) => {
    if (a.sourcingFound && !b.sourcingFound) return -1;
    if (!a.sourcingFound && b.sourcingFound) return 1;
    return (b.profitRate ?? -999) - (a.profitRate ?? -999);
  });

  const found = results.filter(r => r.sourcingFound).length;
  log.push(`✅ 仕入先発見: ${found}件 / ${results.length}件`);

  return res.status(200).json({ results, log });
}
