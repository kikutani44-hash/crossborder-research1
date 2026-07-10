export default async function handler(req, res) {
  try {
    const query = (req.url || "").split("?")[1] || "";
    console.log("eBay query:", query.slice(0, 200));
    const url = `https://svcs.ebay.com/services/search/FindingService/v1?${query}`;
    console.log("eBay url:", url.slice(0, 200));
    const response = await fetch(url);
    console.log("eBay status:", response.status);
    const text = await response.text();
    console.log("eBay response:", text.slice(0, 300));
    try {
      const data = JSON.parse(text);
      res.status(response.status).json(data);
    } catch {
      res.status(500).json({ error: "parse error", raw: text.slice(0, 500) });
    }
  } catch (e) {
    console.error("eBay error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
