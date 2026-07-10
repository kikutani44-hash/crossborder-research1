export default async function handler(req, res) {
  const query = req.url.split("?")[1] || "";
  const url = `https://svcs.ebay.com/services/search/FindingService/v1?${query}`;
  try {
    const response = await fetch(url);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      res.status(500).json({ error: "parse error", raw: text.slice(0, 500) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
