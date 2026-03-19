// Chord identification engine
// Maps MIDI note arrays → chord names, intervals, descriptions

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Enharmonic display preferences (flats for certain keys)
const DISPLAY_NAMES: Record<number, string> = {
  0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
  6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B',
};

// Chord formulas: intervals as pitch classes from root
// Ordered by priority (simpler first)
const CHORD_FORMULAS: { name: string; intervals: number[]; priority: number }[] = [
  // Triads
  { name: 'maj', intervals: [0, 4, 7], priority: 1 },
  { name: 'm', intervals: [0, 3, 7], priority: 2 },
  { name: 'dim', intervals: [0, 3, 6], priority: 3 },
  { name: 'aug', intervals: [0, 4, 8], priority: 4 },
  { name: 'sus2', intervals: [0, 2, 7], priority: 5 },
  { name: 'sus4', intervals: [0, 5, 7], priority: 6 },

  // Seventh chords
  { name: '7', intervals: [0, 4, 7, 10], priority: 10 },
  { name: 'maj7', intervals: [0, 4, 7, 11], priority: 11 },
  { name: 'm7', intervals: [0, 3, 7, 10], priority: 12 },
  { name: 'dim7', intervals: [0, 3, 6, 9], priority: 13 },
  { name: 'm7b5', intervals: [0, 3, 6, 10], priority: 14 },

  // Sixth chords
  { name: '6', intervals: [0, 4, 7, 9], priority: 15 },
  { name: 'm6', intervals: [0, 3, 7, 9], priority: 16 },

  // Add chords
  { name: 'add9', intervals: [0, 2, 4, 7], priority: 17 },

  // Ninth chords
  { name: '9', intervals: [0, 2, 4, 7, 10], priority: 20 },
  { name: 'maj9', intervals: [0, 2, 4, 7, 11], priority: 21 },
  { name: 'm9', intervals: [0, 2, 3, 7, 10], priority: 22 },

  // Eleventh chords
  { name: '11', intervals: [0, 2, 4, 5, 7, 10], priority: 30 },

  // Thirteenth chords
  { name: '13', intervals: [0, 2, 4, 5, 7, 9, 10], priority: 40 },
];

// Interval names for display
const INTERVAL_NAMES: Record<number, string> = {
  0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4',
  6: 'b5', 7: '5', 8: '#5', 9: '6', 10: 'b7', 11: '7',
};

// Descriptions for chord types
const CHORD_DESCRIPTIONS: Record<string, string> = {
  'maj': 'Major — bright, happy, resolved',
  'm': 'Minor — dark, sad, introspective',
  'dim': 'Diminished — tense, unstable, spooky',
  'aug': 'Augmented — dreamy, suspenseful, unresolved',
  'sus2': 'Suspended 2nd — open, airy, ambiguous',
  'sus4': 'Suspended 4th — yearning, wanting to resolve',
  '7': 'Dominant 7th — bluesy, wants to resolve',
  'maj7': 'Major 7th — dreamy, jazzy, lush',
  'm7': 'Minor 7th — mellow, smooth, soulful',
  'dim7': 'Diminished 7th — dramatic, tense',
  'm7b5': 'Half-diminished — dark, jazzy',
  '6': 'Major 6th — warm, vintage, bossa nova',
  'm6': 'Minor 6th — mysterious, film noir',
  'add9': 'Add 9 — bright, shimmering',
  '9': 'Dominant 9th — funky, rich',
  'maj9': 'Major 9th — lush, sophisticated',
  'm9': 'Minor 9th — smooth, R&B',
  '11': '11th — suspended feel, complex',
  '13': '13th — full, rich, jazz',
};

export interface ChordIdentification {
  name: string;           // e.g. "Cmaj7" or "F/C"
  rootNote: string;       // e.g. "C"
  quality: string;        // e.g. "maj7"
  intervals: string;      // e.g. "1 - 3 - 5 - 7"
  description: string;    // e.g. "C major with a major 7th — dreamy, jazzy"
  alternateNames: string[];
  isSlashChord: boolean;
  bassNoteName: string | null;
}

export function midiToNoteName(midi: number): string {
  return NOTE_NAMES[midi % 12];
}

export function midiToDisplayName(midi: number): string {
  return DISPLAY_NAMES[midi % 12];
}

