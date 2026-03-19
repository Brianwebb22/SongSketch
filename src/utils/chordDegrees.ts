// Chord degree analysis — Roman numeral notation relative to song key

import { parseChordName } from './chordEngine.ts';

const NOTE_NAME_TO_PC: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 5, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 0,
};

// Scale intervals: [W, W, H, W, W, W, H] for major, [W, H, W, W, H, W, W] for minor
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Map chord engine quality strings to broad categories
function qualityCategory(quality: string): 'major' | 'minor' | 'dim' | 'aug' | 'sus' | 'other' {
  if (quality === '' || quality === 'maj' || quality === 'maj7' || quality === 'maj9' || quality === '6' || quality === 'add9') return 'major';
  if (quality === 'm' || quality === 'm7' || quality === 'm9' || quality === 'm6' || quality === 'm7b5') return 'minor';
  if (quality === 'dim' || quality === 'dim7') return 'dim';
  if (quality === 'aug') return 'aug';
  if (quality === 'sus2' || quality === 'sus4') return 'sus';
  // Dominant 7, 9, 11, 13 are major-quality chords
  if (quality === '7' || quality === '9' || quality === '11' || quality === '13') return 'major';
  return 'other';
}

// Quality suffix for the Roman numeral display
function qualitySuffix(quality: string): string {
  switch (quality) {
    case '': case 'maj': return '';
    case 'm': return '';  // case handled by upper/lower numeral
    case '7': return '7';
    case 'maj7': return 'maj7';
    case 'm7': return '7';
    case 'dim': return '';
    case 'dim7': return '7';
    case 'aug': return '';
    case 'sus2': return 'sus2';
    case 'sus4': return 'sus4';
    case 'm7b5': return '7';
    case '6': return '6';
    case 'm6': return '6';
    case 'add9': return 'add9';
    case '9': return '9';
    case 'maj9': return 'maj9';
    case 'm9': return '9';
    case '11': return '11';
    case '13': return '13';
    default: return '';
  }
}

export interface ParsedKey {
  root: number;      // pitch class 0-11
  mode: 'Major' | 'Minor';
  scale: number[];   // 7 pitch classes of the scale
}

export function parseKey(songKey: string | null): ParsedKey | null {
  if (!songKey || songKey === 'Unknown') return null;

  // Format: "C Major", "Eb Minor", etc.
  const parts = songKey.split(' ');
  if (parts.length !== 2) return null;

  const rootName = parts[0];
  const mode = parts[1] as 'Major' | 'Minor';

  if (!(rootName in NOTE_NAME_TO_PC)) return null;
  if (mode !== 'Major' && mode !== 'Minor') return null;

  const rootPC = NOTE_NAME_TO_PC[rootName];
  const intervals = mode === 'Major' ? MAJOR_SCALE : MINOR_SCALE;
  const scale = intervals.map(i => (rootPC + i) % 12);

  return { root: rootPC, mode, scale };
}

/**
 * Get the Roman numeral degree for a chord name in a given key.
 * Returns null if the key is not set or the chord can't be analyzed.
 */
export function getChordDegree(chordName: string, songKey: string | null): string | null {
  const key = parseKey(songKey);
  if (!key) return null;

  const parsed = parseChordName(chordName);
  if (!parsed) return null;

  const chordRoot = NOTE_NAME_TO_PC[parsed.root];
  if (chordRoot === undefined) return null;

  const category = qualityCategory(parsed.quality);
  if (category === 'other') return null;

  // Find which scale degree this chord root falls on
  const scaleIndex = key.scale.indexOf(chordRoot);

  let numeral: string;
  let accidental = '';

  if (scaleIndex !== -1) {
    // Diatonic chord — root is in the scale
    numeral = ROMAN_NUMERALS[scaleIndex];
  } else {
    // Chromatic chord — find nearest scale degree and add accidental
    // Check if it's a sharp or flat of a scale degree
    const flatOf = key.scale.indexOf((chordRoot + 1) % 12);
    const sharpOf = key.scale.indexOf((chordRoot + 11) % 12);

    if (flatOf !== -1) {
      accidental = 'b';
      numeral = ROMAN_NUMERALS[flatOf];
    } else if (sharpOf !== -1) {
      accidental = '#';
      numeral = ROMAN_NUMERALS[sharpOf];
    } else {
      // Can't cleanly map to a degree
      return null;
    }
  }

  // Determine case: uppercase for major/aug/dom, lowercase for minor/dim
  const isUpper = category === 'major' || category === 'aug' || category === 'sus';
  const displayNumeral = isUpper ? numeral : numeral.toLowerCase();

  // Add symbols for dim/aug
  let symbol = '';
  if (category === 'dim') symbol = '°';
  if (category === 'aug') symbol = '+';

  const suffix = qualitySuffix(parsed.quality);

  return `${accidental}${displayNumeral}${symbol}${suffix}`;
}
