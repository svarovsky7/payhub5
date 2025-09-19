# Repository Guidelines

## Project Structure & Module Organization
PayHub5 lives in `src/`, organized by domain-first folders. `src/services/` pairs Supabase CRUD, query, and hook layers; UI components sit in `src/components/` and feature scenes in `src/pages/`. Shared types and constants reside in `src/types/` and `src/constants/`. Static assets (logo, styles) stay under `public/` and `src/assets/`. Documentation and specs live in `docs/` and `.playwright-mcp/` (recorded traces, reference screenshots).

## Build, Test, and Development Commands
Run `npm run dev` for the Vite dev server on port 4000. `npm run build` performs TypeScript project builds plus the production bundle; `npm run preview` serves the built app locally. Quality gates: `npm run lint` (ESLint with zero warnings), `npm run format` (Prettier write), `npm run type-check` (strict TS compile). Use `npm run knip` to detect unused exports and dependencies; `npm run knip:fix` resolves trivial findings.

## Coding Style & Naming Conventions
We use TypeScript 5.8 with React 18. Keep imports path-alias-friendly and prefer named exports per domain. Follow Prettier defaults (`tabWidth` 2, single quotes, no semicolons, 100-char line width). Components, hooks, and services follow PascalCase (`InvoicesTable.tsx`); hooks use the `use` prefix, and files colocate styles as `.module.less` or `.css` when needed. Avoid direct Supabase calls inside components. Always go through the hook layer.

## Testing Guidelines
Automated coverage is evolving; add tests alongside features using Playwright or React Testing Library. Store Playwright artifacts under `.playwright-mcp/`. Name UI specs `<feature>.spec.ts` and hooks `<name>.test.ts`. Before opening a PR, run `npm run lint`, `npm run type-check`, and the relevant Playwright suites. Capture new traces when changing critical flows (invoice lifecycle, payments, auth).

## Commit & Pull Request Guidelines
Commits are short, imperative statements (existing history uses concise Russian verbs). Keep one logical change per commit and reference tickets with `[#id]` when available. PRs should summarize scope, list validation steps (commands run, screenshots for UI tweaks), and link Supabase or spec updates when relevant. Include edge-case notes for reviewers and call out any follow-up work.

## Environment & Security Notes
Secrets reside in `.env`; never commit credentials. Supabase access goes through the MCP proxy (`http://31.128.51.210:8002`). When testing locally, confirm role-based permissions in Supabase before seeding data. Review `supabase/schemas/prod.sql` for schema hints and keep migrations in sync with backend owners.
