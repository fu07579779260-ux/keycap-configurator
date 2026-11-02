# Keycap Configurator — Plan

## 1. Goal

A web app that lets people design a personalised, 3D-printable keyboard keycap
and leave with files that a maker can print right away.

The app shows the full personalisation flow for the workshop:

> select a form → adjust parameters → preview the model → 3D print →
> install and test on the keyboard → refine based on feedback

It is one of three configurable 3D-printed consumer products our team is
documenting. The other two are a perfume bottle configurator and an eyewear
configurator. This app focuses on how the shape of a keycap affects fingertip
contact, comfort and recognising a key by touch.

## 2. Users (in priority order)

1. **Makers / print operators.** They need correct, printable files and clear
   print instructions (material, settings, tolerances).
2. **Users with accessibility needs.** For example, people with visual
   impairments or limited hand mobility. They need tactile markers, Braille,
   comfortable shapes and an accessible interface.
3. **Workshop tutors and students.** They need to see the personalisation
   process clearly. Printing the results is a key part of the demo.
4. **General keyboard users.** They want a few custom keycaps for their own
   keyboard.

## 3. Inputs → Process → Outputs

**Inputs**
- Mounting stem type (preset, edited parameters or uploaded base model)
- Key size (u), profile and row
- Top form and its parameters
- Legend (none / text / Braille / icon)
- Print technology, printer preset, material and colour(s)
- Optional: fingertip photo or 3D scan, used for shape recommendation
- Optional: imported JSON configuration, shared link or preset

**Process**
1. Build the keycap body from the profile, row and key size.
2. Shape the top surface according to the chosen form.
3. Add the legend, Braille or tactile marker to the top surface.
4. Hollow the body to the wall thickness and add the stem (and stabiliser
   stems for keys ≥ 2u).
5. Apply technology-specific tolerances and check the design against the
   minimum feature sizes.
6. Show a live 3D preview with the chosen material, colour and translucency.

**Outputs**
- **STL** — print-ready mesh (one file per colour part when two colours are used)
- **3DM** — Rhino file with named layers per part
- **Print sheet (PDF)** — parameters, recommended material and settings,
  tolerance notes and a preview image
- **Preview image (PNG)** — for presentation slides
- **Export scope** — the user chooses **single keycap** or **set**
  (e.g. all five top forms, or every keycap in the comparison view), exported
  as a ZIP
- **JSON configuration**, **share link** and **QR code**

## 4. Parameters

Unless stated otherwise, lengths are in millimetres. 1u = 19.05 mm key pitch.

### 4.1 Mounting stem

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Stem type | enum | Cherry MX (and compatibles), Kailh Choc V1, Kailh Choc V2, Alps/Matias, Topre, Custom (parameters), Custom (uploaded model) | Cherry MX |
| Cross arm length (custom/MX) | mm | 3.80 – 4.40 | 4.10 |
| Cross arm width, horizontal | mm | 1.00 – 1.50 | 1.31 |
| Cross arm width, vertical | mm | 1.00 – 1.50 | 1.17 |
| Stem socket depth | mm | 3.0 – 4.5 | 3.8 |
| Stem outer diameter | mm | 5.0 – 6.0 | 5.5 |
| Fit tolerance | mm | −0.10 – +0.30 | set by technology (see §5) |
| Uploaded base model | file | STL or 3DM, ≤ 10 MB | — |

### 4.2 Size and profile

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Key width | u | 1.00 – 10.00, step 0.25 (presets: 1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 6.25, 7) | 1 |
| Profile | enum | OEM, Cherry, SA, DSA, XDA, MT3/KAT | Cherry |
| Row | enum | R1 – R4 (only for sculpted profiles: OEM, Cherry, SA, MT3/KAT) | R3 |
| Height override | mm | 4.0 – 16.0 (blank = profile value) | profile value |
| Wall thickness | mm | 0.8 – 2.5 (minimum set by technology) | 1.5 |
| Top edge fillet | mm | 0.2 – 2.0 | 0.8 |
| Stabiliser stems | toggle | auto for width ≥ 2u; spacing per standard (2u: 23.8, 6.25u: 100.0, 7u: 114.3) | on |

### 4.3 Top form

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Top form | enum | Flat, Concave, Convex, Angled, Tactile | Concave |
| Dish shape (Concave) | enum | Cylindrical, Spherical | profile default |
| Dish depth (Concave) | mm | 0.0 – 2.0 | 1.0 |
| Dome height (Convex) | mm | 0.0 – 2.0 | 0.8 |
| Slope angle (Angled) | ° | 0 – 15 | 6 |
| Slope direction (Angled) | enum | Front, Back, Left, Right | Front |
| Marker type (Tactile) | enum | Dot, Bar, Ring, Texture | Bar |
| Marker size (Tactile) | mm | 0.5 – 6.0 | 3.0 |
| Marker height (Tactile) | mm | 0.3 – 1.0 | 0.5 |
| Marker position X / Y (Tactile) | mm | −6.0 – +6.0 | 0 / −3.0 |

