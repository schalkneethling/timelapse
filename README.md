# Timelapse

**Timelapse** is a progressive web app that shows how much of the **current day, week (ISO, with week number), month, quarter, and year** has elapsed — as percentages with a retro dot-matrix style board.

Built with **[Vite+](https://viteplus.dev)** (Vite toolchain), **[Lit](https://lit.dev)** web components (**Light DOM**), HTML, CSS, and JavaScript.

## Inspiration

The basic idea, look and feel are inspired by **[Finite by Srizan](https://playground.nothing.tech/detail/app/Ym0wYycapdPGCUPJ)** on [Nothing Tech’s Playground](https://playground.nothing.tech/).

## Accessibility

Palette and borders aim for **WCAG 2.2 AA**: primary and secondary text colors are chosen for at least **4.5:1** contrast on the page and card backgrounds; focus rings and control outlines target **3:1** non-text contrast where applicable. Layout transitions honor **`prefers-reduced-motion`**.

## Features

- Live-updating rows with dot progress bars and numeric percentages
- **Settings** dialog: toggle which periods appear; pick a **time zone** (or use the device default). All interval math uses the selected IANA zone
- **Accessibility**: skip link, semantic structure, `role="progressbar"` with `aria-valuenow`, descriptive `aria-live` text per row, keyboard-friendly native `<dialog>` (Tab / Escape)

## Progressive Web App (PWA)

Implemented today (via **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** / Workbox **`generateSW`**):

- **Web app manifest** — `public/site.webmanifest` (linked from `index.html`): name, `start_url`, `scope`, `display: standalone`, icons, theme/background colors (supports installability where the browser allows it).
- **Service worker registration** — `registerSW` from `virtual:pwa-register` with **`registerType: "autoUpdate"`** and **`immediate: true`**.
- **Precaching** — shell assets (`index.html`, JS/CSS bundles) plus static files listed in `includeAssets` (favicons, manifest, PWA PNGs).
- **Navigation fallback** — document navigations are served **`index.html`** so client routing still works when offline or on hard refresh (SPA-style).
- **Activation** — **`skipWaiting`** and **`clientsClaim`** so a new worker can take over promptly.
- **Cache cleanup** — **`cleanupOutdatedCaches`** removes stale precache entries after updates.

Not implemented: push notifications, background sync, share targets, or a custom in-app “install” banner.

## Social sharing

`index.html` includes **Open Graph** and **Twitter / X** (`summary_large_image`) meta tags. The preview image path is **`/timelapse-social-share.png`** — add that file under **`public/`** after you merge (recommended **1200×630** PNG). Crawlers resolve relative image URLs against the page URL; if you deploy under a subpath, set `base` in Vite and use the same path prefix for `og:image` / `twitter:image`, or switch those tags to an absolute production URL (and optional `og:url`).

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

Production builds emit the service worker above. With `pnpm dev`, registration and caching can differ from `pnpm build` / `pnpm preview`.
