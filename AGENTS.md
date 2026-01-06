# AGENTS

## Purpose
- This file guides agentic coding tools working in this repo.
- Prefer small, targeted changes and avoid large refactors unless requested.

## Repo layout
- Root is an orchestration repo (Docker Compose + scripts).
- cont-portal is the in-tree React + TypeScript frontend.
- cont-portal is a nested git repo with its own dependencies and tooling.
- Other services (cont-nginx, cont-guardias, cont-empa, cont-reportespiolis, cont-monitor-recursos) are expected to be cloned by `node setup.js`.
- Some services may be missing until setup is run.
- Logs live in `logs/`; do not edit or commit them.

## Root commands (servicios-telecom)
- Initial clone/setup: `node setup.js`
- Update all repos: `node actualizar.js`
- Start services: `docker-compose up --build -d`
- Stop services: `docker-compose down`
- Restart services: `docker-compose restart`
- Logs (all): `docker-compose logs -f`
- Logs (nginx): `docker-compose logs -f nginx`
- Logs (portal): `docker-compose logs -f portal-servicios`
- Status: `docker-compose ps`

## Frontend commands (cont-portal)
- Install deps: `npm install` (uses `package-lock.json`)
- Dev server: `npm run dev` (Vite)
- Build: `npm run build` (tsc -b + Vite build)
- Lint: `npm run lint` (ESLint)
- Preview build: `npm run preview`

## Versions
- React 19.x, Vite 7.x, TypeScript 5.9.x, Tailwind 4.x (see `cont-portal/package.json`).
- Node 20 is used in Docker builds (`cont-portal/Dockerfile`).
- ESLint 9 with typescript-eslint and React Hooks plugins.

## Tests
- No test runner or npm test script is configured in `cont-portal/package.json`.
- There is currently no supported single-test command.
- If tests are added, document the full suite command, single file command, and single test name/grep command.
- Confirm with maintainers before introducing a new test stack.

## Tooling config references
- `cont-portal/eslint.config.js` (ESLint 9 flat config)
- `cont-portal/tsconfig.app.json` and `cont-portal/tsconfig.node.json`
- `cont-portal/vite.config.ts` (manual chunking)
- `cont-portal/tailwind.config.js` and `cont-portal/src/index.css`
- `cont-portal/components.json` (shadcn/ui settings)

## TypeScript rules
- TS is strict: handle `null`/`undefined` explicitly.
- Avoid `any`; prefer precise types and type guards.
- Use `import type` for type-only imports (verbatimModuleSyntax).
- Do not rely on unused locals or parameters; TS flags them.
- Side-effect imports are discouraged (`noUncheckedSideEffectImports`).

## React patterns
- Function components and hooks only; no class components.
- Follow React Hooks rules and linting.
- Keep hooks at top level; avoid conditional hook calls.
- Use `useMemo`/`useCallback` for expensive computations (see `useInternalDirectory`).
- Keep user-visible strings in Spanish unless requested otherwise.

## Imports and modules
- Use ES module syntax everywhere.
- Prefer `@/` alias for `src/*` imports.
- Keep relative imports for same-folder modules.
- Avoid reordering import groups just for style.
- Match the local file's quote and semicolon style.
- If you change aliases, update both `tsconfig` and `vite.config.ts`.

## Formatting and linting
- No Prettier config present; do not run auto-formatters.
- Keep existing indentation and line breaks in a file.
- Avoid sweeping style-only changes.
- Run `npm run lint` in `cont-portal` before final changes when asked.

## Naming and organization
- Components: PascalCase file and export names.
- Hooks: `useX` camelCase.
- Types/interfaces: PascalCase.
- Local constants: camelCase; module constants: UPPER_SNAKE.
- Place UI primitives in `src/components/ui`.
- Place shared logic in `src/lib` and hooks in `src/hooks`.
- Put new data types in `src/types`.

## UI and CSS (Tailwind)
- Tailwind is enabled via `@import "tailwindcss";` in `src/index.css`.
- Theme tokens are CSS variables; prefer them over hardcoded colors.
- Use `useThemeClasses` for theme-aware class sets.
- Utility helper: `cn` in `src/lib/utils.ts`.
- Keep custom classes like `gradient-background` and animation helpers intact.
- Custom scrollbar styles and gradient rules live in `src/index.css`.
- Avoid removing the dark/light theme variables or gradient definitions.
- Prefer CSS variables for new colors to keep theme parity.

## shadcn/ui components
- Components live in `src/components/ui`.
- Style is `new-york` with `baseColor: zinc`.
- Use `components.json` aliases (`components`, `ui`, `lib`, `hooks`).
- When adding shadcn components, follow existing patterns and paths.

## Error handling and UX
- Convert technical errors into user-friendly Spanish messages.
- Track retryable vs non-retryable errors (see `useInternalDirectory`).
- Use `try/catch/finally` around async loads; always clear loading state.
- Ignore errors only when UX explicitly requires it (e.g., logout).
- Prefer showing retry buttons or safe fallbacks over silent failure.

## Performance and bundling
- Heavy deps should be lazy loaded when possible (xlsx is dynamic).
- `vite.config.ts` splits chunks for react, ui, xlsx, forms.
- Update manual chunking when adding large dependencies.
- Keep search and list operations memoized where needed.

## Docker and deployment
- `cont-portal/Dockerfile` builds with `npm ci` and serves via nginx.
- SPA routing is handled by `cont-portal/nginx.conf`.
- Health checks are defined in `docker-compose.yml`.
- When changing ports or env vars, update `docker-compose.yml` and docs.

## Data and assets
- Static assets live in `cont-portal/public` and `cont-portal/src/assets`.
- Files in `public/` are served at the site root.
- The internal directory feature fetches `/internos.xlsx` at runtime.
- Validate and guard against invalid or HTML responses (see `useInternalDirectory`).
- Keep data parsing limits (e.g., `DIRECTORY_MAX_ROWS`) in mind.

## Secrets and environment
- `.env` files are created by `node setup.js` for some services.
- Do not commit `.env` or credentials.
- If you add new env vars, document them and update examples.
- Avoid logging secrets in `logs/` or console output.

## Localization and copy
- UI strings are Spanish; keep tone consistent.
- Add translations only if the product requires bilingual support.
- Avoid mixing English labels in Spanish-only screens.

## Cursor and Copilot rules
- No `.cursor/rules`, `.cursorrules`, or `.github/copilot-instructions.md` found.

## If you add new tooling
- Update `package.json` scripts and this file.
- Add minimal config files (ESLint/TS/Vitest/etc) and document them.
- Keep the repo consistent with existing npm usage.

## Contact points
- Root scripts to know: `setup.js`, `actualizar.js`, `docker-compose.yml`.
- Frontend entry points: `cont-portal/src/main.tsx` and `cont-portal/src/App.tsx`.
