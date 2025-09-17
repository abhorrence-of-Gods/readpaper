export default function handler(req, res) {
  res.status(200).json({ ok: true, keyLoaded: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'gpt-5' });
}


