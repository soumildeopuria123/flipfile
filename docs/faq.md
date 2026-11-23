# FAQ

**Does anything get uploaded?** No. Conversion happens in the tab; the network
tab shows only the app's own assets.

**Why is the first text conversion slow?** The CJK face is fetched the first
time a document contains Chinese or Japanese. Later conversions reuse it.

**Why did my scanned PDF export an empty .txt?** A scan has no text layer. Export
images instead.

**Can I convert a password-protected PDF?** No, pdf.js cannot open it.

**Is there a file-size limit?** Only memory. Images are capped at 2600 px on the
long edge, and very large batches are converted one at a time.

**Where do the font files come from?** `npm run fonts` downloads Noto Sans and
Noto Sans SC from Google and noto-cjk, under the SIL Open Font License.
