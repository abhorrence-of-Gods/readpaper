# ReadPaper prototype

Setup

1) Install Node.js 18+ and run:

```
npm i
```

2) Create `.env` (optional). Example:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```

3) Start server:

```
npm run dev
```

Open `http://localhost:3000` and upload a PDF.

Features

- Extracts text with PDF.js and splits into lines
- Chunks the paper so each request fits an LLM context
- Bottom bar selects chunk; right side shows chunk preview with line numbers
- Big left/right buttons (and arrow keys) move one line at a time
- Requests line explanations via `/api/explain-batch`; placeholders if no API key

Deploy (Vercel)

1) Push this repo to GitHub
2) Import in Vercel dashboard
3) Set Environment Variables:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (e.g. `gpt-5`)
4) Deploy
   - Frontend is served from `public/`
   - API endpoints: `/api/health`, `/api/explain-batch`
