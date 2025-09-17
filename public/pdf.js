// Lightweight PDF processing via PDF.js module build from a CDN
// We only need text content per page.
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.mjs';
// Ensure worker is resolvable on some browsers/CDN combinations
try {
  if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.mjs';
  }
} catch (_) {}

export async function getLinesFromPdf(file) {
  const arrayBuf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuf, isEvalSupported: false });
  const pdf = await loadingTask.promise;
  const pageTexts = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ');
    pageTexts.push(text);
  }
  const joined = pageTexts.join('\n');

  // Split into roughly "lines". PDFs do not preserve true lines, so we
  // approximate by sentence boundaries and newlines from pages.
  const roughLines = joined.split(/\n|(?<=[\.!?])\s+/);
  return roughLines.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function chunkLines(lines, maxLinesPerChunk = 200) {
  const out = [];
  for (let i = 0; i < lines.length; i += maxLinesPerChunk) {
    out.push(lines.slice(i, i + maxLinesPerChunk));
  }
  return out;
}