### 4.4 Legend (top surface only)

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Legend type | enum | None, Text, Braille, Icon | None |
| Text | string | 1 – 6 characters | — |
| Text mode | enum | Raised, Engraved | Engraved |
| Text size | mm | 2.0 – 8.0 | 4.0 |
| Text depth / height | mm | 0.3 – 1.0 | 0.5 |
| Braille source text | string | 1 – 3 characters (Grade 1, English) | — |
| Braille dot diameter | mm | 1.2 – 1.8 | 1.5 |
| Braille dot height | mm | 0.4 – 0.8 | 0.5 |
| Braille dot spacing | mm | 2.3 – 2.7 | 2.5 |
| Icon | enum | built-in library (Home, Esc, Enter, Backspace, arrows, Shift, Tab, Space, Mute, Volume…) | — |
| Legend offset X / Y | mm | −6.0 – +6.0 | 0 / 0 |

### 4.5 Manufacturing and appearance

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Technology | enum | FDM, SLA/DLP, SLS/MJF | SLA/DLP |
| Printer preset | enum | Generic (per technology); Bambu Lab X1/P1S, Prusa MK4 (FDM); Formlabs Form 3/4, Elegoo resin (SLA); Generic SLS service; user-saved presets | Generic |
| Material | enum | FDM: PLA, PETG, TPU · SLA: Standard, Tough, Clear resin · SLS: PA12 | per technology |
| Main colour | colour | any (hex) | #F2F2F0 |
| Second colour (legend/marker) | colour | any, or off | off |
| Translucency | % | 0 – 90 | 0 |

### 4.6 Finger-fit recommendation

| Name | Unit | Range / options | Default |
|---|---|---|---|
| Input | enum | Photo with reference card/coin, 3D scan upload (STL/OBJ/PLY) | Photo |
| Reference object | enum | ID-1 card (85.60 × 53.98 mm), coin (user enters diameter) | ID-1 card |
| Measured fingertip width | mm | 12 – 24 (editable after measurement) | — |
| Output | — | recommended profile, top form, dish depth and key height, each with a short reason | — |

## 5. Constraints

**Fit and safety**
- The keycap must not collide with neighbouring keys at 19.05 mm pitch.
  Warn if the top or the marker extends beyond the footprint.
- Total key height + stem height must clear the keyboard case.
  Warn if the height is above 16 mm.

**Technology defaults** (applied when the technology changes; the user can
override them)

| Technology | Fit tolerance | Min. wall | Min. legend stroke | Min. feature | Orientation hint |
|---|---|---|---|---|---|
| FDM | +0.15 mm | 1.2 mm | 0.8 mm | 0.4 mm | stem up, top on the bed; avoid supports in the stem |
| SLA/DLP | +0.05 mm | 0.8 mm | 0.3 mm | 0.3 mm | angled 30–45°, supports away from the top surface |
| SLS/MJF | +0.10 mm | 1.0 mm | 0.5 mm | 0.5 mm | no supports; add a powder drain note if enclosed |

**Validation**
- The app shows a warning (not a hard block) when a parameter breaks a
  minimum for the chosen technology.
- Braille dimensions show a warning when they fall outside common standard
  values.
- Two-colour export only works when the legend or marker is a separate solid.

**Platform and data**
- Fully static app: runs locally and on GitHub Pages, with no backend.
- All personal data (photos, scans, saved designs, printer presets) stays in
  the browser. Photos are processed on the device and never uploaded.
- Share links encode the full configuration in the URL. Uploaded models are
  not included in links; the user is warned when this happens.

**Accessibility**
- WCAG 2.1 AA as the baseline. Every control works by keyboard alone and has
  correct labels for screen readers.
- Large text mode and high-contrast mode.
- English voice feedback (Web Speech API), **on by default** with a visible
  toggle to switch it off. It reads:
  1. physical keys the user presses (e.g. “Escape”), to test installed keycaps;
  2. the focused control and its value (e.g. “Dish depth, 1.2 millimetres”);
  3. the legend of the selected keycap.

## 6. Tech stack

**Core (fixed; do not change without asking):**
- Vite + React + TypeScript + Tailwind CSS
- UI components: shadcn/ui
- 3D: React Three Fiber + drei
- Rhino export: rhino3dm

