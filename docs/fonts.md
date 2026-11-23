# Fonts

Two faces cover the scripts the app supports:

| Face | Covers |
| --- | --- |
| Noto Sans | Latin, Greek, Cyrillic, punctuation |
| Noto Sans SC | CJK ideographs, kana, full-width forms |

Both are downloaded by `scripts/fetch-fonts.mjs` into `src/assets/` and are not
committed, because binaries that size do not belong in git.

## Why two faces

A single merged face is not practical: Noto's CJK faces ship with unnamed glyphs
(post table format 3), so merging Latin and CJK outlines produces a font whose
glyph names cannot be trusted. Keeping them separate also means an English
contract never downloads the CJK face.

## How a line picks a font

`fontRuns()` splits a line on the CJK ranges with a capturing group — without the
capture, `String.split` would drop the Chinese text entirely. Each run is then
drawn with `fontFor(...)`, measured independently, and the cursor advances by
that run's width.

## Subsetting

`pdf.embedFont(bytes, { subset: true })` embeds only the glyphs used, so a 30 KB
PDF with Chinese and Greek text is normal. The fork `pdf-fontkit` is used instead
of `@pdf-lib/fontkit`, which corrupts subset glyph data on large CJK faces.

## Not covered

Hangul, Arabic, Hebrew, Devanagari, Thai and emoji. There is no bidi or shaping
engine either, so right-to-left scripts would render in logical order.
