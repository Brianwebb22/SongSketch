// Standard guitar tuning (low to high): E2 A2 D3 G3 B3 E4
// Indices in shape arrays match this low-to-high order.
//
// Each fret value is:
//   - a number ≥ 1: fretted at that fret
//   - 0: open string
//   - 'x': muted/not played

export type GuitarFretValue = number | 'x';

export interface GuitarShape {
  label: string;
  /** length 6, low-to-high (low E first) */
  frets: GuitarFretValue[];
}

// Keyed by exact chord name (case-sensitive). The first shape is the default.
const SHAPES: Record<string, GuitarShape[]> = {
  // Open major triads
  'C':   [{ label: 'Open',         frets: ['x', 3, 2, 0, 1, 0] }],
  'D':   [{ label: 'Open',         frets: ['x', 'x', 0, 2, 3, 2] },
          { label: 'Barre 5fr',    frets: ['x', 5, 7, 7, 7, 5] }],
  'E':   [{ label: 'Open',         frets: [0, 2, 2, 1, 0, 0] },
          { label: 'Barre 7fr',    frets: ['x', 7, 9, 9, 9, 7] }],
  'F':   [{ label: 'Barre 1fr',    frets: [1, 3, 3, 2, 1, 1] }],
  'G':   [{ label: 'Open',         frets: [3, 2, 0, 0, 0, 3] },
          { label: 'Barre 3fr',    frets: [3, 5, 5, 4, 3, 3] }],
  'A':   [{ label: 'Open',         frets: ['x', 0, 2, 2, 2, 0] },
          { label: 'Barre 5fr',    frets: [5, 7, 7, 6, 5, 5] }],
  'B':   [{ label: 'Barre 2fr',    frets: ['x', 2, 4, 4, 4, 2] },
          { label: 'Barre 7fr',    frets: [7, 9, 9, 8, 7, 7] }],

  // Sharp/flat majors (barre)
  'C#':  [{ label: 'Barre 4fr',    frets: ['x', 4, 6, 6, 6, 4] }],
  'Db':  [{ label: 'Barre 4fr',    frets: ['x', 4, 6, 6, 6, 4] }],
  'D#':  [{ label: 'Barre 6fr',    frets: ['x', 6, 8, 8, 8, 6] }],
  'Eb':  [{ label: 'Barre 6fr',    frets: ['x', 6, 8, 8, 8, 6] }],
  'F#':  [{ label: 'Barre 2fr',    frets: [2, 4, 4, 3, 2, 2] }],
  'Gb':  [{ label: 'Barre 2fr',    frets: [2, 4, 4, 3, 2, 2] }],
  'G#':  [{ label: 'Barre 4fr',    frets: [4, 6, 6, 5, 4, 4] }],
  'Ab':  [{ label: 'Barre 4fr',    frets: [4, 6, 6, 5, 4, 4] }],
  'A#':  [{ label: 'Barre 6fr',    frets: [6, 8, 8, 7, 6, 6] }],
  'Bb':  [{ label: 'Barre 1fr',    frets: ['x', 1, 3, 3, 3, 1] },
          { label: 'Barre 6fr (E shape)', frets: [6, 8, 8, 7, 6, 6] }],

  // Open minor triads
  'Cm':  [{ label: 'Barre 3fr',    frets: ['x', 3, 5, 5, 4, 3] }],
  'Dm':  [{ label: 'Open',         frets: ['x', 'x', 0, 2, 3, 1] }],
  'Em':  [{ label: 'Open',         frets: [0, 2, 2, 0, 0, 0] }],
  'Fm':  [{ label: 'Barre 1fr',    frets: [1, 3, 3, 1, 1, 1] }],
  'Gm':  [{ label: 'Barre 3fr',    frets: [3, 5, 5, 3, 3, 3] }],
  'Am':  [{ label: 'Open',         frets: ['x', 0, 2, 2, 1, 0] }],
  'Bm':  [{ label: 'Barre 2fr',    frets: ['x', 2, 4, 4, 3, 2] }],
  'C#m': [{ label: 'Barre 4fr',    frets: ['x', 4, 6, 6, 5, 4] }],
  'Dbm': [{ label: 'Barre 4fr',    frets: ['x', 4, 6, 6, 5, 4] }],
  'D#m': [{ label: 'Barre 6fr',    frets: ['x', 6, 8, 8, 7, 6] }],
  'Ebm': [{ label: 'Barre 6fr',    frets: ['x', 6, 8, 8, 7, 6] }],
  'F#m': [{ label: 'Barre 2fr',    frets: [2, 4, 4, 2, 2, 2] }],
  'Gbm': [{ label: 'Barre 2fr',    frets: [2, 4, 4, 2, 2, 2] }],
  'G#m': [{ label: 'Barre 4fr',    frets: [4, 6, 6, 4, 4, 4] }],
  'Abm': [{ label: 'Barre 4fr',    frets: [4, 6, 6, 4, 4, 4] }],
  'A#m': [{ label: 'Barre 6fr',    frets: [6, 8, 8, 6, 6, 6] }],
  'Bbm': [{ label: 'Barre 6fr',    frets: [6, 8, 8, 6, 6, 6] }],

  // Dominant 7
  'C7':  [{ label: 'Open',         frets: ['x', 3, 2, 3, 1, 0] }],
  'D7':  [{ label: 'Open',         frets: ['x', 'x', 0, 2, 1, 2] }],
  'E7':  [{ label: 'Open',         frets: [0, 2, 0, 1, 0, 0] }],
  'F7':  [{ label: 'Barre 1fr',    frets: [1, 3, 1, 2, 1, 1] }],
  'G7':  [{ label: 'Open',         frets: [3, 2, 0, 0, 0, 1] }],
  'A7':  [{ label: 'Open',         frets: ['x', 0, 2, 0, 2, 0] }],
  'B7':  [{ label: 'Open',         frets: ['x', 2, 1, 2, 0, 2] }],
  'Bb7': [{ label: 'Barre 6fr',    frets: ['x', 1, 3, 1, 3, 1] }],

  // Minor 7
  'Cm7': [{ label: 'Barre 3fr',    frets: ['x', 3, 5, 3, 4, 3] }],
  'Dm7': [{ label: 'Open',         frets: ['x', 'x', 0, 2, 1, 1] }],
  'Em7': [{ label: 'Open',         frets: [0, 2, 0, 0, 0, 0] }],
  'Am7': [{ label: 'Open',         frets: ['x', 0, 2, 0, 1, 0] }],
  'Bm7': [{ label: 'Barre 2fr',    frets: ['x', 2, 4, 2, 3, 2] }],
  'F#m7':[{ label: 'Barre 2fr',    frets: [2, 4, 2, 2, 2, 2] }],
  'Gm7': [{ label: 'Barre 3fr',    frets: [3, 5, 3, 3, 3, 3] }],

  // Major 7
  'Cmaj7':[{ label: 'Open',        frets: ['x', 3, 2, 0, 0, 0] }],
  'Dmaj7':[{ label: 'Open',        frets: ['x', 'x', 0, 2, 2, 2] }],
  'Emaj7':[{ label: 'Open',        frets: [0, 2, 1, 1, 0, 0] }],
  'Fmaj7':[{ label: 'Open',        frets: ['x', 'x', 3, 2, 1, 0] }],
  'Gmaj7':[{ label: 'Open',        frets: [3, 2, 0, 0, 0, 2] }],
  'Amaj7':[{ label: 'Open',        frets: ['x', 0, 2, 1, 2, 0] }],

  // Sus
  'Dsus2':[{ label: 'Open',        frets: ['x', 'x', 0, 2, 3, 0] }],
  'Dsus4':[{ label: 'Open',        frets: ['x', 'x', 0, 2, 3, 3] }],
  'Asus2':[{ label: 'Open',        frets: ['x', 0, 2, 2, 0, 0] }],
  'Asus4':[{ label: 'Open',        frets: ['x', 0, 2, 2, 3, 0] }],
  'Esus4':[{ label: 'Open',        frets: [0, 2, 2, 2, 0, 0] }],

  // Diminished / half-diminished
  'Bdim': [{ label: 'Barre 2fr',   frets: ['x', 2, 3, 4, 3, 'x'] }],
  'Bm7b5':[{ label: 'Open',        frets: ['x', 2, 3, 2, 3, 'x'] }],

  // Add9
  'Cadd9':[{ label: 'Open',        frets: ['x', 3, 2, 0, 3, 0] }],
  'Gadd9':[{ label: 'Open',        frets: [3, 0, 0, 0, 3, 3] }],
};

/**
 * Look up shapes for a chord name. Returns an empty array if no shape is known.
 * Names are matched as-is — pass canonical chord names (e.g. "Cmaj7", "F#m").
 */
export function getGuitarShapes(chordName: string): GuitarShape[] {
  if (!chordName) return [];
  const trimmed = chordName.trim();
  if (SHAPES[trimmed]) return SHAPES[trimmed];

  // For slash chords, fall back to the base chord shape (without the bass).
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx > 0) {
    const base = trimmed.slice(0, slashIdx);
    if (SHAPES[base]) return SHAPES[base];
  }
  return [];
}
