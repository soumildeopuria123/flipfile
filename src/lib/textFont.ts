import fontkit from 'pdf-fontkit'
import type { PDFDocument, PDFFont } from 'pdf-lib'
import latinUrl from '../assets/NotoSans-Regular.ttf?url'
import cjkUrl from '../assets/NotoSansSC-Regular.ttf?url'

export interface TextFonts {
  /** Latin, Greek, Cyrillic and punctuation. */
  body: PDFFont
  /** Chinese, Japanese and full-width forms; only embedded when used. */
  cjk?: PDFFont
}

/** Kana, CJK ideographs, CJK punctuation and full-width forms. */
const CJK_RANGE = '\\u2E80-\\u2FFF\\u3000-\\u303F\\u3040-\\u30FF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\uFE30-\\uFE4F\\uFF00-\\uFFEF'
const CJK_CHAR = new RegExp(`[${CJK_RANGE}]`)
// Capturing group keeps the CJK runs in the result of String.split.
const CJK_RUN = new RegExp(`([${CJK_RANGE}]+)`)

const cache = new Map<string, Promise<ArrayBuffer>>()

function loadFont(url: string): Promise<ArrayBuffer> {
  let pending = cache.get(url)
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error('A bundled font could not be loaded.')
      return response.arrayBuffer()
    })
    cache.set(url, pending)
    pending.catch(() => cache.delete(url))
  }
  return pending
}

/**
 * Typeset text with bundled fonts: Noto Sans for Latin/Greek/Cyrillic, plus
 * Noto Sans SC (fetched only when the document actually contains CJK) so
 * non-Latin text keeps its glyphs. pdf-lib embeds only the glyphs used.
 */
export async function embedTextFonts(pdf: PDFDocument, text: string): Promise<TextFonts> {
  pdf.registerFontkit(fontkit)

  const body = await pdf.embedFont(await loadFont(latinUrl), { subset: true })
  const cjk = CJK_CHAR.test(text)
    ? await pdf.embedFont(await loadFont(cjkUrl), { subset: true })
    : undefined

  return { body, cjk }
}

export function fontFor(fonts: TextFonts, character: string): PDFFont {
  return fonts.cjk && CJK_CHAR.test(character) ? fonts.cjk : fonts.body
}

/** Split a line into consecutive runs that share one font. */
export function fontRuns(text: string): string[] {
  return text.split(CJK_RUN).filter((run) => run.length > 0)
}
