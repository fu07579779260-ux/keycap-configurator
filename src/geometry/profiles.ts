import type { DishShape, Profile, Row } from '@/model/options'

/**
 * Keycap profile shapes. Values are approximations of the published
 * profiles, good enough to compare forms; build step 22 tunes them
 * against printed samples.
 *
 * Coordinates: x = width, y = towards the back of the keyboard, z = up.
 * Height is measured at the centre of the top. A positive tilt raises the
 * back edge, so the top faces the typist (number row); negative tilts the
 * other way (bottom row).
 */
export interface ProfileShape {
  /** Bottom footprint minus top width/depth, in mm (kept constant for wider keys). */
  topInsetX: number
  topInsetY: number
  /** Top centre moved towards the back, in mm. */
  topSkew: number
  bottomCornerRadius: number
  topCornerRadius: number
  /** Dish used when the user leaves dish shape on "auto". */
  dish: Exclude<DishShape, 'auto'>
  rows: Record<Row, { height: number; tilt: number }>
}

const flat = (height: number) => ({
  R1: { height, tilt: 0 },
  R2: { height, tilt: 0 },
  R3: { height, tilt: 0 },
  R4: { height, tilt: 0 },
})

export const PROFILE_SHAPES: Record<Profile, ProfileShape> = {
  oem: {
    topInsetX: 6.0, topInsetY: 4.0, topSkew: 1.75,
    bottomCornerRadius: 0.8, topCornerRadius: 1.8, dish: 'cylindrical',
    rows: {
      R1: { height: 11.2, tilt: 7 },
      R2: { height: 9.5, tilt: 3 },
      R3: { height: 9.0, tilt: 0 },
      R4: { height: 9.3, tilt: -5 },
    },
  },
  cherry: {
    topInsetX: 6.3, topInsetY: 3.7, topSkew: 2.0,
    bottomCornerRadius: 0.8, topCornerRadius: 1.6, dish: 'cylindrical',
    rows: {
      R1: { height: 9.4, tilt: 6 },
      R2: { height: 7.9, tilt: 3 },
      R3: { height: 7.4, tilt: 0 },
      R4: { height: 7.9, tilt: -6 },
    },
  },
  sa: {
    topInsetX: 5.3, topInsetY: 5.3, topSkew: 0,
    bottomCornerRadius: 1.2, topCornerRadius: 3.0, dish: 'spherical',
    rows: {
      R1: { height: 14.9, tilt: 13 },
      R2: { height: 12.9, tilt: 7 },
      R3: { height: 12.9, tilt: 0 },
      R4: { height: 14.9, tilt: -13 },
    },
  },
  dsa: {
    topInsetX: 5.3, topInsetY: 5.3, topSkew: 0,
    bottomCornerRadius: 1.0, topCornerRadius: 2.5, dish: 'spherical',
    rows: flat(7.6),
  },
  xda: {
    topInsetX: 4.0, topInsetY: 4.0, topSkew: 0,
    bottomCornerRadius: 1.0, topCornerRadius: 2.5, dish: 'spherical',
    rows: flat(9.1),
  },
  mt3: {
    topInsetX: 5.7, topInsetY: 5.2, topSkew: 1.0,
    bottomCornerRadius: 1.2, topCornerRadius: 2.8, dish: 'spherical',
    rows: {
      R1: { height: 13.6, tilt: 10 },
      R2: { height: 11.3, tilt: 5 },
      R3: { height: 10.7, tilt: 0 },
      R4: { height: 11.5, tilt: -6 },
    },
  },
}
