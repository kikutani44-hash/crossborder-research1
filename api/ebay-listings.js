export default async function handler(req, res) {
  const appId = process.env.VITE_EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  const devId = "4f661a24-f255-4e83-a615-2364c4d7b3a6";
  const userToken = process.env.EBAY_USER_TOKEN;

  if (!userToken) {
    return res.status(500).json({ error: "EBAY_USER_TOKEN not set" });
  }

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${userToken}</eBayAuthToken>
  </RequesterCredentials>
  <ActiveList>
    <Include>true</Include>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>1</PageNumber>
    </Pagination>
  </ActiveList>
  <HideVariations>true</HideVariations>
</GetMyeBaySellingRequest>`;

  try {
    const response = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers: {
        "X-EBAY-API-COMPATIBILITY-LEVEL": "1119",
        "X-EBAY-API-DEV-NAME": devId,
        "X-EBAY-API-APP-NAME": appId,
        "X-EBAY-API-CERT-NAME": certId,
        "X-EBAY-API-CALL-NAME": "GetMyeBaySelling",
        "X-EBAY-API-SITEID": "0",
        "Content-Type": "text/xml",
      },
      body: xml,
    });

    const text = await response.text();

    // Check for errors
    const ackMatch = text.match(/<Ack>(.*?)<\/Ack>/);
    if (ackMatch && ackMatch[1] === "Failure") {
      const errMatch = text.match(/<LongMessage>(.*?)<\/LongMessage>/);
      return res.status(500).json({ error: errMatch?.[1] || "eBay API error", raw: text.slice(0, 500) });
    }

    // Parse active listings
    const itemBlocks = text.match(/<Item>([\s\S]*?)<\/Item>/g) || [];
    const items = itemBlocks.map(block => {
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
        return m ? m[1] : null;
      };
      const startTime = get("StartTime");
      const daysListed = startTime
        ? Math.floor((Date.now() - new Date(startTime).getTime()) / 86400000)
        : null;

      return {
        itemId: get("ItemID"),
        title: get("Title"),
        price: parseFloat(get("CurrentPrice") || get("BuyItNowPrice") || "0"),
        quantity: parseInt(get("QuantityAvailable") || get("Quantity") || "1"),
        watchCount: parseInt(get("WatchCount") || "0"),
        hitCount: parseInt(get("HitCount") || "0"),
        startTime,
        daysListed,
        imageUrl: get("GalleryURL"),
        viewUrl: get("ViewItemURL"),
      };
    });

    // Sort by daysListed desc (slowest movers first)
    items.sort((a, b) => (b.daysListed || 0) - (a.daysListed || 0));

    const totalMatch = text.match(/<TotalNumberOfEntries>(\d+)<\/TotalNumberOfEntries>/);
    res.status(200).json({
      items,
      total: totalMatch ? parseInt(totalMatch[1]) : items.length,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
