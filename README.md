# There is still time

A progressive web app that shows how much of the **current day, week (ISO, with week number), month, quarter, and year** has elapsed — as percentages with a retro dot-matrix style board.

Built with **[Vite+](https://viteplus.dev)** (Vite toolchain), **[Lit](https://lit.dev)** web components (**Light DOM**), HTML, CSS, and JavaScript.

## Inspiration

The look and feel are inspired by **[Finite Nothing](https://playground.nothing.tech/detail/app/Ym0wYycapdPGCUPJ)** on [Nothing Tech’s Playground](https://playground.nothing.tech/).

## Accessibility

Palette and borders aim for **WCAG 2.2 AA**: primary and secondary text colors are chosen for at least **4.5:1** contrast on the page and card backgrounds; focus rings and control outlines target **3:1** non-text contrast where applicable.

## Features

- Live-updating rows with dot progress bars and numeric percentages
- **Settings** dialog: toggle which periods appear; pick a **time zone** (or use the device default). All interval math uses the selected IANA zone
- **Accessibility**: skip link, semantic structure, `role="progressbar"` with `aria-valuenow`, descriptive `aria-live` text per row, keyboard-friendly native `<dialog>` (Tab / Escape)

## Scripts

| Command          | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| `pnpm dev`       | Start dev server                                                    |
| `pnpm build`     | Production build                                                    |
| `pnpm preview`   | Preview `dist`                                                      |
| `pnpm typecheck` | `tsc --noEmit` — JS with **JSDoc** and `// @ts-check`               |
| `pnpm check`     | **Vite+** (`vp check`) + `pnpm typecheck` + **Stylelint** (`*.css`) |
| `pnpm check:fix` | Stylelint `--fix`, then `vp check --fix`                            |

## Development

```bash
pnpm install
pnpm dev
```

The service worker is generated in production builds (`pnpm build`); in dev, PWA registration still runs but caching behavior differs.
