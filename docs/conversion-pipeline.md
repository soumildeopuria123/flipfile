# Conversion pipeline

## File to PDF

```
File -> isImage? -> rasterize to canvas -> toBlob(jpeg|png) -> embed -> draw -> save
             \-> text  -> looksBinary? reject : html/markdown to text -> wrap -> draw -> save
```

Images are decoded by the browser, so any format Chromium, WebKit or Gecko can
render works: PNG, JPG, WEBP, GIF, BMP, SVG, AVIF. The canvas is capped at 2600 px
on the long edge, which keeps a 12 MP phone photo from producing a 40 MB PDF.

Text files are read with `File.text()`, which decodes as UTF-8. A file is treated
as binary when more than 5% of the first 4000 characters are control characters
or more than 2% are U+FFFD; those fail with a readable message instead of
producing a page of noise.

## PDF to files

pdf.js opens the document from an `ArrayBuffer` — never a URL — so no request is
made. Each page is rendered into its own canvas at the requested scale (1×, 2×,
3×) and encoded to PNG or JPEG. Text export reads `getTextContent()` and joins
the runs, keeping paragraph breaks where pdf.js reports `hasEOL`.

The pdf.js worker is bundled (`pdfjs-dist/build/pdf.worker.min.mjs?url`) and
registered with `GlobalWorkerOptions`, so rendering stays off the main thread.
