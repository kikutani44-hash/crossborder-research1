// 日本人セラーリサーチ（Browse API版）
// ① Browse APIで日本からの出品を検索
// ② セラー名を抽出・集計（出品数が多い順＝アクティブなセラー）
// ③ 各セラーの現行出品一覧を取得
// ④ Yahoo!Japanで仕入れ値を逆引き → 利益計算

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

  const keyword = req.query.keyword || "";
  const maxSellers = parseInt(req.query.maxSellers || "8");
  const appId = process.env.VITE_EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  const yahooClientId = process.env.VITE_YAHOO_CLIENT_ID;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const log = [];

  try {
    // ① Browse API OAuth token
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

    // ② Browse API: 日本からの出品を検索（固定価格・最大50件）
    const browseUrl =
      `https://api.ebay.com/buy/browse/v1/item_summary/search` +
      `?q=${encodeURIComponent(keyword)}` +
      `&filter=itemLocationCountry%3AJP%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
      `&sort=BEST_MATCH&limit=50`;

    const browseRes = await fetch(browseUrl, {
      headers: {
        Authorization: `Bearer ${ebayToken}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });
    const browseData = await browseRes.json();
    const items = browseData.itemSummaries || [];
    log.push(`📦 日本からの出品: ${items.length}件`);

    if (items.length === 0) {
      return res.status(200).json({ sellers: [], log: [...log, "⚠ 出品なし"] });
    }

    // ③ セラー名を抽出・集計
    const sellerMap = {};
    for (const item of items) {
      const sellerName = item.seller?.username;
      if (!sellerName) continue;
      if (!sellerMap[sellerName]) {
        sellerMap[sellerName] = {
          name: sellerName,
          feedbackScore: item.seller?.feedbackScore || 0,
          feedbackPct: item.seller?.feedbackPercentage || "0",
          listingCount: 0,
          sampleItems: [],
        };
      }
      sellerMap[sellerName].listingCount++;
      if (sellerMap[sellerName].sampleItems.length < 3) {
        sellerMap[sellerName].sampleItems.push({
          title: (item.title || "").slice(0, 50),
          price: parseFloat(item.price?.value || "0"),
          imageUrl: item.image?.imageUrl || null,
          itemUrl: item.itemWebUrl || null,
        });
      }
    }

    // フィードバック数×出品数でスコアリング（実績あるアクティブセラーを優先）
    const topSellers = Object.values(sellerMap)
      .sort((a, b) => (b.feedbackScore * b.listingCount) - (a.feedbackScore * a.listingCount))
      .slice(0, maxSellers);

    log.push(`👤 日本セラー: ${Object.keys(sellerMap).length}人 → 上位${topSellers.length}人を分析`);

    // ④ 各セラーの現行出品をさらに取得 + Yahoo!逆引き
    const sellers = [];

    // 全体検索結果からセラーごとに商品をまとめておく
    const sellerItemsMap = {};
    for (const item of items) {
      const sn = item.seller?.username;
      if (!sn) continue;
      if (!sellerItemsMap[sn]) sellerItemsMap[sn] = [];
      sellerItemsMap[sn].push(item);
    }

    for (const seller of topSellers) {
      await sleep(200);

      // まず全体検索結果からそのセラーの商品を取得
      let activeListings = (sellerItemsMap[seller.name] || []).slice(0, 6);

      // 見つからなければセラー指定で追加検索
      if (activeListings.length === 0) {
        const sellerBrowseRes = await fetch(
          `https://api.ebay.com/buy/browse/v1/item_summary/search` +
          `?q=${encodeURIComponent(keyword || "japan")}&filter=sellers%3A%7B${encodeURIComponent(seller.name)}%7D%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
          `&sort=BEST_MATCH&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${ebayToken}`,
              "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
            },
          }
        );
        const sellerData = await sellerBrowseRes.json();
        activeListings = (sellerData.itemSummaries || []).slice(0, 6);
      }

      const listingsWithSource = [];
      for (const listing of activeListings) {
        const ebayPriceUsd = parseFloat(listing.price?.value || "0");
        if (ebayPriceUsd < 5) continue;

        // Claude: eBayタイトル → 日本語キーワード
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
タイトル: ${listing.title}`,
                }],
              }),
            });
            const td = await tr.json();
            jaKeyword = td.content?.[0]?.text?.trim() || "";
          } catch (_) {}
        }

        // Yahoo!Japan逆引き
        let yahooPrice = null, yahooUrl = null, yahooName = null;
        if (jaKeyword && yahooClientId) {
          try {
            const yRes = await fetch(
              `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch` +
              `?appid=${yahooClientId}&query=${encodeURIComponent(jaKeyword)}&results=10&sort=%2Bprice&in_stock=true`
            );
            const yData = await yRes.json();
            const minYahooPrice = Math.round(ebayPriceUsd * USD_JPY * 0.40);
            const yItems = (yData.hits || []).filter(yi => (yi.price || 0) >= minYahooPrice);
            if (yItems.length > 0) {
              yItems.sort((a, b) => (a.price || 0) - (b.price || 0));
              yahooPrice = yItems[0].price;
              yahooUrl = yItems[0].url;
              yahooName = (yItems[0].name || "").slice(0, 40);
            }
          } catch (_) {}
        }

        const { profitJpy, profitRate } = yahooPrice
          ? calcProfit(yahooPrice, ebayPriceUsd)
          : { profitJpy: null, profitRate: null };

        listingsWithSource.push({
          title: (listing.title || "").slice(0, 60),
          ebayPrice: ebayPriceUsd,
          ebayUrl: listing.itemWebUrl,
          ebayImage: listing.image?.imageUrl || null,
          jaKeyword,
          yahooPrice,
          yahooUrl,
          yahooName,
          profitJpy,
          profitRate,
          sourcingFound: !!yahooPrice,
        });

        await sleep(150);
      }

      // 仕入先あり→利益率順、なし→後ろ
      listingsWithSource.sort((a, b) => {
        if (a.sourcingFound && !b.sourcingFound) return -1;
        if (!a.sourcingFound && b.sourcingFound) return 1;
        return (b.profitRate ?? -999) - (a.profitRate ?? -999);
      });

      sellers.push({
        name: seller.name,
        feedbackScore: seller.feedbackScore,
        feedbackPct: seller.feedbackPct,
        listingCount: seller.listingCount,
        sampleItems: seller.sampleItems,
        activeListings: listingsWithSource,
        ebayStoreUrl: `https://www.ebay.com/sch/${encodeURIComponent(seller.name)}/m.html`,
      });
    }

    const totalListings = sellers.reduce((s, x) => s + x.activeListings.length, 0);
    log.push(`✅ 完了: ${sellers.length}セラー / ${totalListings}件の現行出品を分析`);

    // ⑤ 日本からの出品物フラット一覧（セラー問わず）にYahoo!逆引きを追加
    const japanItems = [];
    for (const item of items.slice(0, 20)) {
      const ebayPriceUsd = parseFloat(item.price?.value || "0");
      if (ebayPriceUsd < 5) continue;

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
              messages: [{ role: "user", content: `以下のeBay商品タイトルから、Yahoo!ショッピングで同一商品を検索するための日本語キーワードを生成してください。\n必ずシリーズ名・商品種別（フィギュア/キーホルダー/カード/プラモ等）・セット数や型番を含めて3〜5語を1行で返してください。説明不要。\nタイトル: ${item.title}` }],
            }),
          });
          const td = await tr.json();
          jaKeyword = td.content?.[0]?.text?.trim() || "";
        } catch (_) {}
      }

      let yahooPrice = null, yahooUrl = null, yahooName = null;
      if (jaKeyword && yahooClientId) {
        try {
          const yRes = await fetch(
            `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch` +
            `?appid=${yahooClientId}&query=${encodeURIComponent(jaKeyword)}&results=10&sort=%2Bprice&in_stock=true`
          );
          const yData = await yRes.json();
          const minYahooPrice = Math.round(ebayPriceUsd * USD_JPY * 0.40);
          const yItems = (yData.hits || []).filter(yi => (yi.price || 0) >= minYahooPrice);
          if (yItems.length > 0) {
            yItems.sort((a, b) => (a.price || 0) - (b.price || 0));
            yahooPrice = yItems[0].price;
            yahooUrl = yItems[0].url;
            yahooName = (yItems[0].name || "").slice(0, 40);
          }
        } catch (_) {}
      }

      const { profitJpy, profitRate } = yahooPrice
        ? calcProfit(yahooPrice, ebayPriceUsd)
        : { profitJpy: null, profitRate: null };

      japanItems.push({
        title: (item.title || "").slice(0, 60),
        ebayPrice: ebayPriceUsd,
        ebayUrl: item.itemWebUrl,
        ebayImage: item.image?.imageUrl || null,
        sellerName: item.seller?.username || null,
        jaKeyword,
        yahooPrice,
        yahooUrl,
        yahooName,
        profitJpy,
        profitRate,
        sourcingFound: !!yahooPrice,
      });

      await sleep(150);
    }

    japanItems.sort((a, b) => {
      if (a.sourcingFound && !b.sourcingFound) return -1;
      if (!a.sourcingFound && b.sourcingFound) return 1;
      return (b.profitRate ?? -999) - (a.profitRate ?? -999);
    });

    log.push(`🗾 日本からの出品: ${japanItems.length}件を分析`);

    return res.status(200).json({ sellers, japanItems, log });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack, log });
  }
}
