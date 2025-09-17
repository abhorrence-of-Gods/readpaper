import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const { chunkLines, startIndex, endIndex, delimiter } = req.body || {};

    if (!Array.isArray(chunkLines) || chunkLines.length === 0) {
      res.status(400).json({ error: 'chunkLines must be non-empty array' });
      return;
    }
    const start = Number.isInteger(startIndex) ? startIndex : 0;
    const end = Number.isInteger(endIndex) ? endIndex : chunkLines.length - 1;
    const sep = typeof delimiter === 'string' && delimiter.length > 0 ? delimiter : '<<<SEP>>>';
    if (start < 0 || end >= chunkLines.length || start > end) {
      res.status(400).json({ error: 'invalid range' });
      return;
    }

    const linesDisplay = chunkLines.map((l, i) => `${i + 1}. ${l}`).join('\n');
    const system = `あなたは学術論文の英文を日本語で噛み砕いて説明するアシスタントです。\n求められた行だけを順番に、一行ごとに簡潔に日本語で説明してください。\n出力は各行の説明のみで、前置きや後書きは禁止。各行の説明は区切り文字 ${sep} で連結し、一つのテキストとして返してください。余計な空白や区切りの重複を入れないでください。`;
    const user = `以下は論文の一部を行番号付きで示したものです。\n\n${linesDisplay}\n\n説明対象の行: ${start + 1} 行目から ${end + 1} 行目まで（両端含む）。\n各行に対して日本語の短い解説を一つずつ作成し、順番を保って${sep}で区切って返してください。`;

    const haveKey = Boolean(process.env.OPENAI_API_KEY);
    let raw = '';

    if (haveKey) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      try {
        const r = await client.responses.create({
          model: process.env.OPENAI_MODEL || 'gpt-5',
          input: `SYSTEM:\n${system}\n\nUSER:\n${user}`
        });
        raw = r.output_text ?? '';
      } catch (e) {
        const resp = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-5',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
        });
        raw = resp.choices?.[0]?.message?.content ?? '';
      }
    } else {
      const toExplain = chunkLines.slice(start, end + 1);
      raw = toExplain.map((t) => `要点: ${t.slice(0, 180)}`).join(sep);
    }

    if (!raw || String(raw).trim().length === 0) {
      const toExplain = chunkLines.slice(start, end + 1);
      raw = toExplain.map((t) => `要点: ${t.slice(0, 180)}`).join(sep);
    }

    const normalized = (sep === '<<<SEP>>>'
      ? String(raw).split('<<<SEP>>>').flatMap((s) => s.split('<<<SEP >>>')).join('<<<SEP>>>').split('<<<SEP>>>')
      : String(raw).split(sep));

    const expected = end - start + 1;
    let explanations = normalized.map((s) => s.trim());
    if (explanations.length < expected) { while (explanations.length < expected) explanations.push(''); }
    else if (explanations.length > expected) { explanations = explanations.slice(0, expected); }
    explanations = explanations.map((s, i) => s && s.length > 0 ? s : `要点: ${chunkLines[start + i]?.slice(0, 180) || ''}`);

    res.json({ explanations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}


