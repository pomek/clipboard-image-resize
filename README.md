# Clipboard Image Resize

Resize pasted screenshots in the browser and copy the resized image back to the clipboard.

## What it does

- Accepts pasted PNG and JPEG screenshots
- Previews the current screenshot on a canvas
- Copies the resized output back to the clipboard
- Saves recent screenshots in IndexedDB for quick reuse
- Supports `light`, `dark`, and `auto` theme modes

## Getting started

```bash
pnpm install
pnpm dev
```

Open the local Vite URL, paste a screenshot, pick a scale, and use the copy button when needed.

## Scripts

- `pnpm dev` - start the Vite dev server
- `pnpm build` - create a production build in `dist/`
- `pnpm preview` - preview the production build locally
- `pnpm test` - run Vitest unit tests
- `pnpm test:e2e` - run Playwright end-to-end tests
- `pnpm test:coverage` - run unit tests with coverage
- `pnpm gh-pages-deploy` - build and deploy to `gh-pages`

## Browser notes

- Clipboard image writing needs a secure context in supported browsers.
- Screenshot history is stored locally in IndexedDB and does not leave the browser.
- Theme preference and the last active screenshot are stored in local storage.

## Project layout

```text
src/
  app.js                  app bootstrap and orchestration
  main.js                 app entrypoint
  theme.js                theme controller
  observable/             lightweight observable helpers
  storage/                IndexedDB storage logic
  styles/                 app styles
  utils/                  image, UI, and helper utilities
e2e/                      Playwright end-to-end tests
```

## Testing

The project uses:

- Vitest for unit tests placed next to source files
- Playwright for end-to-end coverage of paste, persistence, copy, and theme flows

Run both suites before shipping changes:

```bash
pnpm test
pnpm test:e2e
pnpm build
```
