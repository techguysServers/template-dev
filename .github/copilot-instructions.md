# Copilot instructions

Model target: claude-sonnet-4-6 (or equivalent). Execute, don't over-engineer.

## Stack

Next.js 16 · React 19 · TypeScript strict · Tailwind CSS v4 · Shadcn/ui · Prettier · ESLint

## Architecture

- Component-first. Every `app/**/page.tsx` is a thin shell; all UI is in `components/<page-name>/`.
- `components/ui/` = Shadcn primitives — never modified directly.
- `components/shared/` = cross-page reusables.
- `hooks/` = custom hooks when logic > ~15 lines.
- Server Components by default. `"use client"` only when strictly needed.

## TypeScript

- `strict: true`. No `any`. Props as named `interface`s with `Props` suffix.
- Use `cn()` from `@/lib/utils` for class merging.

## Styling

- All design tokens in `app/globals.css` CSS variables. Never hardcode hex/px.
- Dark mode via `next-themes` + `ThemeProvider`.

## Quality (must all pass)

```bash
npm run typecheck && npm run lint && npm run format && npm run build
```

## Commits

Conventional Commits: `type(scope): message`
Types: feat | fix | chore | refactor | perf | docs | style | test | ci | revert

## Git flow

- `main` ← PR from dev (stable, CI required)
- `dev` ← PR from feat/* branches
- `feat/<slug>` ← one feature per branch
- `dev-config` ← config-only changes, from dev

## A11y & SEO

- WCAG 2.1 AA. Semantic HTML. Alt on images. One `<h1>` per page.
- Every page exports `metadata` or `generateMetadata`.

## Do not

- Push directly to `main` or `dev`
- Leave `console.log` in committed code
- Use inline styles or hardcoded colors
- Create files that aren't required for the task
