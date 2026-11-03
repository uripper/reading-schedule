# Third-Party Notices

Bartleby's own source code is licensed under the Zero-Clause BSD license
(`0BSD`); see `LICENSE`. The third-party material below keeps its own license.
Full license texts ship with the app in `packages/frontend/public/assets/licenses/`.

## Bundled fonts

Licensed under the SIL Open Font License, Version 1.1. Each font's license
file is `packages/frontend/public/assets/licenses/OFL-<family>.txt`.

| Family | Files | License file |
|---|---|---|
| Archivo (all widths) | `Archivo*`, `Archivo_*` | `OFL-archivo.txt` |
| Archivo Black | `ArchivoBlack*` | `OFL-archivoblack.txt` |
| Archivo Narrow | `ArchivoNarrow*` | `OFL-archivonarrow.txt` |
| Plus Jakarta Sans | `PlusJakartaSans*` | `OFL-plusjakartasans.txt` |
| Poor Story | `PoorStory*` | `OFL-poorstory.txt` |
| Poppins | `Poppins*` | `OFL-poppins.txt` |
| Space Grotesk | `SpaceGrotesk*` | `OFL-spacegrotesk.txt` |
| Space Mono | `SpaceMono*` | `OFL-spacemono.txt` |

## Icons

The book status icons in `packages/frontend/styles/books-card.css` are
Material Icons glyphs (`pause`, `play_arrow`, `check`, `close`) by Google,
licensed under the Apache License, Version 2.0
(`Apache-2.0-material-icons.txt`). Source:
https://github.com/google/material-design-icons

## Package dependencies

npm and Cargo dependencies keep the licenses declared in their own package
metadata. All of them allow use in permissively licensed software:

- Most are MIT, Apache-2.0, BSD, ISC, Zlib, Unicode-3.0, or dual-licensed
  among these.
- `lightningcss` (npm) and `cssparser`, `cssparser-macros`, `selectors`,
  `dtoa-short`, `option-ext` (Cargo) are MPL-2.0. MPL-2.0 is file-level
  copyleft: it covers those packages' own files only and does not affect
  Bartleby's license. Bartleby does not modify them.
- `node-forge` (`BSD-3-Clause OR GPL-2.0`) and `r-efi`
  (`MIT OR Apache-2.0 OR LGPL-2.1-or-later`) are used under their permissive
  options.

To re-audit, run `pnpm licenses list -r --prod` and
`cargo metadata --format-version 1` for each Cargo manifest.
