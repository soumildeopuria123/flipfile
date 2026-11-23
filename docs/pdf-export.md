# Reading PDFs

`openPdf()` passes an `ArrayBuffer` straight to pdf.js, so no URL is constructed
and no request is made. A failure to parse (corrupt or password protected) is
reported as a readable message.

## Images

Each page gets a fresh canvas sized from `getViewport({ scale })`, filled white
first so transparent backgrounds do not turn black, then rendered with
`background: '#ffffff'`. The canvas is encoded with `toBlob` at 0.92 quality for
JPEG. Pages are named `<file>-page-<n>.png`.

## Text

`getTextContent()` returns positioned runs. They are concatenated, a newline is
added where pdf.js reports `hasEOL`, and runs of spaces before a newline are
collapsed. Each page is prefixed with `— Page n —`.

`pdf.destroy()` runs in a `finally` block so a failed conversion does not leak a
worker.
