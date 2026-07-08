# Obsidian plugin — agent notes

## Project type
Obsidian community plugin. TypeScript source in `src/` is bundled by esbuild to `main.js`. Release artifacts: `main.js`, `manifest.json`, and `styles.css` if used.

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

## Obsidian constraints
- `manifest.json` still has `id: sample-plugin` (`manifest.json:2`) — rename before release. Never change `id` after release.
- `isDesktopOnly` is `false` (`manifest.json:10`); avoid Node/Electron APIs.
- Do not bundle `obsidian`, codemirror, lezer, or node built-ins (`esbuild.config.mjs:19-34`).
- Register commands/settings/listeners through Obsidian helpers; clean up any manual resources in `onunload`.

## Version & release
- Update `minAppVersion` in `manifest.json` manually, then run `npm version patch|minor|major` (`.npmrc:1` suppresses the `v` prefix).
- The `version` script updates `manifest.json` and `versions.json` via `version-bump.mjs` and stages them (`package.json:10`).
- Push the tag. The release workflow (`release.yml`) builds, attests `main.js`/`styles.css`, and creates a **draft** GitHub release with assets `main.js`, `manifest.json`, `styles.css`.
- Tag must exactly equal `manifest.json` version.

## CI
- `lint.yml` runs `npm ci`, `npm run build`, `npm run lint` on Node 20/22/24 for every push and PR.
- There are no automated tests; verify with build + lint + manual install.

## Manual testing
- Copy `main.js`, `manifest.json`, and `styles.css` to `<vault>/.obsidian/plugins/<plugin-id>/`, reload Obsidian, enable in **Settings → Community plugins**.

## References
- `README.md` for first-time setup and detailed release steps.
- Obsidian docs: https://docs.obsidian.md
