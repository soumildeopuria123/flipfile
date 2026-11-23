# Flipfile

Convert any file into a PDF — and pull PDFs back out as images or text. Everything
runs inside the browser tab: no uploads, no accounts, no server.

**Live app:** https://soumildeopuria123.github.io/flipfile/

## What it does

| Input | Output |
| --- | --- |
| PNG, JPG, WEBP, GIF, BMP, SVG, AVIF | single-page PDF (fit-to-file or A4) |
| TXT, MD, CSV, JSON, HTML, source code | paginated A4 PDF with real, selectable text |
| PDF | one PNG or JPG per page at 1×–3×, or a single `.txt` of the text layer |

Drop several files at once, watch per-file progress, save individually, or grab
everything as one `.zip`.

## Getting started

```bash
npm install
npm run fonts     # downloads the two Noto faces used for text (see below)
npm run dev       # http://localhost:3000
npm run build     # typecheck + production bundle in dist/
```

`npm run dev` and `npm run build` fetch the fonts automatically when they are
missing, so `npm install && npm run dev` is enough. `npm run samples` regenerates
the sample inputs in `samples/`.

## How it works

- **`src/lib/toPdf.ts`** — images are rasterised through a canvas (white backdrop so
  transparent PNG/SVG do not turn black) and embedded with pdf-lib; text files are
  decoded, converted to plain text, wrapped to A4 and drawn with embedded fonts.
- **`src/lib/textFont.ts`** — two-face typography. Noto Sans covers Latin, Greek and
  Cyrillic; Noto Sans SC is fetched and embedded only when the text actually
  contains CJK, so an English document never pays for the 17 MB CJK face. pdf-lib
  subsets both, so a converted document contains only the glyphs it uses.
- **`src/lib/fromPdf.ts`** — pdf.js renders each page into a canvas (PNG/JPG) or reads
  the text layer into one `.txt`.
- **`src/App.tsx`** — queue, direction/format controls, download and zip.

Fonts are fetched with `scripts/fetch-fonts.mjs` because they are large binaries:
Noto Sans (570 KB, latin-greek-cyrillic) and Noto Sans SC (17 MB, noto-cjk). Both
are licensed under the SIL Open Font License, see `src/assets/OFL-*.txt`.

## Notes and limits

- Conversion is single-threaded and per file; a 3-page PDF at 3× takes a moment.
- Text extraction returns the PDF's text layer — scanned PDFs have none.
- Bundled coverage: Latin, Greek, Cyrillic, Chinese, Japanese. Hangul, Arabic,
  Hebrew, Devanagari, Thai and emoji are not covered, and there is no RTL shaping.
- Binary files are detected and rejected instead of producing a garbage PDF.

## Tech

React 18 + TypeScript + Vite 5, pdf-lib with pdf-fontkit for writing, pdf.js for
reading, JSZip for batch downloads. No backend, no analytics.
