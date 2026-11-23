# Supported formats

## Into PDF

| Kind | Extensions | How |
| --- | --- | --- |
| Raster images | png, jpg, jpeg, webp, gif, bmp, avif | canvas → embed |
| Vector images | svg | canvas → embed (rasterised) |
| Text | txt, md, markdown, csv, json, html, htm, code | typeset as A4 pages |

JPG and JPEG inputs are re-encoded as JPEG, everything else as PNG, so
screenshots with flat colours stay crisp and photos stay small.

## Out of PDF

| Output | Notes |
| --- | --- |
| PNG per page | lossless, largest files |
| JPG per page | smaller, 0.92 quality |
| TXT | the document's text layer, one file |

At 2× a US Letter page renders to roughly 1224 × 1584 px, which is a good default
for screen reading. 3× is for print or OCR work.

## Rejected

Archives, executables, and anything that decodes to mostly control characters,
with the message "This looks like a binary file".
