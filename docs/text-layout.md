# Text layout

Text PDFs use one fixed page size (A4, 595.28 × 841.89 pt) with a 56 pt margin,
11 pt type and 16.5 pt leading. That yields 44 lines per page.

## Wrapping

1. `wrapParagraphs` normalises CRLF, splits on newlines, expands tabs to four
   spaces and keeps blank lines as paragraph breaks.
2. `wrapLine` greedily fills a line word by word while the measured width fits
   the column.
3. A single token wider than the column (a long URL, or CJK text, which has no
   spaces) falls through to `breakToWidth`, which splits it character by
   character.

## Measuring

`textWidth` sums per-run widths, so a line that mixes Latin and Chinese is
measured with the correct font for each part. Measuring per character inside
`breakToWidth` costs a little speed but keeps mixed-script lines exact.

## Drawing

Pages are filled in order; an empty file still gets one blank page. The ink
colour is a near-black (`rgb(0.09, 0.09, 0.11)`) rather than pure black so
printed output looks softer.
