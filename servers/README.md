# Server Packs

Everything specific to one RP server lives in its own folder here. The app reads it through
`servers/index.ts` (`getActivePack()` / `useServerPack()`), so no server content should be
hardcoded in components.

```
servers/<server-id>/
  server.json        name, default department, rules (arrest timer length)
  departments.json   departments officers can pick (id, full name, icon)
  commands.json      bodycam/SOP command categories + inter-department radio channels
  presets.json       weapon loadouts, charge templates, shift event types
  legislation.json   law source files, their format, names and versions
  sources/           the raw law files (Google Sheets exports, CSV/XLSX, JSON)
```

Laws are compiled into `public/servers/<server-id>/laws.json` by `npm run import-laws` and loaded on demand.
Run `npm run check-packs` before publishing. Step-by-step instructions: [CONTRIBUTING.md](../CONTRIBUTING.md).

The shapes are defined in [`types.ts`](./types.ts).

## Placeholders

Command text, labels, category names and palette titles can use:

| Placeholder | Filled with |
|---|---|
| `{dept}` | The officer's active department id, e.g. `LSPD` |

## Commands

- `categories[].expanded: true` opens the category by default on the commands page.
- `categories[].showOnPage: false` keeps a category out of the page (palette-only commands).
- A command with a `palette` block also shows up in the Ctrl+K palette. `palette.text` overrides
  what gets copied from the palette (e.g. several lines at once).
- `radio[].hideForDepartment` hides a channel when that department is active (you don't radio yourself).

## Legislation

`sources[]` lists the input files (relative to the pack folder) and their `format`:

| Format | Input |
|---|---|
| `gsheet-html` | Google Sheets → Download → Web page (.html) |
| `table` | CSV or XLSX with a header row (`code`, `description`, `fine`, `sentence`, `stars`, `bail`, `remarks`, `category`) |
| `json` | An array of entries already in the laws.json format |

After changing sources, run `npm run import-laws -- <server-id>` and change `corpusHash`, so cached AI search data is rebuilt.
Admins without a dev setup can use the in-app **Law Importer** (`/tools/law-importer`).

## Feature switches

`server.json` → `features` can turn optional parts of the app off (anything missing is on):

| Feature | What it controls |
|---|---|
| `arrestTimer` | Arrest countdown in the Arrest Command Center and the detention banner |
| `lawyerPause` | "Asked for lawyer" pause/resume on that timer |
| `legalAssistant` | AI legislation assistant (sidebar, Ctrl+K, law guide, profile) |

## Choosing a server and keeping data apart

Officers pick their server in onboarding or on the Profile page. The choice is saved in the
`leogrp_server` cookie so the very first render already uses the right pack; switching reloads the app.

Each server has its own profile, shifts, arrests, fines, notes and custom presets
(`servers/storage.ts`). The default server (`grandrp-en3`) keeps the original storage names, so
existing data is untouched; other servers use `srv:<id>:`-prefixed keys and their own IndexedDB database.

## Adding a server

1. Copy `generic/` (or `grandrp-en3/`) to a new folder named after the server id and edit the files.
2. Put law files in `sources/`, list them in `legislation.json`, and run `npm run import-laws -- <server-id>`.
3. Import its five files in `servers/registry.ts` and add the pack to `SERVER_PACKS`.
4. Run `npm run check-packs` and `npx tsc --noEmit`.
