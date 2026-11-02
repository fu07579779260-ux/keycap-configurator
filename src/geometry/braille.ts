/**
 * English Grade 1 (uncontracted) Braille. Dots are numbered 1–3 down the
 * left column and 4–6 down the right. Digits use the number sign followed
 * by the letters a–j. Letters are case-insensitive; other characters are
 * left out.
 */
const LETTERS: Record<string, number[]> = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5],
  f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4], j: [2, 4, 5],
  k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5],
  p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5],
  u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6],
}
const NUMBER_SIGN = [3, 4, 5, 6]
const DIGIT_LETTERS = 'jabcdefghi' // 0 → j, 1 → a, … 9 → i

/** Braille cells for a text; each cell lists its raised dots. */
export function brailleCells(text: string): number[][] {
  const cells: number[][] = []
  let inNumber = false
  for (const ch of text.toLowerCase()) {
    if (ch >= '0' && ch <= '9') {
      if (!inNumber) cells.push(NUMBER_SIGN)
      inNumber = true
      cells.push(LETTERS[DIGIT_LETTERS[Number(ch)]])
    } else {
      inNumber = false
      if (ch === ' ') cells.push([])
      else if (LETTERS[ch]) cells.push(LETTERS[ch])
    }
  }
  return cells
}

/** Distance between neighbouring cells relative to the dot spacing (6.2 mm for 2.5 mm dots). */
export const CELL_PITCH_FACTOR = 2.48

/** Dot centres in mm, centred on (0, 0): x to the right, y towards the back. */
export function brailleDots(text: string, dotSpacing: number): [number, number][] {
  const cells = brailleCells(text)
  const pitch = dotSpacing * CELL_PITCH_FACTOR
  const width = (cells.length - 1) * pitch + dotSpacing
  const dots: [number, number][] = []
  cells.forEach((dotsInCell, c) => {
    for (const d of dotsInCell) {
      const column = d <= 3 ? 0 : 1
      const row = (d - 1) % 3 // 0 = top (towards the back)
      dots.push([-width / 2 + c * pitch + column * dotSpacing, dotSpacing - row * dotSpacing])
    }
  })
  return dots
}

/** Overall width of the Braille text in mm (0 when empty). */
export function brailleWidth(text: string, dotSpacing: number): number {
  const n = brailleCells(text).length
  return n === 0 ? 0 : (n - 1) * dotSpacing * CELL_PITCH_FACTOR + dotSpacing
}
