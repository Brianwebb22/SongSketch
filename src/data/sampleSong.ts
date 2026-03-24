import type { Song, Section, Chord } from '../db.ts';

// Fixed ID so we can identify the demo song
export const SAMPLE_SONG_ID = 'sample-house-of-the-rising-sun';

// Helper: build a chord with bass in octave 2, voicing in octave 4
// pc = pitch class (0=C, 1=C#, ... 9=A, 10=Bb, 11=B)
function chord(name: string, bassPC: number, voicingPCs: number[], id: string, order: number): Chord {
  const bass = [36 + bassPC]; // octave 2
  const voicing = voicingPCs.map((pc) => {
    let midi = 60 + pc; // octave 4
    if (midi < 60) midi += 12;
    return midi;
  });
  // Ensure voicing notes are ascending
  for (let i = 1; i < voicing.length; i++) {
    while (voicing[i] <= voicing[i - 1]) voicing[i] += 12;
  }
  return { id, name, voicing, bass, order };
}

// Chord shorthand builders with varied voicings
// Am: A=9, C=0, E=4
const Am = (id: string, order: number) => chord('Am', 9, [0, 4, 9], id, order);           // 1st inversion (C in bottom of voicing)
const AmRoot = (id: string, order: number) => chord('Am', 9, [9, 0, 4], id, order);       // root position voicing
const AmOpen = (id: string, order: number) => chord('Am', 9, [9, 4, 0], id, order);       // open voicing (spread)
// C: C=0, E=4, G=7
const C = (id: string, order: number) => chord('C', 0, [0, 4, 7], id, order);             // root position
const CInv1 = (id: string, order: number) => chord('C', 0, [4, 7, 0], id, order);         // 1st inversion voicing
// D: D=2, F#=6, A=9
const D = (id: string, order: number) => chord('D', 2, [2, 6, 9], id, order);             // root position
const DInv2 = (id: string, order: number) => chord('D', 2, [9, 2, 6], id, order);         // 2nd inversion voicing
// F: F=5, A=9, C=0
const F = (id: string, order: number) => chord('F', 5, [5, 9, 0], id, order);             // root position
const FInv1 = (id: string, order: number) => chord('F', 5, [9, 0, 5], id, order);         // 1st inversion voicing
// E: E=4, G#=8, B=11
const E = (id: string, order: number) => chord('E', 4, [4, 8, 11], id, order);            // root position
const EInv1 = (id: string, order: number) => chord('E', 4, [8, 11, 4], id, order);        // 1st inversion voicing

let _chordId = 0;
function cid(): string { return `sample-chord-${++_chordId}`; }

function section(
  type: Section['type'],
  label: string,
  order: number,
  chords: ((id: string, order: number) => Chord)[],
  notes: string,
): Section {
  return {
    id: `sample-section-${order}`,
    type,
    label,
    order,
    chords: chords.map((fn, i) => fn(cid(), i)),
    notes,
  };
}

export function createSampleSong(): Song {
  // Reset chord counter for deterministic IDs
  _chordId = 0;

  const now = new Date().toISOString();

  const sections: Section[] = [
    section('intro', 'Intro', 0,
      [AmRoot, C, DInv2, F, AmOpen, EInv1, Am, E],
      '',
    ),
    section('verse', 'Verse 1', 1,
      [Am, CInv1, D, FInv1, AmRoot, C, E, EInv1],
      'There is a house in New Orleans\nThey call the Rising Sun\nIt\'s been the ruin of many a poor girl\nAnd me, oh God, for one',
    ),
    section('verse', 'Verse 2', 2,
      [AmOpen, C, DInv2, F, Am, CInv1, EInv1, E],
      'If I had listened to what my mama said\nI\'d be at home today\nBeing so young and foolish, poor girl\nI let a gambler lead me astray',
    ),
    section('verse', 'Verse 3', 3,
      [Am, C, D, FInv1, AmRoot, CInv1, E, EInv1],
      'My mother she\'s a tailor\nShe sews those new blue jeans\nMy sweetheart he\'s a drunkard, Lord\nDrinks down in New Orleans',
    ),
    section('verse', 'Verse 4', 4,
      [AmRoot, CInv1, DInv2, F, AmOpen, C, EInv1, E],
      'Go tell my baby sister\nNever do like I have done\nShun that house in New Orleans\nThey call the Rising Sun',
    ),
    section('verse', 'Verse 5', 5,
      [Am, C, D, FInv1, AmRoot, CInv1, E, EInv1],
      'I\'m going back to New Orleans\nMy race is almost run\nI\'m going back to spend my life\nBeneath the Rising Sun',
    ),
    section('outro', 'Outro', 6,
      [AmOpen, CInv1, DInv2, FInv1, Am, E, AmRoot],
      '',
    ),
  ];

  return {
    id: SAMPLE_SONG_ID,
    title: 'House of the Rising Sun',
    key: 'A Minor',
    bpm: 76,
    tags: ['folk', 'traditional', 'demo'],
    sections,
    createdAt: now,
    updatedAt: now,
  };
}
