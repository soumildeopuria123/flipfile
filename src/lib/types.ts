export type JobStatus = 'queued' | 'working' | 'done' | 'error'

export interface OutputFile {
  name: string
  blob: Blob
}

export interface Job {
  id: string
  file: File
  status: JobStatus
  error?: string
  outputs: OutputFile[]
  /** Settings the outputs were produced with, so a settings change re-runs the job. */
  key?: string
}

/** Every format Flipfile can actually write. */
export type OutputFormat = 'pdf' | 'png' | 'jpg' | 'webp' | 'txt' | 'docx'

export interface ConvertOptions {
  pageSize: 'fit' | 'a4'
  scale: number
  formats: OutputFormat[]
}

export const OUTPUT_FORMATS: OutputFormat[] = ['pdf', 'png', 'jpg', 'webp', 'txt', 'docx']

export const FORMAT_LABEL: Record<OutputFormat, string> = {
  pdf: 'PDF',
  png: 'PNG',
  jpg: 'JPG',
  webp: 'WEBP',
  txt: 'TXT',
  docx: 'DOCX',
}

export const FORMAT_NOTE: Record<OutputFormat, string> = {
  pdf: 'images + text',
  png: 'PDFs + images',
  jpg: 'PDFs + images',
  webp: 'PDFs + images',
  txt: 'PDFs + text',
  docx: 'PDFs',
}

export const RASTER_FORMATS: OutputFormat[] = ['png', 'jpg', 'webp']

const SAME_EXTENSION: Record<OutputFormat, string[]> = {
  pdf: ['pdf'],
  png: ['png'],
  jpg: ['jpg', 'jpeg'],
  webp: ['webp'],
  // Markdown, CSV and JSON are not "already text": writing .txt strips their
  // markup and delimiters, so those targets are real conversions.
  txt: ['txt'],
  docx: ['docx'],
}

export const IMAGE_EXTENSIONS = [
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'bmp',
  'svg',
  'avif',
]

export function extensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name)
  return match ? match[1].toLowerCase() : ''
}

export function baseNameOf(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'file'
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || extensionOf(file.name) === 'pdf'
}

export function isImage(file: File): boolean {
  return (
    file.type.startsWith('image/') || IMAGE_EXTENSIONS.includes(extensionOf(file.name))
  )
}

/** The formats a given file can genuinely be turned into. */
export function formatsFor(file: File): OutputFormat[] {
  if (isPdf(file)) return ['png', 'jpg', 'webp', 'txt', 'docx']
  if (isImage(file)) return ['pdf', 'png', 'jpg', 'webp']
  return ['pdf', 'txt']
}

/** True when writing `format` would only reproduce the file we already have. */
export function isSameFormat(file: File, format: OutputFormat): boolean {
  return SAME_EXTENSION[format].includes(extensionOf(file.name))
}

/**
 * The formats a file should actually be converted into: everything the user
 * ticked that the file can reach, minus no-op round trips (PNG → PNG).
 */
export function targetsFor(file: File, selected: OutputFormat[]): OutputFormat[] {
  const reachable = formatsFor(file)
  return selected.filter(
    (format) => reachable.includes(format) && !isSameFormat(file, format),
  )
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
