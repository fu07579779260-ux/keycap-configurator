# First test print: 1u Cherry MX keycap

Goal: check that an exported keycap prints cleanly and fits a real MX
switch before tuning the other forms (PLAN.md build steps 9 and 22).

## 1. Export

1. Open **Configure**. Keep the defaults: Cherry profile, R3, 1u,
   Concave top, Cherry MX mount, wall 1.5 mm.
2. Set **Fit tolerance** for your printer (the default follows the
   technology: SLA +0.05, SLS +0.10, FDM +0.15 mm).
3. Click **Download STL**. The file is named
   `keycap-cherry-r3-1u-concave-mx.stl`.

The STL is in millimetres, Z up, with the base at z = 0.

## 2. Print settings to start from

| Technology | Orientation | Layer | Supports | Notes |
|---|---|---|---|---|
| SLA / DLP | Tilt 30–45°, top facing up and away from the plate | 0.05 mm | Light, on the side walls only, never on the top surface or inside the cross | Wash and cure before testing the fit; resin shrinks slightly when cured |
| FDM | Top face down on the plate, stem up | 0.12 mm or finer, 0.4 mm nozzle | None needed | Use 3+ walls so the stem is solid; first-layer squish makes the top slightly larger |
| SLS / MJF | Any; the service decides | Service default | None | Allow for powder removal from the cross |

To save time and material, print **three copies at once with different
tolerances**: export the same design at 0.00, +0.10 and +0.20 mm (FDM:
+0.10, +0.15, +0.25). Mark them with a scratch or a dot of marker.

## 3. Check

| Check | Pass when |
|---|---|
| Outer size | Base measures 18.0 × 18.0 mm (±0.2) with calipers |
| Height | About 7.2 mm at the highest edge, 6.4 mm at the centre of the dish |
| Dish | Smooth, no visible layer steps across the middle (resin) |
| Stem fit | Pushes onto an MX switch by hand, does not wobble, and comes off with a keycap puller without cracking |
| Neighbours | On a keyboard, the cap doesn't touch the keys next to it when pressed |
| Typing | Key returns fully; no scraping sound |

## 4. Record the result

| Date | Printer | Material | Tolerance | Fit (tight / good / loose) | Notes |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |
| | | | | | |

Send the best tolerance back into the app's printer presets (build
step 12) so the next keycaps use it by default.
