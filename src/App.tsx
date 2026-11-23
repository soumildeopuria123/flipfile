import { useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { convertFromPdf } from './lib/fromPdf'
import { convertToPdf } from './lib/toPdf'
import {
  baseNameOf,
  directionFor,
  extensionOf,
  formatBytes,
  type Direction,
  type Job,
  type OutputFile,
} from './lib/types'

let counter = 0
const nextId = () => `job-${(counter += 1)}`

function downloadFile(output: OutputFile) {
  const url = URL.createObjectURL(output.blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = output.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong while converting.'

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [direction, setDirection] = useState<Direction>('auto')
  const [pageSize, setPageSize] = useState<'fit' | 'a4'>('fit')
  const [format, setFormat] = useState<'png' | 'jpeg' | 'txt'>('png')
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [zipping, setZipping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const outputs = useMemo(() => jobs.flatMap((job) => job.outputs), [jobs])
  const pending = jobs.filter((job) => job.status !== 'done')
  const doneCount = jobs.filter((job) => job.status === 'done').length

  const update = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)))

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files)
    if (!list.length) return
    setJobs((prev) => [
      ...prev,
      ...list.map((file) => ({
        id: nextId(),
        file,
        status: 'queued' as const,
        outputs: [],
      })),
    ])
  }

  const removeJob = (id: string) =>
    setJobs((prev) => prev.filter((job) => job.id !== id))

  const convert = async () => {
    if (busy || !pending.length) return
    setBusy(true)

    for (const job of pending) {
      update(job.id, { status: 'working', error: undefined })
      try {
        const mode = directionFor(job.file, direction)
        const result =
          mode === 'fromPdf'
            ? await convertFromPdf(job.file, { format, scale })
            : await convertToPdf(job.file, { pageSize })
        update(job.id, { status: 'done', outputs: result })
      } catch (error) {
        update(job.id, { status: 'error', error: messageOf(error) })
      }
    }

    setBusy(false)
  }

  const downloadAll = async () => {
    if (!outputs.length || zipping) return
    setZipping(true)
    try {
      const zip = new JSZip()
      const used = new Set<string>()
      for (const output of outputs) {
        let name = output.name
        let index = 2
        while (used.has(name)) {
          const ext = extensionOf(name)
          name = `${baseNameOf(output.name)}-${index}${ext ? `.${ext}` : ''}`
          index += 1
        }
        used.add(name)
        zip.file(name, output.blob)
      }
      const blob = await zip.generateAsync({ type: 'blob' })
      downloadFile({ name: 'flipfile-converted.zip', blob })
    } finally {
      setZipping(false)
    }
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files)
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M5 9h11l-3-3M19 15H8l3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Flipfile
        </a>
        <span className="privacy">
          <span className="pulse" /> Runs in your browser — nothing is uploaded
        </span>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Two-way file converter</p>
          <h1>
            Any file in.
            <br />
            <span>A PDF out.</span> Or the reverse.
          </h1>
          <p className="lede">
            Drop in images, text, markdown, HTML or a PDF. Flipfile turns them into clean PDFs
            and can pull PDFs straight back out as images or text — locally, on your own
            machine.
          </p>
        </section>

        <section className="workbench">
          <div
            className={`card dropzone${dragging ? ' is-over' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault()
              dragDepth.current += 1
              setDragging(true)
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault()
              dragDepth.current -= 1
              if (dragDepth.current <= 0) {
                dragDepth.current = 0
                setDragging(false)
              }
            }}
            onDrop={onDrop}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files)
                event.target.value = ''
              }}
            />

            <button
              type="button"
              className="drop-hint"
              onClick={() => inputRef.current?.click()}
            >
              <span className="drop-glyph" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <strong>{dragging ? 'Drop them right here' : 'Drop files, or click to browse'}</strong>
              <span className="drop-sub">
                PNG · JPG · WEBP · GIF · BMP · SVG · AVIF · TXT · MD · CSV · JSON · HTML · code ·
                PDF
              </span>
            </button>

            {jobs.length > 0 && (
              <ul className="filelist">
                {jobs.map((job) => (
                  <li key={job.id} className={`filerow is-${job.status}`}>
                    <span className="badge">{extensionOf(job.file.name).toUpperCase() || 'FILE'}</span>
                    <div className="filerow-main">
                      <span className="filerow-name" title={job.file.name}>
                        {job.file.name}
                      </span>
                      <span className="filerow-meta">
                        {formatBytes(job.file.size)}
                        <span className="sep">·</span>
                        {directionFor(job.file, direction) === 'fromPdf'
                          ? 'PDF → file'
                          : 'file → PDF'}
                        {job.status === 'done' && (
                          <>
                            <span className="sep">·</span>
                            <span className="ok">
                              {job.outputs.length} file{job.outputs.length === 1 ? '' : 's'} ready
                            </span>
                          </>
                        )}
                        {job.status === 'error' && (
                          <>
                            <span className="sep">·</span>
                            <span className="err">{job.error}</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="filerow-actions">
                      {job.status === 'working' && <span className="spinner" aria-label="Converting" />}
                      {job.outputs.map((output) => (
                        <button
                          key={output.name}
                          type="button"
                          className="chip-download"
                          onClick={() => downloadFile(output)}
                          title={`Download ${output.name}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                              d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {job.outputs.length > 1 ? output.name.split('-page-')[1] ?? 'save' : 'Save'}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeJob(job.id)}
                        aria-label={`Remove ${job.file.name}`}
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M6 6l12 12M18 6L6 18"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className="card panel">
            <div className="field">
              <span className="label">Direction</span>
              <div className="segmented">
                {(
                  [
                    ['auto', 'Auto'],
                    ['toPdf', 'To PDF'],
                    ['fromPdf', 'From PDF'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={direction === value ? 'is-active' : ''}
                    onClick={() => setDirection(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="hint">
                {direction === 'auto'
                  ? 'PDFs come out as images or text, everything else becomes a PDF.'
                  : direction === 'toPdf'
                    ? 'Every file is rendered into a PDF.'
                    : 'PDF pages are exported as images or text.'}
              </p>
            </div>

            <div className="field">
              <span className="label">Into PDF</span>
              <div className="segmented compact">
                {(
                  [
                    ['fit', 'Fit to file'],
                    ['a4', 'A4 page'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={pageSize === value ? 'is-active' : ''}
                    onClick={() => setPageSize(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="label">Out of PDF</span>
              <div className="segmented compact">
                {(
                  [
                    ['png', 'PNG'],
                    ['jpeg', 'JPG'],
                    ['txt', 'Text'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={format === value ? 'is-active' : ''}
                    onClick={() => setFormat(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {format !== 'txt' && (
                <label className="select-row">
                  <span>Resolution</span>
                  <select
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                  >
                    <option value={1}>1× — smallest</option>
                    <option value={2}>2× — standard</option>
                    <option value={3}>3× — sharp</option>
                  </select>
                </label>
              )}
            </div>

            <button
              type="button"
              className="primary"
              disabled={busy || !pending.length}
              onClick={convert}
            >
              {busy
                ? 'Converting…'
                : pending.length
                  ? `Convert ${pending.length} file${pending.length === 1 ? '' : 's'}`
                  : 'Add files to convert'}
            </button>

            {outputs.length > 0 && (
              <button type="button" className="secondary" onClick={downloadAll} disabled={zipping}>
                {zipping ? 'Zipping…' : `Download all (${outputs.length}) as .zip`}
              </button>
            )}

            {jobs.length > 0 && (
              <button
                type="button"
                className="ghost"
                onClick={() => setJobs([])}
                disabled={busy}
              >
                Clear list
              </button>
            )}

            <dl className="stats">
              <div>
                <dt>Files</dt>
                <dd>{jobs.length}</dd>
              </div>
              <div>
                <dt>Converted</dt>
                <dd>{doneCount}</dd>
              </div>
              <div>
                <dt>Outputs</dt>
                <dd>{outputs.length}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="formats">
          <article className="card">
            <h3>Into a PDF</h3>
            <p>
              Photos, screenshots, scans, SVG art and GIFs become single-page PDFs. Plain text,
              markdown, CSV, JSON, HTML and source files are typeset with real selectable text in a
              bundled Unicode font — Chinese, Japanese, Cyrillic and Greek stay readable — and
              wrapped across A4 pages.
            </p>
          </article>
          <article className="card">
            <h3>Out of a PDF</h3>
            <p>
              Export every page as a crisp PNG or JPG at up to 3× resolution, or extract the text
              layer into a single .txt file you can search and edit.
            </p>
          </article>
          <article className="card">
            <h3>Nothing leaves the tab</h3>
            <p>
              Conversion runs on the WebAssembly and Canvas engines inside your browser, so
              contracts, invoices and screenshots never touch a server.
            </p>
          </article>
        </section>
      </main>

      <footer>
        <span>Flipfile</span>
        <span>Built for the browser · no uploads, no accounts, no limits</span>
      </footer>
    </div>
  )
}
