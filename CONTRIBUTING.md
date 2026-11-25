# Adding your RP server

This toolkit works for any GTA RP server. Everything specific to a server (departments, bodycam and
radio commands, loadouts, laws, arrest rules) lives in a **server pack**, so adding a server means
adding data, not changing code.

There are two ways to get your server in.

## Option A: no coding (server admins)

1. Open the app and go to **Law Importer** (Ctrl+K → "Law Importer", or the link on the Profile page).
2. Add your law sheets:
   - **Google Sheets:** File → Download → Web page (.html). Codes must look like `P.C. 2.1.1`, `T.C. 3-1` or `§ 4`.
   - **Any spreadsheet:** CSV or XLSX with a header row: `code, description, fine, sentence, stars, bail, remarks, category`
     (only `code` and `description` are required). The importer has a template you can download.
3. Check the preview and fix any warnings, then click **Download laws.json**.
4. Open an issue on the project's GitHub repository with:
   - your server's name and the departments officers can join (short id + full name, e.g. `LSPD — Los Santos Police Department`)
   - your bodycam / RP commands and radio phrases (plain text is fine)
   - the downloaded `laws.json` and your original sheet files
   - any rules that differ: arrest timer length, whether suspects can pause the timer for a lawyer

A maintainer turns that into a pack.

## Option B: make the pack yourself (pull request)

Needs Node.js 22.18 or newer.

1. **Copy the template:** copy `servers/generic/` to `servers/<your-server-id>/` (lowercase, dashes, e.g. `eclipse-rp`).
2. **Edit the five files.** The format is documented in [`servers/README.md`](servers/README.md) and typed in [`servers/types.ts`](servers/types.ts).
   - `server.json`: `id` must match the folder name. Set the default department, arrest timer and `features`.
   - `departments.json`: the departments officers can pick.
   - `commands.json`: bodycam/SOP command categories and radio channels. Use `{dept}` wherever the officer's department belongs.
   - `presets.json`: weapon loadouts, charge templates, shift event types.
   - `legislation.json`: your law source files and how to label them.
3. **Add your laws:** put your sheet exports in `servers/<id>/sources/`, list them in `legislation.json` → `sources`, then run:

   ```bash
   npm run import-laws -- <your-server-id>
   ```

   This writes `public/servers/<id>/laws.json`. Re-run it whenever your laws change, and change `corpusHash`
   in `legislation.json` so the AI assistant rebuilds its search data.
4. **Register the pack** in [`servers/registry.ts`](servers/registry.ts): import its five JSON files and add it to `SERVER_PACKS`.
5. **Check it:**

   ```bash
   npm run check-packs
   ```

   ```bash
   npx tsc --noEmit
   ```

6. Run `npm run dev`, pick your server on the Profile page, and click through Commands, Legislation and the Arrest Command Center.
7. Open a pull request.

## Ground rules

- Only add content your server allows to be shared (most servers publish their laws and SOPs publicly).
- Keep commands generic enough for any officer on that server; personal macros belong in the app's own shortcuts.
- Don't change another server's pack without that server's staff agreeing to it.
