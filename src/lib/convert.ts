import { convertFromPdf } from './fromPdf'
import { canvasToBlob, rasterize } from './raster'
import { convertToPdf, plainTextOf } from './toPdf'
import {
  baseNameOf,
  isImage,
  isPdf,
  targetsFor,
  type ConvertOptions,
  type OutputFile,
} from './types'

const MIME: Record<'png' | 'jpg' | 'webp', { mime: string; quality: number }> = {
  png: { mime: 'image/png', quality: 1 },
  jpg: { mime: 'image/jpeg', quality: 0.92 },
  webp: { mime: 'image/webp', quality: 0.92 },
}

/**
 * Single entry point: convert one file into every format it can reach from the
 * user's selection. Each selected format really runs and yields a file; a
 * format that does not apply to the input is simply not attempted.
 */
export async function convertFile(
  file: File,
  options: ConvertOptions,
): Promise<OutputFile[]> {
  const targets = targetsFor(file, options.formats)
  if (!targets.length) {
    throw new Error(
      'No ticked format applies to this file — pick one more format, or a different file.',
    )
  }

  if (isPdf(file)) {
    return convertFromPdf(file, { formats: targets, scale: options.scale })
  }

  const outputs: OutputFile[] = []
  const rasters = targets.filter(
    (format): format is 'png' | 'jpg' | 'webp' =>
      format === 'png' || format === 'jpg' || format === 'webp',
  )

  if (targets.includes('pdf')) {
    outputs.push(...(await convertToPdf(file, { pageSize: options.pageSize })))
  }

  if (isImage(file) && rasters.length) {
    outputs.push(...(await imagesToRasters(file, rasters)))
  }

  if (targets.includes('txt')) {
    const text = await plainTextOf(file)
    outputs.push({
      name: `${baseNameOf(file.name)}.txt`,
      blob: new Blob([text], { type: 'text/plain;charset=utf-8' }),
    })
  }

  return outputs
}

/** Re-encode one image into each requested image format from a single canvas. */
async function imagesToRasters(
  file: File,
  formats: ('png' | 'jpg' | 'webp')[],
): Promise<OutputFile[]> {
  const canvas = await rasterize(file)
  const base = baseNameOf(file.name)
  const outputs: OutputFile[] = []

  for (const format of formats) {
    const { mime, quality } = MIME[format]
    let blob: Blob
    try {
      blob = await canvasToBlob(canvas, mime, quality)
    } catch {
      if (format === 'webp') continue
      throw new Error('This image could not be re-encoded.')
    }
    outputs.push({ name: `${base}.${format}`, blob })
  }

  return outputs
}
