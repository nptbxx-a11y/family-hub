// Pinged daily by Vercel Cron (see vercel.json) so the free-tier Supabase
// project never auto-pauses after 7 days of inactivity. Calls the
// public.keepalive() RPC, which returns the DB time and touches no tables.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return res.status(500).json({ error: "Supabase env vars missing" });

  try {
    const response = await fetch(`${url}/rest/v1/rpc/keepalive`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) return res.status(502).json({ error: `Supabase responded ${response.status}` });
    res.status(200).json({ ok: true, dbTime: await response.json() });
  } catch {
    res.status(500).json({ error: "Keepalive request failed" });
  }
}
