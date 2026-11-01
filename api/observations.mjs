// FluviSAR field-inbox proxy — server-side read of the TRACE Field evidence API
// (avoids browser CORS; read-only: FluviSAR never writes field evidence).
const UPSTREAM = 'https://trace-field-tonys-projects-42e6ad8b.vercel.app/api/observations';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });
  try {
    const r = await fetch(UPSTREAM);
    if (!r.ok) return res.status(502).json({ error: 'upstream unavailable' });
    return res.status(200).json(await r.json());
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' });
  }
}
