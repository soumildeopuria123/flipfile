# Design

A dark workbench with one loud accent. Everything is driven by tokens at the top
of `src/styles.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#07070a` | page |
| `--panel` | `#0d0d12` | cards |
| `--line` | white 9% | borders |
| `--text` | `#f2f2f5` | body copy |
| `--muted` | `#8b8b9b` | secondary copy |
| `--accent` | `#c8f751` | actions, success |
| `--danger` | `#ff7b72` | errors |

The background carries two soft radial gradients (lime top-left, violet
top-right) so the page is not a flat rectangle. Cards use a subtle vertical
gradient and a 20 px radius; the primary button is the only element with a
shadow.

The layout is a two-column workbench (queue left, settings right) that collapses
to one column under 940 px, with a phone pass under 560 px.
