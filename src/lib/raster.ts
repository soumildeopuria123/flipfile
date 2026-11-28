/** Canvas helpers shared by the PDF writer and the image re-encoder. */

export const PHOTO_EXTENSIONS = ['jpg', 'jpeg']

/** Load a user file into an <img>, rejecting formats the browser cannot decode. */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const img = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('This image could not be decoded by the browser.'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Draw an image onto a white canvas, capped so huge photos stay manageable. */
export function drawToCanvas(img: HTMLImageElement, maxEdge = 2600): HTMLCanvasElement {
  const width = img.naturalWidth || 1200
  const height = img.naturalHeight || 900
  const scale = Math.min(1, maxEdge / Math.max(width, height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  // White backdrop so transparency does not turn black in JPEG or PDF output.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function rasterize(file: File): Promise<HTMLCanvasElement> {
  return drawToCanvas(await loadImage(file))
}

/** Encode a canvas, e.g. 'image/png'. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('This image could not be encoded.'))
          return
        }
        resolve(blob)
      },
      mime,
      quality,
    )
  })
}

export async function canvasBytes(
  canvas: HTMLCanvasElement,
  mime: 'image/jpeg' | 'image/png',
): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas, mime)
  return new Uint8Array(await blob.arrayBuffer())
}

export function fitWithin(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / width, maxHeight / height)
  return { width: width * ratio, height: height * ratio }
}
