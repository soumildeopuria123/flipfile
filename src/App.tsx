import { useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { convertFile } from './lib/convert'
import {
  FORMAT_LABEL,
  FORMAT_NOTE,
  OUTPUT_FORMATS,
  RASTER_FORMATS,
  baseNameOf,
  extensionOf,
  formatBytes,
  formatsFor,
  targetsFor,
  type Job,
  type OutputFile,
  type OutputFormat,
} from './lib/types'

let counter = 0
const nextId = () => `job-${(counter += 1)}`

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

async function zipOutputs(outputs: OutputFile[]): Promise<Blob> {
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
  return zip.generateAsync({ type: 'blob' })
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong while converting.'

const IMAGE_GLYPH = ['M4 5.5h16v13H4z', 'M4 15.2l4.6-3.6 3.9 3 3.2-2.6 5.3 3.6']

/** Small leading glyphs so the grid can be scanned without reading six labels. */
const FORMAT_PATHS: Record<OutputFormat, string[]> = {
  pdf: ['M7 3.5h6.2L17.5 8v12.5H7z', 'M13 3.6V8h4.4'],
  png: IMAGE_GLYPH,
  jpg: IMAGE_GLYPH,
  webp: IMAGE_GLYPH,
  txt: ['M5.5 7.5h13', 'M5.5 12h13', 'M5.5 16.5h8'],
  docx: ['M7 3.5h6.2L17.5 8v12.5H7z', 'M9.6 12.2h4.8', 'M9.6 15.4h5.8'],
}

interface OutputGroup {
  ext: string
  outputs: OutputFile[]
}

/** One chip per output format instead of one chip per page. */
function groupOutputs(outputs: OutputFile[]): OutputGroup[] {
  const groups = new Map<string, OutputFile[]>()
  for (const output of outputs) {
    const ext = extensionOf(output.name) || 'file'
    const list = groups.get(ext)
    if (list) list.push(output)
    else groups.set(ext, [output])
  }
  return [...groups].map(([ext, outputs]) => ({ ext, outputs }))
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [formats, setFormats] = useState<OutputFormat[]>(['pdf', 'png'])
  const [pageSize, setPageSize] = useState<'fit' | 'a4'>('fit')
  const [scale, setScale] = useState(2)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [zipping, setZipping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const outputs = useMemo(() => jobs.flatMap((job) => job.outputs), [jobs])
  const doneCount = jobs.filter((job) => job.status === 'done').length

  const settingsKey = useMemo(
    () => JSON.stringify({ formats: [...formats].sort(), pageSize, scale }),
    [formats, pageSize, scale],
  )

  // Anything not yet converted with the current settings is due a run.
  const todo = useMemo(
    () => jobs.filter((job) => job.status !== 'done' || job.key !== settingsKey),
    [jobs, settingsKey],
  )

  // Formats at least one queued file can actually reach.
  const reachable = useMemo(() => {
    if (!jobs.length) return new Set<OutputFormat>(OUTPUT_FORMATS)
    return new Set(jobs.flatMap((job) => formatsFor(job.file)))
  }, [jobs])

  // Formats already written for the current settings. Once nothing is pending these
  // settle out of the violet "armed" colour, so the picker never looks like a job
  // that still has to run.
  const written = useMemo(() => {
    const counts = new Map<OutputFormat, number>()
    for (const job of jobs) {
      if (job.status !== 'done' || job.key !== settingsKey) continue
      for (const output of job.outputs) {
        const ext = extensionOf(output.name).toLowerCase() as OutputFormat
        if (!OUTPUT_FORMATS.includes(ext)) continue
        counts.set(ext, (counts.get(ext) ?? 0) + 1)
      }
    }
    return counts
  }, [jobs, settingsKey])

  const settled = !todo.length && written.size > 0

  // Files this selection would actually produce, before the run happens.
  const planned = useMemo(
    () => jobs.reduce((total, job) => total + targetsFor(job.file, formats).length, 0),
    [jobs, formats],
  )

  const hasRaster = formats.some((format) => RASTER_FORMATS.includes(format))

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

  const removeJob = (id: string) => setJobs((prev) => prev.filter((job) => job.id !== id))

  const toggleFormat = (format: OutputFormat) =>
    setFormats((prev) =>
      prev.includes(format) ? prev.filter((item) => item !== format) : [...prev, format],
    )

  const convert = async () => {
    if (busy || !todo.length) return
    setBusy(true)

    for (const job of todo) {
      update(job.id, { status: 'working', error: undefined })
      try {
        const result = await convertFile(job.file, { formats, pageSize, scale })
        update(job.id, { status: 'done', outputs: result, key: settingsKey })
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
      downloadBlob(await zipOutputs(outputs), 'flipfile-converted.zip')
    } finally {
      setZipping(false)
    }
  }

  const saveGroup = async (job: Job, group: OutputGroup) => {
    if (group.outputs.length === 1) {
      downloadBlob(group.outputs[0].blob, group.outputs[0].name)
      return
    }
    downloadBlob(await zipOutputs(group.outputs), `${baseNameOf(job.file.name)}-${group.ext}.zip`)
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
            One file in.
            <br />
            <span>Every format out.</span>
          </h1>
          <p className="lede">
            Drop in images, text, markdown, HTML or a PDF. Tick as many output formats as you
            like — PDF, PNG, JPG, WEBP, TXT, DOCX — and Flipfile writes every single one of
            them, locally, on your own machine.
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
                {jobs.map((job) => {
                  const targets = targetsFor(job.file, formats)
                  const groups = groupOutputs(job.outputs)
                  return (
                    <li key={job.id} className={`filerow is-${job.status}`}>
                      <span className="badge">
                        {extensionOf(job.file.name).toUpperCase() || 'FILE'}
                      </span>
                      <div className="filerow-main">
                        <span className="filerow-name" title={job.file.name}>
                          {job.file.name}
                        </span>
                        <span className="filerow-meta">
                          {formatBytes(job.file.size)}
                          <span className="sep">·</span>
                          {targets.length
                            ? targets.map((format) => FORMAT_LABEL[format]).join(' + ')
                            : 'no matching format'}
                          {job.status === 'done' && (
                            <>
                              <span className="sep">·</span>
                              <span className="ok">
                                {job.outputs.length} file
                                {job.outputs.length === 1 ? '' : 's'} ready
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
                        {job.status === 'working' && (
                          <span className="spinner" aria-label="Converting" />
                        )}
                        {groups.map((group) => (
                          <button
                            key={group.ext}
                            type="button"
                            className="chip-download"
                            onClick={() => saveGroup(job, group)}
                            title={
                              group.outputs.length === 1
                                ? `Download ${group.outputs[0].name}`
                                : `Download ${group.outputs.length} .${group.ext} files as a zip`
                            }
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
                            {group.ext.toUpperCase()}
                            {group.outputs.length > 1 ? ` ×${group.outputs.length}` : ''}
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
                  )
                })}
              </ul>
            )}
          </div>

          <aside className="card panel">
            <div className="field">
              <div className="label-row">
                <span className="label">Output formats</span>
                <div className="format-actions">
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={busy}
                    onClick={() => setFormats([...OUTPUT_FORMATS])}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="mini-btn"
                    disabled={busy || !formats.length}
                    onClick={() => setFormats([])}
                  >
                    None
                  </button>
                  <span className={`count-chip${formats.length ? ' is-live' : ''}`}>
                    {formats.length}/{OUTPUT_FORMATS.length}
                  </span>
                </div>
              </div>
              <div className="format-grid">
                {OUTPUT_FORMATS.map((format) => {
                  const on = formats.includes(format)
                  const usable = reachable.has(format)
                  const count = written.get(format) ?? 0
                  const isSettled = settled && count > 0
                  const label = FORMAT_LABEL[format]
                  return (
                    <button
                      key={format}
                      type="button"
                      aria-pressed={on}
                      className={`format-pill${on ? ' is-on' : ''}${usable ? '' : ' is-dim'}${
                        isSettled ? ' is-settled' : ''
                      }`}
                      title={
                        isSettled
                          ? `${count} ${label} file${count === 1 ? '' : 's'} already written — still ticked for the next run`
                          : undefined
                      }
                      onClick={() => toggleFormat(format)}
                    >
                      <span className="format-tick" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M5 12.6l4.3 4.3L19 7"
                            stroke="currentColor"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      <span className="format-head">
                        <span className="format-icon" aria-hidden="true">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {FORMAT_PATHS[format].map((d) => (
                              <path key={d} d={d} />
                            ))}
                          </svg>
                        </span>
                        <strong>{label}</strong>
                      </span>
                      <span className="format-note">
                        {isSettled
                          ? `${count} written`
                          : on && !usable
                            ? 'no file for this'
                            : FORMAT_NOTE[format]}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p
                className={`format-summary${formats.length ? '' : ' is-empty'}${
                  settled ? ' is-settled' : ''
                }`}
                aria-live="polite"
              >
                {!formats.length ? (
                  'Nothing selected — tick a format or hit All.'
                ) : settled ? (
                  <>
                    All done — <b>{outputs.length}</b> file{outputs.length === 1 ? '' : 's'} ready
                    to download.
                  </>
                ) : (
                  <>
                    Will write <b>{planned}</b> file{planned === 1 ? '' : 's'} in{' '}
                    <b>{formats.length}</b> format{formats.length === 1 ? '' : 's'}.
                  </>
                )}
              </p>
              <p className="hint">
                Each ticked format is written for every file that can reach it. Formats a file
                cannot reach are skipped, never faked.
              </p>
            </div>

            {formats.includes('pdf') && (
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
            )}

            {hasRaster && (
              <div className="field">
                <span className="label">Image resolution</span>
                <label className="select-row">
                  <span>PNG · JPG · WEBP</span>
                  <select
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                  >
                    <option value={1}>1× — smallest</option>
                    <option value={2}>2× — standard</option>
                    <option value={3}>3× — sharp</option>
                  </select>
                </label>
              </div>
            )}

            <button
              type="button"
              className="primary"
              disabled={busy || !todo.length || !formats.length}
              onClick={convert}
            >
              {busy
                ? 'Converting…'
                : !formats.length
                  ? 'Pick an output format'
                  : todo.length
                    ? `Convert ${todo.length} file${todo.length === 1 ? '' : 's'}`
                    : 'All files converted'}
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
              markdown, CSV, JSON, HTML and source files are typeset with real selectable text in
              a bundled Unicode font — Chinese, Japanese, Cyrillic and Greek stay readable — and
              wrapped across A4 pages.
            </p>
          </article>
          <article className="card">
            <h3>Out of a PDF</h3>
            <p>
              Tick PNG, JPG, WEBP, TXT and DOCX together and get all five: one image set per page
              at up to 3× resolution, the text layer as a searchable .txt, and the same text as a
              Word document with page breaks where the PDF pages ended.
            </p>
          </article>
          <article className="card">
            <h3>Nothing leaves the tab</h3>
            <p>
              Conversion runs on the WebAssembly, Canvas and zip engines inside your browser, so
              contracts, invoices and screenshots never touch a server — and one file can leave
              as many formats at once.
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
