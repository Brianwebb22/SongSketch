import Dexie, { type EntityTable } from 'dexie';

// --- Data model types ---

export type SectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'outro'
  | 'custom';

export interface Chord {
  id: string;
  name: string;
  voicing: number[];  // MIDI note numbers for upper voicing
  bass: number[];     // MIDI note numbers for bass
  order: number;
}

export interface Section {
  id: string;
  type: SectionType;
  label: string;
  order: number;
  chords: Chord[];
  notes: string;
}

export interface Song {
  id: string;
  title: string;
  key: string | null;
  bpm: number | null;
  tags: string[];
  sections: Section[];
  createdAt: string;   // ISO 8601
  updatedAt: string;   // ISO 8601
}

// --- Database ---

const db = new Dexie('SongSketchDB') as Dexie & {
  songs: EntityTable<Song, 'id'>;
};

db.version(1).stores({
  songs: 'id, title, updatedAt',
});

export { db };
