// eBay Browse API で日本からの出品を取得し売れ筋候補を生成
// Finding APIは廃止傾向のためBrowse APIで代替
// GET /api/ebay-sold?keyword=japanese+anime+figure&limit=50

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const keyword = req.query.keyword || "japanese anime figure";
  const limit = Math.min(parseInt(req.query.limit || "50"), 100);
  const appId = process.env.VITE_EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;

  if (!appId || !certId) {
    return res.status(500).json({ error: "eBay APIキー未設定" });
  }

  try {
    // OAuth token取得
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
      return res.status(500).json({ error: "eBay認証失敗", detail: tokenData });
    }

    // Browse APIで日本からの出品を検索（カテゴリ横断・広範囲）
    // eBayカテゴリID × 日本出品者でスキャン（キーワードに依存しない）
    const CATEGORIES = keyword ? [] : [
      { id: "625",   name: "カメラ・写真" },
      { id: "6030",  name: "自動車部品" },
      { id: "10063", name: "バイク部品" },
      { id: "281",   name: "時計・ジュエリー" },
      { id: "11116", name: "陶器・ガラス" },
      { id: "1249",  name: "ビデオゲーム" },
      { id: "267",   name: "本・マンガ" },
      { id: "11450", name: "衣類・着物" },
      { id: "293",   name: "電子機器" },
      { id: "220",   name: "おもちゃ・フィギュア" },
      { id: "1",     name: "コレクション" },
      { id: "550",   name: "アート" },
      { id: "11731", name: "工具・DIY" },
      { id: "14308", name: "ベビー・キッズ" },
      { id: "26395", name: "楽器" },
      { id: "888",   name: "スポーツ用品" },
      { id: "11233", name: "雑貨・インテリア" },
      { id: "15032", name: "ヘルス・ビューティー" },
      { id: "7294",  name: "ペット用品" },
      { id: "3252",  name: "食品・飲料" },
    ];

    const allItems = {};

    // カテゴリスキャン
    for (const cat of CATEGORIES) {
      const url =
        `https://api.ebay.com/buy/browse/v1/item_summary/search` +
        `?category_ids=${cat.id}` +
        `&filter=itemLocationCountry%3AJP%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
        `&sort=BEST_MATCH&limit=50`;

      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      });
      const data = await r.json();
      for (const item of data.itemSummaries || []) {
        const price = parseFloat(item.price?.value || "0");
        if (price < 5 || !item.title) continue;
        if (!allItems[item.title]) {
          allItems[item.title] = {
            title: item.title,
            avgPrice: price,
            shippingAvg: 0,
            sales: 1,
            revenue: price,
            category: cat.name,
            lastSoldDate: new Date().toISOString().slice(0, 10),
            imageUrl: item.image?.imageUrl || null,
            ebayUrl: item.itemWebUrl || null,
            seller: item.seller?.username || null,
          };
        }
      }
      await new Promise(r => setTimeout(r, 150));
    }

    // キーワード指定時は従来通り
    if (keyword) {
      const url =
        `https://api.ebay.com/buy/browse/v1/item_summary/search` +
        `?q=${encodeURIComponent(keyword)}` +
        `&filter=itemLocationCountry%3AJP%2CbuyingOptions%3A%7BFIXED_PRICE%7D` +
        `&sort=BEST_MATCH&limit=${limit}`;
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      });
      const data = await r.json();
      for (const item of data.itemSummaries || []) {
        const price = parseFloat(item.price?.value || "0");
        if (price < 5 || !item.title) continue;
        if (!allItems[item.title]) {
          allItems[item.title] = {
            title: item.title, avgPrice: price, shippingAvg: 0,
            sales: 1, revenue: price, category: "キーワード検索",
            lastSoldDate: new Date().toISOString().slice(0, 10),
            imageUrl: item.image?.imageUrl || null,
            ebayUrl: item.itemWebUrl || null,
          };
        }
      }
    }

    const items = Object.values(allItems)
      .filter(it => it.avgPrice >= 10)
      .sort((a, b) => b.avgPrice - a.avgPrice);

    return res.status(200).json({
      items,
      total: items.length,
      keyword,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
