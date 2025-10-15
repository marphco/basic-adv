// client/api/geo.js
export default async function handler(req, res) {
  // Vercel aggiunge questo header con il country ISO-2 (es. "IT", "US", "DE")
  const country = req.headers["x-vercel-ip-country"] || "ZZ";

  // Cache leggera (10 min) per evitare chiamate ripetute
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=600, stale-while-revalidate=60");

  res.status(200).json({ country });
}
