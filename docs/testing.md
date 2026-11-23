# Testing

There is no test runner. The converters were verified by driving the real app in
Chromium with the files in `samples/` and checking the output bytes:

| Case | Expectation |
| --- | --- |
| `sample-image.png` → PDF | one page, 720 × 480 pt, valid header |
| `sample-notes.md` → PDF | 3 A4 pages, heading text present, ink on every page |
| `sample-art.svg` → PDF | 450 × 300 pt page |
| `sample-data.csv` → PDF | accented characters preserved |
| `sample-document.pdf` → PNG | 3 images, 1190 × 1683 at 2× |
| `sample-document.pdf` → TXT | 3 page sections, headings intact |
| `sample-unicode.txt` → PDF | CJK, kana, Greek, Cyrillic all extracted back |
| `sample-archive.zip`, `sample-binary.bin` | rejected with a friendly message |
| batch of 5 files → zip | 5 valid entries |

Outputs were re-opened with pdf.js and with `file` to confirm they are real PDFs
rather than only non-empty blobs. `npm run build` (which typechecks) is the gate
before pushing.
