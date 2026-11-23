import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { baseNameOf, type FromPdfOptions, type OutputFile } from './types'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

async function openPdf(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  try {
    return await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise
  } catch {
    throw new Error('This PDF could not be opened. It may be corrupted or password protected.')
  }
}

/** Turn a PDF into one image per page, or a single plain-text file. */
export async function convertFromPdf(
  file: File,
  options: FromPdfOptions,
): Promise<OutputFile[]> {
  const pdf = await openPdf(file)

  try {
    return options.format === 'txt'
      ? await pagesToText(pdf, file)
      : await pagesToImages(pdf, file, options.format, options.scale)
  } finally {
    void pdf.destroy()
  }
}

async function pagesToImages(
  pdf: pdfjsLib.PDFDocumentProxy,
  file: File,
  format: 'png' | 'jpeg',
  scale: number,
): Promise<OutputFile[]> {
  const base = baseNameOf(file.name)
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const ext = format === 'jpeg' ? 'jpg' : 'png'
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

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, 0.92),
    )
    if (blob) outputs.push({ name: `${base}-page-${pageNumber}.${ext}`, blob })

    page.cleanup()
  }

  return outputs
}

async function pagesToText(
  pdf: pdfjsLib.PDFDocumentProxy,
  file: File,
): Promise<OutputFile[]> {
  const sections: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    let pageText = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      pageText += item.str
      pageText += item.hasEOL ? '\n' : ' '
    }

    sections.push(pageText.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim())
    page.cleanup()
  }

  const body = sections
    .map((section, index) => `— Page ${index + 1} —\n\n${section}`)
    .join('\n\n')

  return [
    {
      name: `${baseNameOf(file.name)}.txt`,
      blob: new Blob(
        [
          `Text extracted from ${file.name} (${pdf.numPages} page${
            pdf.numPages === 1 ? '' : 's'
          })\n\n${body}\n`,
        ],
        { type: 'text/plain;charset=utf-8' },
      ),
    },
  ]
}
