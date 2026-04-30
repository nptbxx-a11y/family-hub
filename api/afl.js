export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "q parameter required" });

  try {
    const response = await fetch(`https://api.squiggle.com.au/?q=${q}`, {
      headers: {
        "User-Agent": "family-hub-app/1.0 (nickbrown@myself.com)",
        "Accept": "application/json",
      },
    });
    if (!response.ok) return res.status(response.status).json({ error: "Squiggle API error" });
    const data = await response.json();
    res.status(200).json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch from Squiggle" });
  }
}
