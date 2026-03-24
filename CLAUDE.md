# SongSketch — Project Reference

## Overview

SongSketch is a songwriter's workbench web app for non-classically-trained musicians who play by ear. It helps songwriters document their songs, identify chords they're playing, find tempo via tap, and organize song structures — all without requiring the ability to read sheet music.

---

## Tech Stack

| Layer              | Technology                  | Notes                                                    |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| UI Framework       | Preact + TypeScript         | Lightweight (3KB), JSX components, React-compatible API  |
| Build Tool         | Vite                        | Fast dev server, Preact plugin, optimized production builds |
| Styling            | Tailwind CSS                | Mobile-first responsive design, utility classes          |
| Local Storage      | Dexie.js (IndexedDB)        | Structured local DB, future-friendly for sync layer      |
| PWA                | Service Worker (manual)     | Offline caching + "Add to Home Screen"                   |
| Drag & Drop        | @dnd-kit                    | Via preact/compat layer                                  |
| Hosting            | GitHub Pages                | Static SPA with hash-based routing                       |

---

## Data Model

All data stored locally in IndexedDB via Dexie.js.

### Song

```typescript
interface Song {
  id: string;            // UUID
  title: string;
  key: string | null;    // e.g. "Eb Major", "C# Minor", or null
  bpm: number | null;
  tags: string[];
  sections: Section[];
  createdAt: string;     // ISO 8601
  updatedAt: string;     // ISO 8601
}
```

### Section

```typescript
interface Section {
  id: string;            // UUID
  type: SectionType;
  label: string;         // Display name, defaults to type
  order: number;
  chords: Chord[];
  notes: string;         // Freeform text (lyrics, ideas)
}

type SectionType =
  | "intro" | "verse" | "pre-chorus" | "chorus"
  | "bridge" | "outro" | "custom";
```

### Chord

```typescript
interface Chord {
  id: string;            // UUID
  name: string;          // e.g. "Fmaj7", "Dm/A"
  voicing: number[];     // MIDI notes for upper voicing (chord color)
  bass: number[];        // MIDI notes for bass (foundation)
  order: number;
}
```

**Bass vs Voicing:** Every chord stores two note layers. "Voicing" is the upper register harmonic color. "Bass" is the lower register foundation. This captures *how you actually play* the chord, not just its name.

### Dexie Schema

```typescript
const db = new Dexie("SongSketchDB");
db.version(1).stores({
  songs: "id, title, updatedAt"
});
```

---

## Design Direction

**Colors:**
- Primary accent: `#7289DA` — active states, voicing keys, primary buttons
- Secondary accent: `#D85A30` (coral) — bass notes on keyboards
- Dark mode is the default and primary mode
- Section type colors: intro=purple, verse=blue, pre-chorus=teal, chorus=pink, bridge=orange, outro=gray, custom=muted gray

**Typography:**
- Chord names: monospace or semi-monospace font
- Body text: clean sans-serif
- Notes/lyrics: comfortable reading font at good size

**Responsive breakpoints:**
- Mobile: < 640px
- Tablet: 640px – 1024px
- Desktop: > 1024px

**Touch targets:** 44px minimum for piano keys and interactive elements.

---

## Component Architecture

```
App
├── Router (hash-based)
│
├── SongListPage
│   ├── SearchBar
│   ├── ViewToggle (grid / list)
│   ├── SongCard[] / SongListRow[]
│   ├── NewSongButton
│   └── AppFooter (About modal, GitHub, Buy Me a Coffee)
│
└── SongWorkspacePage
    ├── WorkspaceHeader
    │   ├── BackButton
    │   ├── SongTitleInput (inline editable)
    │   ├── KeySelector
    │   └── TapTempo (BPM display + manual input + tap button)
    │
    ├── ViewToolbar
    │   ├── ViewSwitcher (Sections | Keyboard)
    │   ├── ExpandCollapseAllButton (Sections view only)
    │   └── ColorLegend (Keyboard view only)
    │
    ├── SectionsView
    │   ├── SectionCard[]
    │   │   ├── SectionHeader (type badge, label, collapse toggle, chord degrees)
    │   │   ├── ChordProgressionRow (chips with Roman numeral labels)
    │   │   │   ├── ChordChip[]
    │   │   │   └── AddChordButton
    │   │   └── NotesTextArea
    │   ├── AddSectionButton
    │   └── DragDropContext
    │
    ├── KeyboardView
    │   └── KeyboardSection[]
    │       ├── SectionLabel (color-coded)
    │       ├── ChordCardRow (horizontal scroll)
    │       │   ├── ChordCard[] (mini-keyboards + chord degrees)
    │       │   └── AddChordButton
    │       └── AddSectionButton
    │
    └── ChordInputPanel (collapsible bottom panel)
        ├── PanelTabs (Piano | Type)
        ├── PianoKeyboard
        │   ├── BassVoicingToggle
        │   ├── OctaveNavigation (left/right arrows)
        │   ├── NoteLabelsToggle
        │   ├── Key[] (color-coded by active layer, inactive layer desaturated)
        │   └── ChordDisplay (name, intervals, description, alternates)
        └── ChordTypeInput
            ├── AutocompleteInput (case-insensitive, synced with Piano tab)
            ├── ClearButton
            ├── ChordSuggestionList (position: fixed dropdown)
            └── MiniKeyboardPreview
```

---

## Key Behaviors

**Auto-save:** All changes save to IndexedDB after 1-second debounce. "Saved" indicator appears briefly.

**Chord identification:** Maps MIDI notes → pitch classes → chord formulas. Supports major, minor, 7, maj7, min7, dim, aug, sus2, sus4, add9, 6, min6, 9, maj9, min9, 11, 13, dim7, m7b5, and slash chords. Ranks by simplest correct name.

**Chord degrees:** Utility that takes chord name + song key → Roman numeral (I, ii, IV, V7, bVI, etc.). Major chords uppercase, minor lowercase, with accidentals for chromatic chords.

**Piano input Bass/Voicing toggle:** Manual toggle switch. Active layer at full color, inactive layer desaturated (voicing dims to #3D4560, bass dims to #5C3020). Auto-jumps to octave of existing notes when switching layers.

**Mini-keyboards (Keyboard view):** Realistic piano with black keys visible. Cropped to relevant range with padding. Both layers at full opacity.

**Tap Tempo:** BPM field supports both manual numeric input and tap mode. Tap button is large circular, flashes white on tap, Reset button reserves layout space to prevent shifting. Finalizes after 3 seconds of no taps. Clamped 20-300 BPM.

---

## Resolved Decisions

1. **Chord dictionary:** All types listed above — all required.
2. **Piano range:** 2 octaves default, octave navigation arrows on left/right edges.
3. **Drag-and-drop:** @dnd-kit via preact/compat.
4. **PWA:** Manual service worker implementation (vite-plugin-pwa incompatible with Vite 8).
5. **Bass/Voicing dimming:** Desaturation, not opacity.
6. **Mini-keyboard style:** Realistic piano with black keys (not dot grid).