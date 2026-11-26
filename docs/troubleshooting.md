# Troubleshooting

**"This looks like a binary file."** The file decoded to mostly control
characters. It is probably an archive, an executable or a compressed document;
unzip or export it first.

**"This image could not be decoded by the browser."** The extension matched an
image type but the bytes are not one the browser can read — often a `.png` that is
really a `.webp`, or a corrupted download.

**"This PDF could not be opened."** Corrupt or password-protected. Try opening
it in a viewer to confirm.

**The PDF has boxes instead of Chinese text.** The CJK face did not download.
Run `npm run fonts` and check `src/assets/NotoSansSC-Regular.ttf` exists.

**Text converts but the page is blank.** Look at the devtools console: a
failed font fetch is logged as "A bundled font could not be loaded".

**A big PNG produces a huge PDF.** Rasterising is capped at 2600 px on the long
edge; downscale the image first if the PDF still feels large.
