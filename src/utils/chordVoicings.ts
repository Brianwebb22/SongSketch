// Chord voicing generator
// Given a chord name, generates all practical piano voicings

import { parseChordName } from './chordEngine.ts';

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

export interface ChordVoicing {
  label: string;
  voicing: number[];
  bass: number[];
}

function hasSeventh(formula: number[]): boolean {
  return formula.some(i => i === 10 || i === 11 || i === 9);
}

function hasThird(formula: number[]): boolean {
  return formula.some(i => i === 3 || i === 4);
}

function midiInOctave(pc: number, octave: number): number {
  return (octave + 1) * 12 + pc;
}

function bassMidi(pc: number): number {
  // Bass in octave 2 (C2 = 36)
  return midiInOctave(pc, 2);
}

/**
 * Build voicing notes from intervals relative to root, starting at a base octave.
 * Notes are placed ascending from the base — each note is >= the previous.
 */
function buildVoicing(rootPC: number, intervals: number[], baseOctave: number): number[] {
  const notes: number[] = [];
  let lastMidi = midiInOctave(rootPC, baseOctave) - 1; // one below so first note lands in baseOctave
  for (const interval of intervals) {
    let midi = midiInOctave((rootPC + interval) % 12, baseOctave);
    while (midi <= lastMidi) midi += 12;
    notes.push(midi);
    lastMidi = midi;
  }
  return notes;
}

export function generateVoicings(chordName: string): ChordVoicing[] {
  const parsed = parseChordName(chordName);
  if (!parsed) return [];

  const rootPC = NOTE_NAME_TO_PC[parsed.root];
  const formula = QUALITY_TO_FORMULA[parsed.quality];
  if (formula === undefined) return [];

  const bassPC = parsed.bassNote ? NOTE_NAME_TO_PC[parsed.bassNote] : rootPC;
  const bass = [bassMidi(bassPC)];

  const voicings: ChordVoicing[] = [];

  // 1. Root position — root in bass, chord tones stacked in order
  voicings.push({
    label: 'Root position',
    voicing: buildVoicing(rootPC, formula, 4),
    bass,
  });

  // 2. 1st inversion — 3rd in bass (needs a 3rd)
  if (hasThird(formula)) {
    const thirdInterval = formula.find(i => i === 3 || i === 4)!;
    const thirdPC = (rootPC + thirdInterval) % 12;
    voicings.push({
      label: '1st inversion',
      voicing: buildVoicing(rootPC, formula, 4),
      bass: [bassMidi(thirdPC)],
    });
  }

  // 3. 2nd inversion — 5th in bass (needs a 5th-like interval)
  const fifthInterval = formula.find(i => i === 6 || i === 7 || i === 8);
  if (fifthInterval !== undefined) {
    const fifthPC = (rootPC + fifthInterval) % 12;
    voicings.push({
      label: '2nd inversion',
      voicing: buildVoicing(rootPC, formula, 4),
      bass: [bassMidi(fifthPC)],
    });
  }

  // 4. 3rd inversion — 7th in bass (7th chords only)
  if (hasSeventh(formula) && formula.length >= 4) {
    const seventhInterval = formula.find(i => i === 10 || i === 11 || i === 9)!;
    const seventhPC = (rootPC + seventhInterval) % 12;
    voicings.push({
      label: '3rd inversion',
      voicing: buildVoicing(rootPC, formula, 4),
      bass: [bassMidi(seventhPC)],
    });
  }

  // 5. Close voicing — all notes within one octave, tight spacing
  {
    const closeNotes = buildVoicing(rootPC, formula, 4);
    // Only add if different from root position (it often is the same for triads)
    const isUnique = closeNotes.some((n, i) => n !== voicings[0].voicing[i]);
    if (isUnique) {
      voicings.push({
        label: 'Close voicing',
        voicing: closeNotes,
        bass,
      });
    }
  }

  // 6. Open voicing — spread notes across two octaves
  if (formula.length >= 3) {
    const openNotes: number[] = [];
    // Alternate: put odd-indexed intervals up an octave
    for (let i = 0; i < formula.length; i++) {
      const octave = i % 2 === 0 ? 4 : 5;
      let midi = midiInOctave((rootPC + formula[i]) % 12, octave);
      // Ensure ascending order
      if (openNotes.length > 0 && midi <= openNotes[openNotes.length - 1]) {
        midi += 12;
      }
      openNotes.push(midi);
    }
    voicings.push({
      label: 'Open voicing',
      voicing: openNotes,
      bass,
    });
  }

  // 7. Shell voicing — root, 3rd, 7th only (jazz, for 7th chords)
  if (hasThird(formula) && hasSeventh(formula)) {
    const third = formula.find(i => i === 3 || i === 4)!;
    const seventh = formula.find(i => i === 10 || i === 11)!;
    if (seventh !== undefined) {
      voicings.push({
        label: 'Shell voicing',
        voicing: buildVoicing(rootPC, [0, third, seventh], 4),
        bass,
      });
    }
  }

  // 8. Drop 2 — second-highest note dropped down an octave (4+ note chords)
  if (formula.length >= 4) {
    const closeNotes = buildVoicing(rootPC, formula, 4);
    const sorted = [...closeNotes].sort((a, b) => a - b);
    if (sorted.length >= 2) {
      const drop2Notes = [...sorted];
      const secondHighestIdx = drop2Notes.length - 2;
      drop2Notes[secondHighestIdx] -= 12;
      drop2Notes.sort((a, b) => a - b);
      voicings.push({
        label: 'Drop 2',
        voicing: drop2Notes,
        bass,
      });
    }
  }

  // 9. Octave doubling — root doubled in higher octave
  {
    const baseNotes = buildVoicing(rootPC, formula, 4);
    const highRoot = midiInOctave(rootPC, 5);
    // Make sure it's above all other notes
    const maxNote = Math.max(...baseNotes);
    const doubledRoot = highRoot <= maxNote ? highRoot + 12 : highRoot;
    voicings.push({
      label: 'Octave doubling',
      voicing: [...baseNotes, doubledRoot],
      bass,
    });
  }

  return voicings;
}
