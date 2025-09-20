export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'url required' });
      return;
    }
    const r = await fetch(url, { headers: { 'User-Agent': 'readpaper/1.0' } });
    if (!r.ok) {
      res.status(502).json({ error: 'bad_gateway', status: r.status });
      return;
    }
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    const roughLines = text.split(/\n|(?<=[\.!?。！？])\s+/);
    const lines = roughLines.map((s) => s.trim()).filter((s) => s.length > 0);
    res.json({ lines });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'server_error' });
  }
}


