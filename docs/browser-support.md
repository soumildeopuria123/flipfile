# Browser support

Flipfile needs a current evergreen browser: Chrome/Edge 105+, Firefox 110+,
Safari 16+.

What it relies on:

- Canvas 2D and `canvas.toBlob` for rasterising and encoding.
- WebAssembly for pdf.js rendering (and the pdf.js worker module).
- `File.text()` and `ArrayBuffer` for decoding inputs.
- `URL.createObjectURL` for image decoding and downloads.

`DOMParser` handles HTML input. Nothing depends on `SharedArrayBuffer`, so no
COOP/COEG headers are needed to host the built app.
