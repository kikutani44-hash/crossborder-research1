export default async function handler(req, res) {
  const params = new URLSearchParams(req.query);
  const url = `https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?${params}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
