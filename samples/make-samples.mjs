// Creates sample inputs used to exercise the converters end to end.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const dir = new URL('./', import.meta.url).pathname
mkdirSync(dir, { recursive: true })

/* --------------------------------------------------------------- PNG image */

const W = 960
const H = 640
const raw = Buffer.alloc((W * 3 + 1) * H)

for (let y = 0; y < H; y += 1) {
  const rowStart = y * (W * 3 + 1)
  raw[rowStart] = 0 // filter: none
  for (let x = 0; x < W; x += 1) {
    const t = (x / W + y / H) / 2
    let r = Math.round(20 + t * 180)
    let g = Math.round(30 + t * 150)
    let b = Math.round(70 + t * 90)
    const dx = x - W * 0.62
    const dy = y - H * 0.45
    if (dx * dx + dy * dy < 150 * 150) {
      r = 200
      g = 247
      b = 81
    }
    const i = rowStart + 1 + x * 3
    raw[i] = r
    raw[i + 1] = g
    raw[i + 2] = b
  }
}

const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 2 // colour type: truecolour RGB

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(`${dir}sample-image.png`, png)

/* ------------------------------------------------------------ markdown doc */

const paragraph =
  'Flipfile converts documents inside the browser window. Nothing is uploaded to a server, ' +
  'which means a contract, an invoice or a screenshot never leaves the machine it was created ' +
  'on. The engine rasterises images through the Canvas API and lays out text with embedded ' +
  'standard fonts, so the resulting PDF keeps selectable text instead of a flat picture.'

const markdown = [
  '# Quarterly operations review',
  '',
  `${paragraph}`,
  '',
  '## Highlights',
  '',
  '- Shipped the offline converter to every desktop build',
  '- Cut average conversion time by 40% after switching renderers',
  '- Reduced support tickets by half quarter over quarter',
  '',
  '### Numbers that matter',
  '',
  '| Metric | Q1 | Q2 |',
  '| --- | --- | --- |',
  '| Conversions | 12,400 | 31,900 |',
  '| Median time | 1.9s | 0.8s |',
  '| Failures | 214 | 37 |',
  '',
  `> “Move the file, not the data” — the rule the team follows when a feature is ambiguous.`,
  '',
  '## Detailed notes',
  '',
  ...Array.from({ length: 12 }, (_, i) => `### Section ${i + 1}\n\n${paragraph} — note ${i + 1}.\n`),
  '## Appendix',
  '',
  'Run `npm run build` before tagging a release, then verify the worker file still ships.',
  '',
  'See [the handbook](https://example.com/handbook) for the full checklist.',
  '',
  'Trademark symbols (®), degree signs (°), curly “quotes”, an em dash — and a euro sign € should all survive layout.',
  '',
].join('\n')

writeFileSync(`${dir}sample-notes.md`, markdown)

/* --------------------------------------------------------------- sample PDF */

const pdf = await PDFDocument.create()
const font = await pdf.embedFont(StandardFonts.Helvetica)
const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

const pages = [
  ['Flipfile sample document', 'Page one of three.', 'The quick brown fox jumps over the lazy dog.'],
  ['Second page', 'This page exists so multi-page export can be verified.', 'Each page becomes its own image.'],
  ['Third page', 'Text extraction should capture every heading.', 'End of document.'],
]

pages.forEach(([heading, ...lines], index) => {
  const page = pdf.addPage([595.28, 841.89])
  page.drawText(heading, { x: 64, y: 750, size: 24, font: bold, color: rgb(0.1, 0.1, 0.15) })
  lines.forEach((line, i) => {
    page.drawText(line, { x: 64, y: 700 - i * 24, size: 13, font, color: rgb(0.25, 0.25, 0.3) })
  })
  page.drawText(`Sample page ${index + 1}`, { x: 64, y: 90, size: 10, font, color: rgb(0.5, 0.5, 0.55) })
})

writeFileSync(`${dir}sample-document.pdf`, await pdf.save())

console.log('samples written to', dir)
