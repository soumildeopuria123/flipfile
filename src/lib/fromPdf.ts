import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { pagesToDocx } from './docx'
import { canvasToBlob } from './raster'
import { baseNameOf, type OutputFile, type OutputFormat } from './types'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export interface FromPdfOptions {
  /** Any of png / jpg / webp / txt / docx; every one of them is produced. */
  formats: OutputFormat[]
  scale: number
}

const MIME: Record<'png' | 'jpg' | 'webp', { mime: string; quality: number }> = {
  png: { mime: 'image/png', quality: 1 },
  jpg: { mime: 'image/jpeg', quality: 0.92 },
  webp: { mime: 'image/webp', quality: 0.92 },
}

async function openPdf(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  try {
    return await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise
  } catch {
    throw new Error('This PDF could not be opened. It may be corrupted or password protected.')
  }
}

/**
 * Turn a PDF into every selected output. Pages are rendered once and encoded
 * into each requested image format, so three ticked formats still cost one
 * render per page.
 */
export async function convertFromPdf(
  file: File,
  options: FromPdfOptions,
): Promise<OutputFile[]> {
  const pdf = await openPdf(file)
  const base = baseNameOf(file.name)

  try {
    const wanted = options.formats
    const raster = (['png', 'jpg', 'webp'] as const).filter((format) =>
      wanted.includes(format),
    )
    const wantsText = wanted.includes('txt') || wanted.includes('docx')

    if (!raster.length && !wantsText) {
      throw new Error('Pick at least one output format for this PDF.')
    }

    const outputs: OutputFile[] = []

    if (raster.length) {
      outputs.push(...(await pagesToImages(pdf, base, raster, options.scale)))
    }

    if (wantsText) {
      const pages = await pagesToText(pdf)
      if (wanted.includes('txt')) {
        outputs.push({
          name: `${base}.txt`,
          blob: new Blob([textFile(file, pages, pdf.numPages)], {
            type: 'text/plain;charset=utf-8',
          }),
        })
      }
      if (wanted.includes('docx')) {
        outputs.push({
          name: `${base}.docx`,
          blob: await pagesToDocx(pages, base),
        })
      }
    }

    return outputs
  } finally {
    void pdf.destroy()
  }
}

async function pagesToImages(
  pdf: pdfjsLib.PDFDocumentProxy,
  base: string,
  formats: ('png' | 'jpg' | 'webp')[],
  scale: number,
): Promise<OutputFile[]> {
  const outputs: OutputFile[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(viewport.width))
    canvas.height = Math.max(1, Math.floor(viewport.height))

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available in this browser.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: ctx, viewport, background: '#ffffff' }).promise

    // One render, one encode per requested format.
    for (const format of formats) {
      const { mime, quality } = MIME[format]
      let blob: Blob | null
      try {
        blob = await canvasToBlob(canvas, mime, quality)
      } catch {
        // A browser without WebP encoding support only fails that one format.
        if (format === 'webp') continue
        throw new Error('This page could not be encoded as an image.')
      }
      if (blob) outputs.push({ name: `${base}-page-${pageNumber}.${format}`, blob })
    }

    page.cleanup()
  }

  return outputs
}

async function pagesToText(pdf: pdfjsLib.PDFDocumentProxy): Promise<string[]> {
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    let pageText = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      pageText += item.str
      pageText += item.hasEOL ? '\n' : ' '
    }

    pages.push(
      pageText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(),
    )
    page.cleanup()
  }

  return pages
}

function textFile(file: File, pages: string[], numPages: number): string {
  const body = pages
    .map((section, index) => `— Page ${index + 1} —\n\n${section}`)
    .join('\n\n')

  return `Text extracted from ${file.name} (${numPages} page${
    numPages === 1 ? '' : 's'
  })\n\n${body}\n`
}
