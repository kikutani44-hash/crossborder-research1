export default async function handler(req, res) {
  try {
    const clientId = process.env.VITE_EBAY_APP_ID;
    const certId = process.env.EBAY_CERT_ID;

    // OAuth token取得
    const credentials = Buffer.from(`${clientId}:${certId}`).toString("base64");
    const tokenRes = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: "token error", detail: tokenData });
    }

    // Browse API検索
    const query = req.query;
    const keyword = query.keywords || "";
    const searchRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}&filter=buyingOptions%3A%7BFIXED_PRICE%7D&sort=BEST_MATCH&limit=100`,
      {
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          "Content-Type": "application/json",
        },
      }
    );
    const data = await searchRes.json();

    // Finding API形式に変換して返す
    const items = (data.itemSummaries || []).map(item => ({
      title: [item.title || ""],
      sellingStatus: [{
        currentPrice: [{ __value__: item.price?.value || "0" }],
        bidCount: ["0"],
      }],
      galleryURL: [item.image?.imageUrl || null],
      viewItemURL: [item.itemWebUrl || null],
    }));

    res.status(200).json({
      findCompletedItemsResponse: [{
        searchResult: [{ item: items }],
      }],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
