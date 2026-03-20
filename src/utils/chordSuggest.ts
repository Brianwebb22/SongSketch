// Chord suggestion engine — rule-based, designed for easy swap to AI later

import { parseChordName, generateDefaultVoicing } from './chordEngine.ts';
import { getChordDegree, parseKey } from './chordDegrees.ts';
import type { Chord } from '../db.ts';

export interface ChordSuggestion {
  chordName: string;
  degree: string | null;
  mood: string;
  reason: string;
  defaultVoicing: number[];
  defaultBass: number[];
}

const NOTE_NAME_TO_PC: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const PC_TO_NOTE: Record<number, string> = {
  0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
};

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

// Diatonic chord qualities for each scale degree
const MAJOR_DIATONIC_QUALITIES: Record<number, string> = {
  0: '', 1: 'm', 2: 'm', 3: '', 4: '', 5: 'm', 6: 'dim',
};
const MINOR_DIATONIC_QUALITIES: Record<number, string> = {
  0: 'm', 1: 'dim', 2: '', 3: 'm', 4: 'm', 5: '', 6: '',
};

// Mood descriptions by degree + quality
const MOOD_MAP: Record<string, string> = {
  'I': 'Bright, resolved',
  'i': 'Dark, grounded',
  'ii': 'Gentle, preparatory',
  'II': 'Bright, lifting',
  'iii': 'Wistful, delicate',
  'III': 'Warm, expansive',
  'IV': 'Open, hopeful',
  'iv': 'Somber, reflective',
  'V': 'Strong, expectant',
  'V7': 'Tension, wants to resolve',
  'v': 'Soft, understated',
  'vi': 'Melancholic, reflective',
  'VI': 'Majestic, uplifting',
  'vii°': 'Tense, unstable',
  'VII': 'Bold, unresolved',
  'bVII': 'Epic, anthemic',
  'bVI': 'Dark, dramatic',
  'bIII': 'Warm, surprising',
};

function getMood(degree: string | null, quality: string): string {
  if (degree) {
    // Try exact match first, then base numeral
    if (MOOD_MAP[degree]) return MOOD_MAP[degree];
    const base = degree.replace(/[0-9a-z]*$/, '');
    if (MOOD_MAP[base]) return MOOD_MAP[base];
  }
  // Fallback by quality
  const qualityMoods: Record<string, string> = {
    '': 'Bright, stable',
    'm': 'Dark, emotional',
    '7': 'Bluesy, restless',
    'maj7': 'Dreamy, lush',
    'm7': 'Mellow, smooth',
    'dim': 'Tense, unstable',
    'aug': 'Dreamy, suspenseful',
    'sus2': 'Open, airy',
    'sus4': 'Yearning, suspended',
    'add9': 'Bright, shimmering',
    '6': 'Warm, vintage',
    'm6': 'Mysterious, moody',
    '9': 'Funky, rich',
    'dim7': 'Dramatic, tense',
    'm7b5': 'Dark, jazzy',
  };
  return qualityMoods[quality] || 'Interesting, colorful';
}

// Common harmonic tendencies: given a scale degree index (0-6), what degrees commonly follow?
// Values are scale degree indices
const MAJOR_TENDENCIES: Record<number, number[]> = {
  0: [3, 5, 4, 1],    // I → IV, vi, V, ii
  1: [4, 3],           // ii → V, IV
  2: [5, 3],           // iii → vi, IV
  3: [4, 0, 1],        // IV → V, I, ii
  4: [0, 5, 3],        // V → I, vi, IV
  5: [3, 4, 1],        // vi → IV, V, ii
  6: [0, 5],           // vii° → I, vi
};

const MINOR_TENDENCIES: Record<number, number[]> = {
  0: [2, 3, 4],        // i → III, iv, v
  1: [4, 2],           // ii° → v, III
  2: [3, 5, 0],        // III → iv, VI, i
  3: [4, 6, 0],        // iv → v, VII, i
  4: [0, 5],           // v → i, VI
  5: [2, 6, 3],        // VI → III, VII, iv
  6: [0, 2],           // VII → i, III
};

// Common progressions (as scale degree index sequences)
const MAJOR_PROGRESSIONS: number[][] = [
  [0, 4, 5, 3],   // I V vi IV
  [0, 3, 4, 0],   // I IV V I
  [1, 4, 0],      // ii V I
  [0, 5, 3, 4],   // I vi IV V
  [0, 5, 1, 4],   // I vi ii V
  [5, 3, 0, 4],   // vi IV I V
  [0, 1, 2, 3],   // I ii iii IV
  [3, 0, 4, 0],   // IV I V I
  [0, 2, 5, 3],   // I iii vi IV
];

