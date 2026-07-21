// Amazon SP-API (Catalog Items + Product Pricing) で日本の商品を検索
// 環境変数: AMAZON_SP_API_CLIENT_ID, AMAZON_SP_API_CLIENT_SECRET, AMAZON_SP_API_REFRESH_TOKEN

const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";
const SP_API_BASE = "https://sellingpartnerapi-fe.amazon.com";

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) return cachedToken;

  const res = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_SP_API_REFRESH_TOKEN,
      client_id: process.env.AMAZON_SP_API_CLIENT_ID,
      client_secret: process.env.AMAZON_SP_API_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`LWA token error: ${JSON.stringify(data)}`);
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const keyword = req.query.keyword || req.body?.keyword || "";
  if (!keyword) return res.status(400).json({ error: "keyword required" });

  const clientId = process.env.AMAZON_SP_API_CLIENT_ID;
  const clientSecret = process.env.AMAZON_SP_API_CLIENT_SECRET;
  const refreshToken = process.env.AMAZON_SP_API_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return res.status(200).json({
      items: [],
      demo: true,
      message: "Amazon SP-APIキー未設定",
    });
  }

  try {
    const token = await getAccessToken();

    // Catalog Items API でキーワード検索
    const searchParams = new URLSearchParams({
      keywords: keyword,
      marketplaceIds: "A1VC38T7YXB528", // Amazon.co.jp
      includedData: "summaries,identifiers",
      pageSize: "5",
    });

    const searchRes = await fetch(
      `${SP_API_BASE}/catalog/2022-04-01/items?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-amz-access-token": token,
          "x-amz-marketplace-id": "A1VC38T7YXB528",
        },
      }
    );
    const searchData = await searchRes.json();
    const catalogItems = searchData.items || [];

    if (catalogItems.length === 0) {
      return res.status(200).json({ items: [] });
    }

    // 各ASINの価格を取得
    const items = [];
    for (const catalogItem of catalogItems.slice(0, 5)) {
      const asin = catalogItem.asin;
      const title = catalogItem.summaries?.[0]?.itemName || `ASIN ${asin}`;
      const imageUrl = catalogItem.summaries?.[0]?.mainImage?.link || null;

      try {
        const priceRes = await fetch(
          `${SP_API_BASE}/products/pricing/v0/price?MarketplaceId=A1VC38T7YXB528&Asins=${asin}&ItemType=Asin`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "x-amz-access-token": token,
            },
          }
        );
        const priceData = await priceRes.json();
        const pricePayload = priceData.payload?.[0];
        const listing = pricePayload?.Product?.Offers?.[0];
        const price = listing?.BuyingPrice?.ListingPrice?.Amount || null;

        items.push({
          asin,
          title,
          price: price ? Math.round(price) : null,
          currency: "JPY",
          url: `https://www.amazon.co.jp/dp/${asin}/`,
          image: imageUrl,
        });
      } catch (_) {
        items.push({ asin, title, price: null, currency: "JPY", url: `https://www.amazon.co.jp/dp/${asin}/`, image: imageUrl });
      }
    }

    return res.status(200).json({ items: items.filter(i => i.price !== null) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
