export type Direction = 'auto' | 'toPdf' | 'fromPdf'

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
}

export interface ToPdfOptions {
  pageSize: 'fit' | 'a4'
}

export interface FromPdfOptions {
  format: 'png' | 'jpeg' | 'txt'
  scale: number
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

/** How a given file should be handled for the chosen direction. */
export function directionFor(file: File, direction: Direction): 'toPdf' | 'fromPdf' {
  if (direction === 'auto') return isPdf(file) ? 'fromPdf' : 'toPdf'
  return direction
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
