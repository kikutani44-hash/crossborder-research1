export default async function handler(req, res) {
  const params = new URLSearchParams(req.query);
  params.set("RESPONSE-DATA-FORMAT", "JSON");
  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${params}`;
  try {
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      res.status(500).json({ error: "eBay API parse error", raw: text.slice(0, 200) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