const MINOR_PROGRESSIONS: number[][] = [
  [0, 5, 2, 6],   // i VI III VII
  [0, 3, 6, 2],   // i iv VII III
  [0, 6, 5, 4],   // i VII VI v
  [0, 3, 4, 0],   // i iv v i
  [0, 2, 5, 6],   // i III VI VII
];

// Borrowed chords for major keys (from parallel minor)
const MAJOR_BORROWED: { degreeOffset: number; quality: string; label: string }[] = [
  { degreeOffset: 10, quality: '',  label: 'bVII' },  // bVII
  { degreeOffset: 8,  quality: '',  label: 'bVI' },   // bVI
  { degreeOffset: 3,  quality: '',  label: 'bIII' },  // bIII
  { degreeOffset: 5,  quality: 'm', label: 'iv' },    // iv (minor IV)
];

// Borrowed chords for minor keys (from parallel major)
const MINOR_BORROWED: { degreeOffset: number; quality: string; label: string }[] = [
  { degreeOffset: 7,  quality: '',  label: 'V' },     // V major (instead of v minor)
  { degreeOffset: 5,  quality: '',  label: 'IV' },     // IV major (instead of iv minor)
];

function buildChordName(rootPC: number, quality: string): string {
  return PC_TO_NOTE[rootPC] + quality;
}

function getChordRootPC(chord: Chord): number | null {
  const parsed = parseChordName(chord.name);
  if (!parsed) return null;
  return NOTE_NAME_TO_PC[parsed.root] ?? null;
}

function makeSuggestion(chordName: string, songKey: string | null, reason: string): ChordSuggestion | null {
  const voicingData = generateDefaultVoicing(chordName);
  if (!voicingData) return null;

  const parsed = parseChordName(chordName);
  const quality = parsed?.quality ?? '';
  const degree = getChordDegree(chordName, songKey);

  return {
    chordName,
    degree,
    mood: getMood(degree, quality),
    reason,
    defaultVoicing: voicingData.voicing,
    defaultBass: voicingData.bass,
  };
}

function chordNameInList(name: string, chords: Chord[]): boolean {
  return chords.some(c => c.name === name);
}

