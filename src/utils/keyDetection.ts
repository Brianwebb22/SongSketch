// Key detection — infer the most likely song key from a list of chords.
// Scores all 24 keys (12 major + 12 minor) by diatonic fit plus bonuses for
// tonic, dominant, and structurally important first/last-chord placement.

import type { Chord } from '../db.ts';
import { parseChordName } from './chordEngine.ts';

const NOTE_NAME_TO_PC: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 5, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 0,
};

// Preferred spellings for key display, matching the app's KEY_OPTIONS list.
const MAJOR_KEY_NAMES: Record<number, string> = {
  0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
};
const MINOR_KEY_NAMES: Record<number, string> = {
  0: 'C', 1: 'C#', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'Bb', 11: 'B',
};

type ChordCategory = 'major' | 'minor' | 'dim' | 'aug' | 'sus' | 'other';

interface ChordAnalysis {
  rootPC: number;
  category: ChordCategory;
}

export interface KeyCandidate {
  key: string;          // e.g. "C Major", "A Minor"
  confidence: number;   // 0-1
  reason?: string;
}

function chordCategory(quality: string): ChordCategory {
  switch (quality) {
    case '':
    case 'maj':
    case 'maj7':
    case 'maj9':
    case '6':
    case 'add9':
    case '7':
    case '9':
    case '11':
    case '13':
      return 'major';
    case 'm':
    case 'm7':
    case 'm9':
    case 'm6':
      return 'minor';
    case 'dim':
    case 'dim7':
    case 'm7b5':
      return 'dim';
    case 'aug':
      return 'aug';
    case 'sus2':
    case 'sus4':
      return 'sus';
    default:
      return 'other';
  }
}

function analyzeChord(chordName: string): ChordAnalysis | null {
  const parsed = parseChordName(chordName);
  if (!parsed) return null;
  const rootPC = NOTE_NAME_TO_PC[parsed.root];
  if (rootPC === undefined) return null;
  const category = chordCategory(parsed.quality);
  if (category === 'other') return null;
  return { rootPC, category };
}

// Expected chord categories at each diatonic scale degree (semitones from tonic).
// Major: I maj, ii min, iii min, IV maj, V maj, vi min, vii° dim
const MAJOR_DIATONIC: Record<number, ChordCategory> = {
  0: 'major', 2: 'minor', 4: 'minor', 5: 'major',
  7: 'major', 9: 'minor', 11: 'dim',
};

// Natural minor: i min, ii° dim, III maj, iv min, v min, VI maj, VII maj
// (the V/degree-7 slot also accepts major — harmonic minor dominant)
const MINOR_DIATONIC: Record<number, ChordCategory> = {
  0: 'minor', 2: 'dim', 3: 'major', 5: 'minor',
  7: 'minor', 8: 'major', 10: 'major',
};

function isDiatonic(degree: number, category: ChordCategory, mode: 'Major' | 'Minor'): boolean {
  const table = mode === 'Major' ? MAJOR_DIATONIC : MINOR_DIATONIC;
  const expected = table[degree];
  if (expected === undefined) return false;
  if (category === 'sus') return true; // sus chords lack a 3rd; treat as neutral
  if (category === expected) return true;
  // Harmonic-minor dominant: V major in a minor key
  if (mode === 'Minor' && degree === 7 && category === 'major') return true;
  return false;
}

function isTonic(ca: ChordAnalysis, rootPC: number, mode: 'Major' | 'Minor'): boolean {
  if (ca.rootPC !== rootPC) return false;
  if (ca.category === 'sus') return true;
  return mode === 'Major' ? ca.category === 'major' : ca.category === 'minor';
}

function isDominant(ca: ChordAnalysis, rootPC: number): boolean {
  const dominantPC = (rootPC + 7) % 12;
  return ca.rootPC === dominantPC && ca.category === 'major';
}

function keyDisplayName(rootPC: number, mode: 'Major' | 'Minor'): string {
  const names = mode === 'Major' ? MAJOR_KEY_NAMES : MINOR_KEY_NAMES;
  return `${names[rootPC]} ${mode}`;
}

function scoreKey(
  analyses: ChordAnalysis[],
  rootPC: number,
  mode: 'Major' | 'Minor',
): { confidence: number; reason: string } {
  let fitScore = 0;
  let chromaticPenalty = 0;
  let diatonicCount = 0;

  for (const ca of analyses) {
    const degree = (ca.rootPC - rootPC + 12) % 12;
    if (isDiatonic(degree, ca.category, mode)) {
      fitScore += 1;
      diatonicCount += 1;
    } else {
      chromaticPenalty -= 0.5;
    }
  }

  const tonicExists = analyses.some((c) => isTonic(c, rootPC, mode));
  const tonicBonus = tonicExists ? 2 : 0;

  const dominantExists = analyses.some((c) => isDominant(c, rootPC));
  const dominantBonus = dominantExists ? 1.5 : 0;

  let firstLastBonus = 0;
  const firstIsTonic = analyses.length > 0 && isTonic(analyses[0], rootPC, mode);
  const lastIsTonic =
    analyses.length > 0 && isTonic(analyses[analyses.length - 1], rootPC, mode);
  if (firstIsTonic) firstLastBonus += 1.5;
  if (lastIsTonic) firstLastBonus += 1;

  const rawScore = fitScore + tonicBonus + dominantBonus + firstLastBonus + chromaticPenalty;
  // Max possible: every chord diatonic (N) + tonic (2) + dominant (1.5) + first+last (2.5)
  const maxPossible = analyses.length + 2 + 1.5 + 2.5;
  const confidence = Math.max(0, Math.min(1, rawScore / maxPossible));

  const reasonParts: string[] = [];
  if (firstIsTonic && lastIsTonic) reasonParts.push('starts and ends on tonic');
  else if (firstIsTonic) reasonParts.push('starts on tonic');
  else if (lastIsTonic) reasonParts.push('ends on tonic');
  if (dominantExists && reasonParts.length < 2) reasonParts.push('includes the V chord');
  if (diatonicCount === analyses.length && analyses.length > 0 && reasonParts.length < 2) {
    reasonParts.push('all chords diatonic');
  } else if (reasonParts.length < 2 && diatonicCount > 0 && analyses.length > 0) {
    reasonParts.push(`${diatonicCount}/${analyses.length} chords fit`);
  }

  return { confidence, reason: reasonParts.slice(0, 2).join(', ') };
}

/**
 * Detect likely keys for a chord sequence. Returns candidates sorted by
 * descending confidence. Returns [] if there are fewer than 3 unique chords
 * or none of the chords can be analyzed.
 */
export function detectKey(chords: Chord[]): KeyCandidate[] {
  if (!chords || chords.length === 0) return [];

  // The caller is expected to pass chords in musical order (section-ordered,
  // chord-ordered within section). First/last bonuses rely on that ordering.
  const analyses: ChordAnalysis[] = [];
  const uniqueNames = new Set<string>();
  for (const c of chords) {
    if (!c.name) continue;
    uniqueNames.add(c.name.trim().toLowerCase());
    const a = analyzeChord(c.name);
    if (a) analyses.push(a);
  }

  if (uniqueNames.size < 3) return [];
  if (analyses.length === 0) return [];

  const candidates: KeyCandidate[] = [];
  for (let rootPC = 0; rootPC < 12; rootPC++) {
    for (const mode of ['Major', 'Minor'] as const) {
      const { confidence, reason } = scoreKey(analyses, rootPC, mode);
      if (confidence > 0) {
        candidates.push({
          key: keyDisplayName(rootPC, mode),
          confidence,
          reason: reason || undefined,
        });
      }
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}
