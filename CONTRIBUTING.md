# Contributing

```bash
npm install
npm run dev        # downloads the fonts on first run
npm run typecheck  # tsc -b --noEmit
npm run build      # what CI runs
```

## Ground rules

- Keep conversion client-side. A pull request that uploads a file will not be
  merged.
- Errors thrown from `src/lib/*` must be readable sentences; the UI prints them
  verbatim.
- New file types belong in `types.ts` (`IMAGE_EXTENSIONS`, `directionFor`) and in
  the format list in the UI copy.
- Keep the CSS in `src/styles.css` and use the existing tokens rather than new
  hex values.

## Trying a change

Add the file to `samples/`, convert it in the browser, and check the output opens
in a PDF viewer. For PDF export, check the pixel size of the first page image.
