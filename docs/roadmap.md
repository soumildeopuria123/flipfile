# Roadmap

Wanted, roughly in order of value:

1. **Merging.** Combine the converted PDFs into one document instead of a zip.
2. **Page ranges.** Export pages 3–7 of a long PDF rather than all of them.
3. **Hangul.** A third face for Korean, fetched only when needed.
4. **Markdown structure.** Real headings, bullets and tables instead of flattened
   lines.
5. **Password-protected PDFs.** pdf.js can accept a password; the UI has no field
   for one yet.

Deliberately out of scope: accounts, cloud storage, a server-side queue, OCR, and
editing PDF contents. Each of those either breaks the no-upload promise or turns
a one-file client into a product with a backend.
