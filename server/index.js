import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, keyLoaded: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || 'gpt-5' });
});

// Explains a contiguous range of lines within a chunk.
// Request body: { chunkLines: string[], startIndex: number, endIndex: number, delimiter?: string }
app.post('/api/explain-batch', async (req, res) => {
  try {
    const { chunkLines, startIndex, endIndex, delimiter } = req.body || {};

    if (!Array.isArray(chunkLines) || chunkLines.length === 0) {
      return res.status(400).json({ error: 'chunkLines must be non-empty array' });
    }
    const start = Number.isInteger(startIndex) ? startIndex : 0;
    const end = Number.isInteger(endIndex) ? endIndex : chunkLines.length - 1;
    const sep = typeof delimiter === 'string' && delimiter.length > 0 ? delimiter : '<<<SEP>>>';

    if (start < 0 || end >= chunkLines.length || start > end) {
      return res.status(400).json({ error: 'invalid range' });
    }

    const haveKey = Boolean(process.env.OPENAI_API_KEY);

    const linesDisplay = chunkLines
      .map((l, i) => `${i + 1}. ${l}`)
      .join('\n');

    let raw;
    if (haveKey) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const system = `あなたは学術論文の英文を日本語で噛み砕いて説明するアシスタントです。\n求められた行だけを順番に、一行ごとに簡潔に日本語で説明してください。\n出力は各行の説明のみで、前置きや後書きは禁止。各行の説明は区切り文字 ${sep} で連結し、一つのテキストとして返してください。余計な空白や区切りの重複を入れないでください。`;
      const user = `以下は論文の一部を行番号付きで示したものです。\n\n${linesDisplay}\n\n説明対象の行: ${start + 1} 行目から ${end + 1} 行目まで（両端含む）。\n各行に対して日本語の短い解説を一つずつ作成し、順番を保って${sep}で区切って返してください。`;

      try {
        // Prefer Responses API for newer models
        const r = await client.responses.create({
          model: process.env.OPENAI_MODEL || 'gpt-5',
          input: `SYSTEM:\n${system}\n\nUSER:\n${user}`
        });
        raw = r.output_text ?? '';
      } catch (e) {
        // Fallback to Chat Completions
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
      // Fallback: simple echo-based explanation for local testing without API key
      const toExplain = chunkLines.slice(start, end + 1);
      raw = toExplain
        .map((t) => `要点: ${t.slice(0, 180)}`)
        .join(sep);
    }

    if (!raw || String(raw).trim().length === 0) {
      // As a safety net, produce minimal output rather than empty string
      const toExplain = chunkLines.slice(start, end + 1);
      raw = toExplain.map((t) => `要点: ${t.slice(0, 180)}`).join(sep);
    }

    const parts = String(raw)
      .split('<<<SEP>>>')
      .flatMap((s) => s.split('<<<SEP >>>')) // tolerate slight model spacing
      .join('<<<SEP>>>')
      .split('<<<SEP>>>');

    // If model used custom delimiter sep, split by that.
    const normalized = sep === '<<<SEP>>>' ? parts : String(raw).split(sep);

    const expected = end - start + 1;
    let explanations = normalized.map((s) => s.trim());

    // If the count mismatches, attempt to pad or trim.
    if (explanations.length < expected) {
      while (explanations.length < expected) explanations.push('');
    } else if (explanations.length > expected) {
      explanations = explanations.slice(0, expected);
    }

    explanations = explanations.map((s, i) => s && s.length > 0 ? s : `要点: ${chunkLines[start + i]?.slice(0, 180) || ''}`);

    res.json({ explanations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`listening on http://localhost:${port}`);
  console.log(`OpenAI configured → model: ${process.env.OPENAI_MODEL || 'gpt-5'}, keyLoaded: ${Boolean(process.env.OPENAI_API_KEY)}`);
});


