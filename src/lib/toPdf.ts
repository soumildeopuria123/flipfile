import { PDFDocument, rgb, type PDFPage } from 'pdf-lib'
import { embedTextFonts, fontFor, fontRuns, type TextFonts } from './textFont'
import {
  baseNameOf,
  extensionOf,
  isImage,
  type OutputFile,
  type ToPdfOptions,
} from './types'

const A4 = { width: 595.28, height: 841.89 }
const POINTS_PER_PX = 72 / 96
const MARGIN = 56
const FONT_SIZE = 11
const LEADING = 16.5
const INK = rgb(0.09, 0.09, 0.11)
const PHOTO_EXTENSIONS = ['jpg', 'jpeg']

/** Build a PDF from a single non-PDF file. */
export async function convertToPdf(
  file: File,
  options: ToPdfOptions,
): Promise<OutputFile[]> {
  const pdf = isImage(file)
    ? await pdfFromImage(file, options)
    : await pdfFromText(file)

  const bytes = await pdf.save()
  return [
    {
      name: `${baseNameOf(file.name)}.pdf`,
      blob: new Blob([bytes as BlobPart], { type: 'application/pdf' }),
    },
  ]
}

/* ------------------------------------------------------------------ images */

async function pdfFromImage(file: File, options: ToPdfOptions): Promise<PDFDocument> {
  const canvas = await rasterize(file)
  const pdf = await PDFDocument.create()
  pdf.setTitle(baseNameOf(file.name))

  // Photos keep JPEG compression; anything else (and transparency) uses PNG.
  const isPhoto = PHOTO_EXTENSIONS.includes(extensionOf(file.name))
  const data = await canvasBytes(canvas, isPhoto ? 'image/jpeg' : 'image/png')
  const image = isPhoto ? await pdf.embedJpg(data) : await pdf.embedPng(data)

  const onA4 = options.pageSize === 'a4'
  const { width, height } = onA4
    ? fitWithin(image.width, image.height, A4.width - MARGIN * 2, A4.height - MARGIN * 2)
    : { width: image.width * POINTS_PER_PX, height: image.height * POINTS_PER_PX }

  const page = pdf.addPage(onA4 ? [A4.width, A4.height] : [width, height])
  page.drawImage(image, {
    x: (page.getWidth() - width) / 2,
    y: (page.getHeight() - height) / 2,
    width,
    height,
  })

  return pdf
}

async function rasterize(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('This image could not be decoded by the browser.'))
      img.src = url
    })

    const width = img.naturalWidth || 1200
    const height = img.naturalHeight || 900
    const scale = Math.min(1, 2600 / Math.max(width, height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available in this browser.')
    // White backdrop so transparent PNGs / SVGs do not turn black in the PDF.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasBytes(
  canvas: HTMLCanvasElement,
  mime: 'image/jpeg' | 'image/png',
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('This image could not be encoded.'))
          return
        }
        blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject)
      },
      mime,
      0.92,
    )
  })
}

function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return { width: width * ratio, height: height * ratio }
}

/* -------------------------------------------------------------------- text */

async function pdfFromText(file: File): Promise<PDFDocument> {
  const raw = await file.text()
  if (looksBinary(raw)) {
    throw new Error(
      'This looks like a binary file. Try an image, PDF, or a plain-text format.',
    )
  }

  const ext = extensionOf(file.name)
  const text =
    ext === 'html' || ext === 'htm'
      ? htmlToText(raw)
      : ext === 'md' || ext === 'markdown'
        ? markdownToText(raw)
        : raw

  const pdf = await PDFDocument.create()
  pdf.setTitle(baseNameOf(file.name))
  const fonts = await embedTextFonts(pdf, text)

  const maxWidth = A4.width - MARGIN * 2
  const perPage = Math.floor((A4.height - MARGIN * 2) / LEADING)
  const lines = wrapParagraphs(text, fonts, maxWidth)

  for (let start = 0; start < lines.length; start += perPage) {
    const page = pdf.addPage([A4.width, A4.height])
    lines
      .slice(start, start + perPage)
      .forEach((line, index) =>
        drawLine(page, line, MARGIN, A4.height - MARGIN - index * LEADING, fonts),
      )
  }

  // An empty file still deserves a page.
  if (!lines.length) pdf.addPage([A4.width, A4.height])

  return pdf
}

function textWidth(text: string, fonts: TextFonts): number {
  let total = 0
  for (const run of fontRuns(text)) {
    total += fontFor(fonts, run[0]).widthOfTextAtSize(run, FONT_SIZE)
  }
  return total
}

function drawLine(page: PDFPage, text: string, x: number, y: number, fonts: TextFonts) {
  let cursor = x
  for (const run of fontRuns(text)) {
    const font = fontFor(fonts, run[0])
    page.drawText(run, { x: cursor, y, size: FONT_SIZE, font, color: INK })
    cursor += font.widthOfTextAtSize(run, FONT_SIZE)
  }
}

function wrapParagraphs(text: string, fonts: TextFonts, maxWidth: number): string[] {
  const lines: string[] = []
  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n')

  for (const paragraph of paragraphs) {
    const spaced = paragraph.replace(/\t/g, '    ')
    if (!spaced.trim()) {
      lines.push('')
      continue
    }
    lines.push(...wrapLine(spaced, fonts, maxWidth))
  }
  return lines
}

function wrapLine(text: string, fonts: TextFonts, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return ['']

  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, fonts) <= maxWidth) {
      line = candidate
      continue
    }
    if (line) lines.push(line)

    // Break a token wider than the column, e.g. CJK text, which has no spaces.
    const parts = breakToWidth(word, fonts, maxWidth)
    line = parts.pop() ?? ''
    lines.push(...parts)
  }

  lines.push(line)
  return lines
}

function breakToWidth(word: string, fonts: TextFonts, maxWidth: number): string[] {
  const parts: string[] = []
  let line = ''
  let width = 0

  for (const character of word) {
    const characterWidth = textWidth(character, fonts)
    if (line && width + characterWidth > maxWidth) {
      parts.push(line)
      line = ''
      width = 0
    }
    line += character
    width += characterWidth
  }
  if (line) parts.push(line)
  return parts
}

function looksBinary(text: string): boolean {
  if (!text.length) return false
  const sample = text.slice(0, 4000)
  let control = 0
  let undecodable = 0
  for (let i = 0; i < sample.length; i += 1) {
    const code = sample.charCodeAt(i)
    if (code === 0 || (code > 0 && code < 9) || (code > 13 && code < 32)) control += 1
    // U+FFFD replaces bytes that were not valid UTF-8, i.e. binary data.
    if (code === 0xfffd) undecodable += 1
  }
  return control / sample.length > 0.05 || undecodable / sample.length > 0.02
}

function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<(script|style|noscript|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|h[1-6]|li|tr|blockquote)>/gi, '\n')

  const doc = new DOMParser().parseFromString(withBreaks, 'text/html')
  return (doc.body?.textContent ?? '')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?/g, ''))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
}