**Additions (agreed during the interview):**
- `@mediapipe/tasks-vision` (Hand Landmarker) — fingertip measurement from photos
- `jspdf` — print sheet PDF
- `qrcode` — QR codes for share links
- `jszip` — set export as ZIP
- `manifold-3d` (WASM) — boolean operations for hollowing, the stem,
  engraved legends and two-colour splitting

**Built in-house (no extra library):**
- Braille Grade 1 lookup table
- English/Chinese UI strings (simple dictionary + language context)
- Speech through the browser's Web Speech API
- STL export through three.js `STLExporter`

## 7. Pages

The app uses hash routing so that it works on GitHub Pages.

| Route | Page | Purpose |
|---|---|---|
| `#/` | Home | Short intro to the project, the five top forms and the personalisation flow; start buttons |
| `#/configure` | Configurator | **Wizard mode** (default): Stem → Size & profile → Top form → Legend/marker → Material & print → Export. **Expert mode**: all panels on one page beside the 3D preview. A mode switch is always visible. |
| `#/compare` | Compare | Several keycaps side by side in one 3D scene (e.g. all five forms); add the current design, remove items, export the set |
| `#/finger-fit` | Finger fit | Photo or 3D scan input → measurement → recommendation → “Apply to design” |
| `#/presets` | Preset library | Built-in example designs (e.g. “Braille Home key”, “XDA concave 1u”, “Tactile F/J pair”) and user-saved designs |
| `#/settings` | Settings | Language (EN default / 中文), large text, high contrast, voice on/off, saved printer presets, **Reset current design**, **Clear all local data** (with confirmation) |

**Visual style:** minimal industrial look with a light background, thin black
lines and technical-drawing details (dimension lines, grid, monospace numbers).
It must look clearly different from the earlier vase configurator.

## 8. Out of scope

- Whole-keyboard design (case, PCB, layout editor)
- User accounts, login and cloud storage
- Sending jobs directly to printers
- Online ordering and payment
- Slicing / G-code generation
- Decoration beyond the top surface (side legends, full-surface texture maps)
- Non-rectangular keycaps (ISO Enter, stepped Caps Lock)

## 9. Build order

Each step should run and be checked in the browser before the next one starts.

1. **Scaffold.** Vite + React + TS, Tailwind, shadcn/ui, hash router and
   empty pages. Set up git and push to a new `keycap-configurator` repo.
2. **Design tokens and layout.** Industrial theme, app shell, navigation and
   EN/中文 string dictionary.
3. **State model.** Typed `KeycapConfig` with defaults and ranges taken from
   §4, plus a reducer and URL/JSON (de)serialisation.
4. **3D viewport.** R3F canvas, camera, grid and lighting; show a placeholder box.
5. **Body geometry.** 1u keycap body from the profile, row, height and fillet
   (start with DSA, then add the other profiles).
6. **Key sizes.** Variable width (u) and stabiliser stem placement.
7. **Top forms.** Flat, Concave (cylindrical/spherical), Convex and Angled.
8. **Hollowing and stems.** Wall thickness, Cherry MX stem, then Choc V1/V2,
   Alps and Topre, then custom stem parameters.
9. **STL export (single keycap)** and a first test print of a 1u MX key.
10. **Tactile markers.** Dot, bar, ring and texture with size, height and position.
11. **Legends.** Raised/engraved text, then Braille, then the icon library.
12. **Manufacturing panel.** Technology, printer presets, materials and colours;
    apply technology defaults; validation warnings.
13. **Two-colour and translucency.** Split legend/marker into a second solid and
    preview materials.
14. **Wizard and expert modes** with the mode switch.
15. **More exports.** 3DM via rhino3dm, PNG preview, PDF print sheet, and
    single/set export as ZIP.
16. **Compare page.** Side-by-side scene and set export.
17. **Save and share.** Local autosave, JSON import/export, share link, QR code,
    preset library, and the Reset / Clear-all buttons.
18. **Uploaded custom base model.** Import STL/3DM and merge it with the
    generated top.
19. **Accessibility pass.** Keyboard navigation, ARIA labels, large text, high
    contrast.
20. **Voice feedback.** Physical keys, focused controls, selected legend; on by
    default with a toggle.
21. **Finger fit.** Photo + reference card measurement with MediaPipe, 3D scan
    upload, recommendation rules, and “Apply to design”.
22. **Print validation.** Print all five forms with each technology available;
    adjust default tolerances based on the results.
23. **Deploy.** GitHub Pages workflow; check local `npm run dev` and the
    production build.
