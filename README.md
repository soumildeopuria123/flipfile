# Flipfile

Convert any file into a PDF — and pull PDFs back out as images or text. Everything
runs inside the browser tab: no uploads, no accounts, no server.

**Live app:** https://soumildeopuria123.github.io/flipfile/ (GitHub Pages build)

## What it does

| Input | Can be written as |
| --- | --- |
| PNG, JPG, WEBP, GIF, BMP, SVG, AVIF | PDF (fit-to-file or A4), PNG, JPG, WEBP |
| TXT, MD, CSV, JSON, HTML, source code | PDF with real selectable text, plain `.txt` |
| PDF | PNG, JPG, WEBP per page at 1×–3×, `.txt` of the text layer, `.docx` |

Tick as many output formats as you like: **every ticked format is written for every
file that can reach it**, so one PDF can leave as PNG + JPG + TXT + DOCX in a single
run. Formats that do not apply to a file are skipped rather than faked, and no-op
round trips (PNG → PNG, PDF → PDF) are never queued.

Drop several files at once, watch per-file progress, save a whole format as one
click (multi-page images are zipped per format), or grab everything as one `.zip`.

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
- **`src/lib/fromPdf.ts`** — pdf.js renders each page into a canvas once, then encodes
  that single canvas into every requested image format; the text layer is read once
  and reused for both `.txt` and `.docx`.
- **`src/lib/convert.ts`** — the single entry point: resolves which ticked formats a
  file can reach, then runs each of them (image → PDF, image → PNG/JPG/WEBP,
  text → PDF/TXT, PDF → images/TXT/DOCX).
- **`src/lib/docx.ts`** — writes a real OOXML package with JSZip, one paragraph per
  line and a page break between the PDF pages it came from.
- **`src/lib/raster.ts`** — shared canvas helpers (decode, white backdrop, encode).
- **`src/App.tsx`** — queue, multi-format selection, per-format downloads and zip.

Fonts are fetched with `scripts/fetch-fonts.mjs` because they are large binaries:
Noto Sans (570 KB, latin-greek-cyrillic) and Noto Sans SC (17 MB, noto-cjk). Both
are licensed under the SIL Open Font License, see `src/assets/OFL-*.txt`.

## Notes and limits

- Conversion is single-threaded and per file; a 3-page PDF at 3× takes a moment —
  asking for many formats costs one render plus one encode each, not one render each.
- `.docx` output carries the text layer only: images, drawings and layout are not
  reconstructed, and page breaks match PDF page ends.
- Text extraction returns the PDF's text layer — scanned PDFs have none.
- Bundled coverage: Latin, Greek, Cyrillic, Chinese, Japanese. Hangul, Arabic,
  Hebrew, Devanagari, Thai and emoji are not covered, and there is no RTL shaping.
- Binary files are detected and rejected instead of producing a garbage PDF.

## Tech

React 18 + TypeScript + Vite 5, pdf-lib with pdf-fontkit for writing, pdf.js for
reading, JSZip for batch downloads. No backend, no analytics.
