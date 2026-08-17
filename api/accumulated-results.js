export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "s-maxage=60");
  try {
    const r = await fetch("http://163.44.112.38:3001/results");
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message, results: [] });
  }
}
