// Flipfile embeds two Noto faces at runtime. They are large binaries, so they
// are fetched on demand instead of being committed: `npm run fonts` writes them
// into src/assets/, and dev/build do it automatically when they are missing.
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FONTS = [
  {
    file: 'NotoSans-Regular.ttf',
    label: 'Noto Sans (Latin, Greek, Cyrillic)',
    url: 'https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  },
  {
    file: 'NotoSansSC-Regular.ttf',
    label: 'Noto Sans SC (Chinese, Japanese)',
    url: 'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/Variable/TTF/Subset/NotoSansSC-VF.ttf',
  },
]

const outFlag = process.argv.indexOf('--out')
const outDir =
  outFlag > -1 && process.argv[outFlag + 1]
    ? process.argv[outFlag + 1]
    : join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets')

mkdirSync(outDir, { recursive: true })

let failed = false

for (const font of FONTS) {
  const target = join(outDir, font.file)
  if (existsSync(target)) continue

  process.stdout.write(`fetching ${font.label} → ${font.file} … `)
  try {
    const response = await fetch(font.url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    const partial = `${target}.part`
    writeFileSync(partial, bytes)
    renameSync(partial, target)
    console.log(`${(bytes.length / 1024 / 1024).toFixed(1)} MB`)
  } catch (error) {
    rmSync(`${target}.part`, { force: true })
    console.error(`failed (${error instanceof Error ? error.message : error})`)
    failed = true
  }
}

if (failed) {
  console.error('Some font files are missing; text-to-PDF will not build without them.')
  process.exitCode = 1
}
