# PWA API Showcase

A React + Vite progressive web app that highlights browser support for installability, engagement, device, and system APIs on desktop and mobile browsers.

## What it does

- Inspects common PWA and browser APIs such as Service Worker, Push, Web Share, Clipboard, Wake Lock, NFC, Bluetooth, WebUSB, and more.
- Shows browser and device context including secure context state, viewport, screen size, connection hints, and notification permission.
- Includes quick interaction checks for install prompt, share sheet, clipboard copy, vibration, and notification permission.
- Ships with a web manifest, service worker, unit tests, and GitHub Actions workflows for CI and GitHub Pages deployment.

## Local development

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - start the Vite dev server
- `npm run lint` - run ESLint
- `npm run test` - run the unit test suite with Vitest
- `npm run build` - create a production build in `dist/`

## GitHub Pages deployment

The Vite base path automatically switches to the repository name during GitHub Actions builds, so this project is ready for repository-based GitHub Pages hosting.

After pushing to GitHub:

1. Make sure the default branch is `main`.
2. In **Settings -> Pages -> Build and deployment**, set the source to **GitHub Actions** if it is not already selected.
3. The `deploy.yml` workflow will publish the `dist/` output to GitHub Pages on pushes to `main`.
