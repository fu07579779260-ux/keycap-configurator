# Keycap Configurator

A web app for designing personalised, 3D-printable keyboard keycaps, and
exporting files a maker can print right away. One of three configurable
3D-printed products in our workshop project (with a perfume bottle and an
eyewear configurator). See [PLAN.md](PLAN.md) for the full brief.

**Choose a form → adjust parameters → preview → 3D print → install and test.**

**Live site:** https://fu07579779260-ux.github.io/keycap-configurator/

## What it does

- Six profiles (OEM, Cherry, SA, DSA, XDA, MT3) with rows, widths from 1u to 10u, stabiliser stems
- Five top forms: flat, concave (cylindrical / spherical dish), convex, angled, tactile (dot, bar, ring, texture)
- Legends: raised or engraved text (Chinese too), English Braille, 14 icons
- Switch mounts: Cherry MX, Kailh Choc V1 / V2, Alps, Topre, a custom cross, or your own uploaded base (STL / 3DM)
- Print settings per technology (FDM, SLA, SLS), printer presets, print checks
- Exports: STL (also one per colour), Rhino 3DM, PNG, PDF print sheet, ZIP of everything or of all five forms
- Wizard and expert modes, a Compare page, presets, save / share links / QR codes
- Finger fit: measure a fingertip from a photo (with a bank card for scale) or a 3D scan, and get a recommended shape
- Accessibility: keyboard control everywhere (3D views too), screen-reader labels, large text, high contrast,
  English voice feedback and a key tester; interface in English and Chinese

Everything runs in the browser: no account, no server, nothing uploaded.

## Run it on your computer

Needs [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Unit tests (geometry, exports, model, accessibility contrast) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Publish on GitHub Pages

1. Push this repository to GitHub.
2. On GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Every push to `main` then builds, tests and publishes the site to
   `https://<account>.github.io/<repository-name>/` (see `.github/workflows/deploy-pages.yml`).

The site loads no fonts, libraries or models from other servers (MediaPipe's hand model and runtime
are served from `public/mediapipe`), so it also works in mainland China.

## Tech stack

Vite · React · TypeScript · Tailwind CSS · shadcn/ui · React Three Fiber + drei · rhino3dm ·
manifold-3d (solid geometry) · MediaPipe Tasks Vision (finger fit) · jsPDF · JSZip · qrcode

## First print

See [docs/test-print.md](docs/test-print.md) for print settings and the fit-test checklist.
