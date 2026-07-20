// Amazon PA-API 5.0 で日本の商品を検索してASIN・価格を返す
// 環境変数: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG

import crypto from "crypto";

function signRequest(method, host, path, params, accessKey, secretKey, region = "us-west-2") {
  const service = "ProductAdvertisingAPI";
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const payloadStr = JSON.stringify(params);
  const payloadHash = crypto.createHash("sha256").update(payloadStr).digest("hex");

  const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${params.__target}\n`;
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const signingKey = ["aws4_request", service, region, dateStamp].reduce(
    (key, data) => crypto.createHmac("sha256", key).update(data).digest(),
    Buffer.from(`AWS4${secretKey}`)
  );
  const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  return {
    amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const keyword = req.query.keyword || req.body?.keyword || "";
  if (!keyword) return res.status(400).json({ error: "keyword required" });

  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;

  if (!accessKey || !secretKey || !partnerTag) {
    return res.status(200).json({
      items: [],
      demo: true,
      message: "Amazon PA-APIキー未設定。AMAZON_ACCESS_KEY / AMAZON_SECRET_KEY / AMAZON_PARTNER_TAGを環境変数に設定してください。",
    });
  }

  const host = "webservices.amazon.co.jp";
  const path = "/paapi5/searchitems";

  const params = {
    __target: "SearchItems",
    Keywords: keyword,
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: "www.amazon.co.jp",
    Resources: [
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "Images.Primary.Medium",
    ],
    ItemCount: 5,
    SortBy: "Relevance",
  };

  const { amzDate, authorization } = signRequest(
    "POST", host, path, params, accessKey, secretKey
  );

  delete params.__target;

  try {
    const r = await fetch(`https://${host}${path}`, {
      method: "POST",
      headers: {
        "content-encoding": "amz-1.0",
        "content-type": "application/json; charset=utf-8",
        host,
        "x-amz-date": amzDate,
        "x-amz-target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
        authorization,
      },
      body: JSON.stringify(params),
    });

    const data = await r.json();
    const searchResult = data.SearchResult?.Items || [];

    const items = searchResult.map(item => ({
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue || "",
      price: item.Offers?.Listings?.[0]?.Price?.Amount || null,
      currency: "JPY",
      url: `https://www.amazon.co.jp/dp/${item.ASIN}/?tag=${partnerTag}`,
      image: item.Images?.Primary?.Medium?.URL || null,
    }));

    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