export function midiToPitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function noteNameToOctave(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${midiToDisplayName(midi)}${octave}`;
}

function arraysEqualSorted(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => v === sb[i]);
}

function uniquePitchClasses(notes: number[]): number[] {
  return [...new Set(notes.map(midiToPitchClass))].sort((a, b) => a - b);
}

/**
 * Identify a chord from MIDI note arrays.
 * Returns the best identification, plus alternates.
 */
export function identifyChord(
  voicing: number[],
  bass: number[],
): ChordIdentification | null {
  const allNotes = [...bass, ...voicing];
  if (allNotes.length === 0) return null;

  const pitchClasses = uniquePitchClasses(allNotes);
  if (pitchClasses.length === 0) return null;

  // Single note — just name it
  if (pitchClasses.length === 1) {
    const name = DISPLAY_NAMES[pitchClasses[0]];
    return {
      name,
      rootNote: name,
      quality: '',
      intervals: '1',
      description: `${name} — single note`,
      alternateNames: [],
      isSlashChord: false,
      bassNoteName: null,
    };
  }

  // Two notes — interval
  if (pitchClasses.length === 2) {
    const root = pitchClasses[0];
    const interval = (pitchClasses[1] - root + 12) % 12;
    const rootName = DISPLAY_NAMES[root];
    const intervalName = INTERVAL_NAMES[interval] || String(interval);
    return {
      name: `${rootName}(${intervalName})`,
      rootNote: rootName,
      quality: `(${intervalName})`,
      intervals: `1 - ${intervalName}`,
      description: `${rootName} with ${intervalName} — two-note interval`,
      alternateNames: [],
      isSlashChord: false,
      bassNoteName: null,
    };
  }

  // Try all 12 possible roots, find matches
  const matches: {
    root: number;
    formula: typeof CHORD_FORMULAS[number];
  }[] = [];

  for (let root = 0; root < 12; root++) {
    const intervals = pitchClasses.map((pc) => (pc - root + 12) % 12).sort((a, b) => a - b);

    for (const formula of CHORD_FORMULAS) {
      if (arraysEqualSorted(intervals, formula.intervals)) {
        matches.push({ root, formula });
      }
    }
  }

  if (matches.length === 0) {
    // Unknown chord — just list note names
    const noteNames = pitchClasses.map((pc) => DISPLAY_NAMES[pc]);
    return {
      name: noteNames.join('-'),
      rootNote: noteNames[0],
      quality: '',
      intervals: noteNames.join(' - '),
      description: 'Unknown chord — ' + noteNames.join(', '),
      alternateNames: [],
      isSlashChord: false,
      bassNoteName: null,
    };
  }

  // Sort matches by priority
  matches.sort((a, b) => a.formula.priority - b.formula.priority);

  // Determine bass note for slash chord detection
  const bassPC = bass.length > 0 ? midiToPitchClass(Math.min(...bass)) : null;

  // Build identifications
  const identifications = matches.map((m) => {
    const rootName = DISPLAY_NAMES[m.root];
    const qualityDisplay = m.formula.name === 'maj' ? '' : m.formula.name;
    const isSlash = bassPC !== null && bassPC !== m.root;
    const bassName = bassPC !== null ? DISPLAY_NAMES[bassPC] : null;
    const chordName = isSlash
      ? `${rootName}${qualityDisplay}/${bassName}`
      : `${rootName}${qualityDisplay}`;

    return {
      name: chordName,
      rootNote: rootName,
      quality: m.formula.name,
      isSlash,
      bassName,
      formula: m.formula,
    };
  });

  // Prefer match where root equals bass note (non-slash chord), if available
  const bestNonSlash = identifications.find((id) => !id.isSlash);
  const best = bestNonSlash || identifications[0];

  const alternateNames = identifications
    .filter((id) => id.name !== best.name)
    .map((id) => id.name)
    .slice(0, 3);

  const intervalStr = best.formula.intervals
    .map((i) => INTERVAL_NAMES[i])
    .join(' - ');

  const rootForDesc = best.rootNote;
  const baseDesc = CHORD_DESCRIPTIONS[best.quality] || '';
  const description = `${rootForDesc} ${baseDesc}`;

  return {
    name: best.name,
    rootNote: best.rootNote,
    quality: best.quality,
    intervals: intervalStr,
    description,
    alternateNames,
    isSlashChord: best.isSlash,
    bassNoteName: best.bassName,
  };
}

// --- Chord dictionary for autocomplete (Type tab) ---

const ROOT_NOTES = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
const QUALITIES = ['', 'm', '7', 'maj7', 'm7', 'dim', 'aug', 'sus2', 'sus4', 'add9', '6', 'm6', '9', 'maj9', 'm9', '11', '13', 'dim7', 'm7b5'];

let _chordDictionary: string[] | null = null;

export function getChordDictionary(): string[] {
  if (_chordDictionary) return _chordDictionary;

  const chords: string[] = [];
  for (const root of ROOT_NOTES) {
    for (const q of QUALITIES) {
      chords.push(root + q);
    }
    // Add slash chord variants for common bass notes
    for (const bassNote of ROOT_NOTES) {
      if (bassNote !== root) {
        chords.push(`${root}/${bassNote}`);
        chords.push(`${root}m/${bassNote}`);
      }
    }
  }
  _chordDictionary = chords;
  return chords;
}

export function searchChords(query: string): string[] {
  if (!query.trim()) return [];
  const q = query.trim();
  const dict = getChordDictionary();
  // Exact prefix matches first, then contains
  const prefix: string[] = [];
  const contains: string[] = [];
  const lowerQ = q.toLowerCase();

  for (const chord of dict) {
    const lc = chord.toLowerCase();
    if (lc.startsWith(lowerQ)) prefix.push(chord);
    else if (lc.includes(lowerQ)) contains.push(chord);
  }
  return [...prefix.slice(0, 20), ...contains.slice(0, 10)].slice(0, 20);
}

// --- Default voicing generation for Type tab ---

const NOTE_NAME_TO_PC: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 5, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 0,
};

const QUALITY_TO_FORMULA: Record<string, number[]> = {
  '': [0, 4, 7],
  'm': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10],
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
  'add9': [0, 2, 4, 7],
  '9': [0, 2, 4, 7, 10],
  'maj9': [0, 2, 4, 7, 11],
  'm9': [0, 2, 3, 7, 10],
  '11': [0, 2, 4, 5, 7, 10],
  '13': [0, 2, 4, 5, 7, 9, 10],
};

export interface ParsedChord {
  root: string;
  quality: string;
  bassNote: string | null;  // for slash chords
}

export function parseChordName(name: string): ParsedChord | null {
  const slashIdx = name.indexOf('/');
  let main = name;
  let bassNote: string | null = null;

  if (slashIdx > 0) {
    main = name.substring(0, slashIdx);
    bassNote = name.substring(slashIdx + 1);
    if (!(bassNote in NOTE_NAME_TO_PC)) return null;
  }

  // Extract root note (1 or 2 chars)
  let root = '';
  if (main.length >= 2 && (main[1] === '#' || main[1] === 'b')) {
    root = main.substring(0, 2);
  } else if (main.length >= 1) {
    root = main[0];
  }

  if (!(root in NOTE_NAME_TO_PC)) return null;

  const quality = main.substring(root.length);
  if (!(quality in QUALITY_TO_FORMULA)) return null;

  return { root, quality, bassNote };
}

/**
 * Generate default bass + voicing MIDI arrays for a chord name.
 * Bass: root in octave 2 (C2 = MIDI 36)
 * Voicing: chord tones in octave 4 (C4 = MIDI 60)
 */
export function generateDefaultVoicing(chordName: string): { voicing: number[]; bass: number[] } | null {
  const parsed = parseChordName(chordName);
  if (!parsed) return null;

  const rootPC = NOTE_NAME_TO_PC[parsed.root];
  const formula = QUALITY_TO_FORMULA[parsed.quality];

  // Bass: root (or slash bass note) in octave 2
  const bassPC = parsed.bassNote ? NOTE_NAME_TO_PC[parsed.bassNote] : rootPC;
  const bassMidi = 36 + bassPC; // C2 = 36

  // Voicing: chord tones in octave 4 (MIDI 60 = C4)
  const voicing = formula.map((interval) => {
    let midi = 60 + ((rootPC + interval) % 12);
    // Push any notes below root up an octave
    if (midi < 60) midi += 12;
    return midi;
  });

  return { voicing, bass: [bassMidi] };
}

// Export constants for use in piano keyboard
export { NOTE_NAMES, DISPLAY_NAMES };
