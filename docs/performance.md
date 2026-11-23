# Performance

Measured in Chromium on a laptop, 2026 hardware:

| Job | Time | Output |
| --- | --- | --- |
| 960 × 640 PNG → PDF | 0.2 s | 19 KB |
| 15 KB markdown → PDF (3 A4 pages) | 0.5 s | 12 KB |
| Unicode text, 50 languages samples | 1.2 s | 30 KB |
| 3-page PDF → PNG at 2× | 0.9 s | 3 × 1190 × 1683 |
| 3-page PDF → text | 0.3 s | 2 KB |

Where the time goes: font parsing on the first text conversion (the CJK face is
17 MB), canvas encoding for large images, and pdf.js page rendering. Nothing is
retried or cached across files, so timings scale linearly with the queue.

The build ships a 1.6 MB JS bundle (697 KB gzipped) because pdf-lib and pdf.js
are both included; a page render does not need a second download.