export function suggestNextChords(options: {
  songKey: string | null;
  sectionChords: Chord[];
  allSongChords: Chord[];
  count?: number;
}): ChordSuggestion[] {
  const { songKey, sectionChords, allSongChords, count = 5 } = options;
  const key = parseKey(songKey);
  const suggestions: ChordSuggestion[] = [];
  const seen = new Set<string>();

  function addSuggestion(s: ChordSuggestion | null) {
    if (!s || seen.has(s.chordName)) return;
    seen.add(s.chordName);
    suggestions.push(s);
  }

  const sectionChordNames = new Set(sectionChords.map(c => c.name));

  // --- Case 1: Key is set ---
  if (key) {
    const scale = key.mode === 'Major' ? MAJOR_SCALE : MINOR_SCALE;
    const qualities = key.mode === 'Major' ? MAJOR_DIATONIC_QUALITIES : MINOR_DIATONIC_QUALITIES;
    const tendencies = key.mode === 'Major' ? MAJOR_TENDENCIES : MINOR_TENDENCIES;
    const progressions = key.mode === 'Major' ? MAJOR_PROGRESSIONS : MINOR_PROGRESSIONS;
    const borrowed = key.mode === 'Major' ? MAJOR_BORROWED : MINOR_BORROWED;

    // Build diatonic chord names for this key
    const diatonicChords = scale.map((interval, idx) => {
      const pc = (key.root + interval) % 12;
      return buildChordName(pc, qualities[idx]);
    });

    const lastChord = sectionChords.length > 0 ? sectionChords[sectionChords.length - 1] : null;
    const lastPC = lastChord ? getChordRootPC(lastChord) : null;

    // Find which scale degree the last chord is on
    let lastDegreeIdx: number | null = null;
    if (lastPC !== null) {
      const relPC = (lastPC - key.root + 12) % 12;
      lastDegreeIdx = scale.indexOf(relPC);
    }

    // Strategy 1: Diatonic movement from last chord
    if (lastDegreeIdx !== null && tendencies[lastDegreeIdx]) {
      for (const nextDeg of tendencies[lastDegreeIdx]) {
        const chordName = diatonicChords[nextDeg];
        // Allow suggesting I even if in section (common repeat)
        if (sectionChordNames.has(chordName) && nextDeg !== 0) continue;
        addSuggestion(makeSuggestion(chordName, songKey,
          `Common movement from ${getChordDegree(lastChord!.name, songKey) || lastChord!.name}`));
        if (suggestions.length >= 3) break;
      }
    }

    // Strategy 2: Common progression matching
    if (sectionChords.length >= 2) {
      const recentDegrees = sectionChords.slice(-3).map(c => {
        const pc = getChordRootPC(c);
        if (pc === null) return -1;
        const rel = (pc - key.root + 12) % 12;
        return scale.indexOf(rel);
      });

      for (const prog of progressions) {
        // Try to match the end of the section against the start of a progression
        for (let offset = 1; offset <= Math.min(recentDegrees.length, prog.length - 1); offset++) {
          const progSlice = prog.slice(0, offset);
          const recentSlice = recentDegrees.slice(-offset);
          if (progSlice.every((d, i) => d === recentSlice[i])) {
            const nextDeg = prog[offset];
            if (nextDeg !== undefined) {
              const chordName = diatonicChords[nextDeg];
              if (!sectionChordNames.has(chordName) || nextDeg === 0) {
                addSuggestion(makeSuggestion(chordName, songKey,
                  'Continues a common progression'));
              }
            }
          }
        }
      }
    }

    // Strategy 3: Palette expansion — unused diatonic chords
    for (let i = 0; i < diatonicChords.length; i++) {
      const chordName = diatonicChords[i];
      if (!chordNameInList(chordName, allSongChords) && !sectionChordNames.has(chordName)) {
        addSuggestion(makeSuggestion(chordName, songKey,
          'Adds variety — not yet used in song'));
      }
    }

    // Strategy 4: Borrowed chords (1-2 max)
    let borrowedCount = 0;
    for (const b of borrowed) {
      if (borrowedCount >= 2) break;
      const pc = (key.root + b.degreeOffset) % 12;
      const chordName = buildChordName(pc, b.quality);
      if (!sectionChordNames.has(chordName)) {
        addSuggestion(makeSuggestion(chordName, songKey,
          `Borrowed from parallel ${key.mode === 'Major' ? 'minor' : 'major'}`));
        borrowedCount++;
      }
    }

    // If section is empty, suggest the tonic and common starters
    if (sectionChords.length === 0) {
      // Clear and re-add with priority for starting chords
      const starters = [0, 5, 3, 4]; // I, vi, IV, V
      for (const deg of starters) {
        addSuggestion(makeSuggestion(diatonicChords[deg], songKey,
          deg === 0 ? 'Strong starting chord' : 'Common section opener'));
      }
    }
  }
  // --- Case 2: No key, but chords exist ---
  else if (allSongChords.length > 0 || sectionChords.length > 0) {
    const lastChord = sectionChords.length > 0
      ? sectionChords[sectionChords.length - 1]
      : allSongChords[allSongChords.length - 1];
    const lastPC = lastChord ? getChordRootPC(lastChord) : null;

    if (lastPC !== null) {
      // Suggest common interval movements from last root
      const movements = [
        { interval: 7, quality: '', reason: 'A 5th up — strong movement' },
        { interval: 5, quality: '', reason: 'A 4th up — classic resolution' },
        { interval: 9, quality: 'm', reason: 'Relative minor feel' },
        { interval: 3, quality: 'm', reason: 'Relative minor of the 4th' },
        { interval: 10, quality: '', reason: 'Whole step down — smooth movement' },
      ];

      for (const m of movements) {
        const pc = (lastPC + m.interval) % 12;
        const chordName = buildChordName(pc, m.quality);
        if (!sectionChordNames.has(chordName)) {
          addSuggestion(makeSuggestion(chordName, null, m.reason));
        }
      }
    }

    // Also suggest setting a key
    if (suggestions.length < count) {
      // Suggest common major chords not yet used
      const common = ['C', 'G', 'Am', 'F', 'Dm', 'Em'];
      for (const name of common) {
        if (!chordNameInList(name, allSongChords) && !sectionChordNames.has(name)) {
          addSuggestion(makeSuggestion(name, null, 'Popular chord — try setting a key for smarter suggestions'));
          break;
        }
      }
    }
  }
  // --- Case 3: No key, no chords ---
  else {
    const starters = [
      { name: 'C', reason: 'Classic starting chord' },
      { name: 'Am', reason: 'Emotional, minor feel' },
      { name: 'G', reason: 'Open, bright start' },
      { name: 'F', reason: 'Warm, mellow start' },
      { name: 'Em', reason: 'Gentle, reflective' },
    ];
    for (const s of starters) {
      addSuggestion(makeSuggestion(s.name, null, s.reason));
    }
  }

  return suggestions.slice(0, count);
}
