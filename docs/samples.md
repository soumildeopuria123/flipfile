# Samples

`samples/` holds inputs used for manual verification.

| File | What it exercises |
| --- | --- |
| `sample-image.png` | 960 × 640 generated gradient with a shape |
| `sample-art.svg` | vector to raster path |
| `sample-notes.md` | multi-page layout, headings, quotes |
| `sample-data.csv` | accents (`Zoë`) and short tabular data |
| `sample-unicode.txt` | CJK, kana, Greek, Cyrillic, symbols |
| `sample-document.pdf` | three-page PDF to export |
| `sample-archive.zip`, `sample-binary.bin` | rejection paths |

`npm run samples` rebuilds the PNG, the markdown and the PDF from
`samples/make-samples.mjs`. Everything else is static.
