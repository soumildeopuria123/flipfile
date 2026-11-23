# Limitations

- **Scripts.** Latin, Greek, Cyrillic, Chinese and Japanese are covered. Hangul,
  Arabic, Hebrew, Devanagari, Thai and emoji have no glyphs in the bundled faces
  and render as nothing.
- **Direction.** There is no bidi shaping, so right-to-left text is laid out in
  logical order.
- **Scanned PDFs.** Text extraction returns the text layer; a scan has none. Use
  the PNG or JPG output instead.
- **Layout.** Text PDFs are plain paragraphs: markdown tables become lines, lists
  lose their bullets' indentation, and there are no images or links.
- **Size.** Rasterising is capped at 2600 px on the long edge to keep PDFs a sane
  size, so a very large scan loses some detail.
- **Speed.** Conversion is sequential on the main thread apart from the pdf.js
  worker; a 30-page PDF at 3× takes noticeably longer than at 1×.
