# Lynx — agent notes

## Project type
Obsidian community plugin. TypeScript source in `src/` is bundled by esbuild to `main.js`. Release artifacts: `main.js`, `manifest.json`, and `styles.css`.

## Build & check
- `npm install`
- `npm run dev` — esbuild watch, outputs `main.js` with inline sourcemap (`esbuild.config.mjs:38`).
- `npm run build` — runs `tsc -noEmit -skipLibCheck` then esbuild production (`package.json:9`). This is the exact CI step.
- `npm run lint` — ESLint flat config from `eslint.config.mts`; uses `eslint-plugin-obsidianmd` recommended rules. Ignores generated/config files (`eslint.config.mts:6-16`).

TypeScript only checks `src/**/*.ts` (`tsconfig.json:18`). Root `.mjs`/`.mts` files are not typechecked.

## Code style
- EditorConfig: tabs, indent 4, LF, single quotes, final newline (`.editorconfig:4-11`).
- `strict: true`, `noUncheckedIndexedAccess`, `isolatedModules`, target `ES2021` (`tsconfig.json:7-16`).
- Keep `src/main.ts` focused on lifecycle; split commands, settings, UI, and utilities into focused modules under `src/`.

## Architecture
- `src/main.ts` — `LynxPlugin`; registers the `lynx-links-view` view, the **"Open links view"** command, the settings tab, and event listeners for `file-open` (immediate refresh), `metadata-cache:changed` (live link preview while typing, debounced 250ms), and `vault:modify` (refresh on save, debounced). All refresh events are filtered to the active file only.
- `src/links-view.ts` — `ItemView` subclass that renders the right-sidebar links list and sort controls.
- `src/links-collector.ts` — builds the combined incoming/outgoing `LinkItem[]` list from Obsidian's metadata cache. Outgoing links include both body links (`cache.links`) and frontmatter links (`cache.frontmatterLinks`); each `LinkItem` carries `source: 'body' | 'frontmatter'` so future UI can distinguish them. Dedup is by lowercase path across both sources.
- `src/settings.ts` — settings interface, defaults, and the settings tab UI.

## Obsidian constraints
- `manifest.json:2` — plugin id is `lynx`. Never change the `id` after release.
- `manifest.json:5` — `minAppVersion` is `1.7.2` because the plugin uses `Workspace.openLinkText` and `Workspace.revealLeaf`; bump this if you adopt newer APIs, or `eslint-plugin-obsidianmd/no-unsupported-api` will fail the build.
- `isDesktopOnly` is `false` (`manifest.json:8`); avoid Node/Electron APIs.
- Do not bundle `obsidian`, codemirror, lezer, or node built-ins (`esbuild.config.mjs:19-34`).
- Incoming links rely on the undocumented `MetadataCache.getBacklinksForFile` internal API (`src/links-collector.ts:1-5, 54`). Treat it as a breaking-change risk.
- Do **not** call `detachLeavesOfType` in `onunload` (`src/main.ts:34`); `eslint-plugin-obsidianmd/detach-leaves` rejects it because it resets the user's leaf position.
- Use sentence case for all command names and settings UI strings (`obsidianmd/ui/sentence-case`).

## Version & release
- Update `minAppVersion` in `manifest.json` manually if API usage changes, then run `npm version patch|minor|major` (`.npmrc:1` suppresses the `v` prefix).
- The `version` script updates `manifest.json` and `versions.json` via `version-bump.mjs` and stages them (`package.json:10`).
- Push the tag. The release workflow (`release.yml`) builds, attests `main.js`/`styles.css`, and creates a **draft** GitHub release with assets `main.js`, `manifest.json`, `styles.css`.
- Tag must exactly equal `manifest.json` version.

## CI
- `lint.yml` runs `npm ci`, `npm run build`, `npm run lint` on Node 20/22/24 for every push and PR.
- There are no automated tests; verify with build + lint + manual install.

## Manual testing
- Copy `main.js`, `manifest.json`, and `styles.css` to `<vault>/.obsidian/plugins/lynx/`, reload Obsidian, enable in **Settings → Community plugins**.
- Run **"Open links view"** from the command palette and switch between notes to verify the list updates.

## Known lint warnings
- `obsidianmd/settings-tab/prefer-setting-definitions` — the settings tab uses the legacy imperative API. Adopting the declarative settings API (Obsidian 1.13+) would make settings searchable globally, but it is optional.

## LSP
- Requires `OPENCODE_EXPERIMENTAL=true` (or `OPENCODE_EXPERIMENTAL_LSP_TOOL=true`) in shell env — set in `~/.zshrc`.
- TypeScript LSP uses `typescript-language-server` (Homebrew, v5.3.0). Config in `opencode.jsonc` `lsp.typescript`.
- Tool name is `lsp` (not `lsp_diagnostics`). Operations: `goToDefinition`, `findReferences`, `hover`, `documentSymbol`, `workspaceSymbol`, `goToImplementation`, `prepareCallHierarchy`, `incomingCalls`, `outgoingCalls`.
- LSP server starts lazily when a `.ts` file is first read in the session.

## References
- `README.md` for first-time setup and detailed release steps.
- Obsidian docs: https://docs.obsidian.md
