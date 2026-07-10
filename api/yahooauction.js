export default async function handler(req, res) {
  const params = new URLSearchParams(req.query);
  const url = `https://auctions.yahooapis.jp/AuctionWebService/V2/json/search?${params}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
