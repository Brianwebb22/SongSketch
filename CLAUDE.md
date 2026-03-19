# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `nvm use 22` — required before running any commands (Node 22+, see `.nvmrc`)
- `npm run dev` — start Vite dev server (http://localhost:5173)
- `npm run build` — type-check with `tsc -b` then build with Vite
- `npm run preview` — preview production build

## Architecture

- **Framework:** Preact + TypeScript + Vite + Tailwind CSS v4
- **Routing:** Custom hash-based router in `src/app.tsx` (`navigate()` function, `#/` and `#/song/:id` routes) — hash routing required for GitHub Pages
- **Database:** Dexie.js (IndexedDB wrapper) in `src/db.ts` — all data local, sections/chords nested inside Song objects (not separate tables)
- **Styling:** Tailwind v4 with custom theme colors defined in `src/index.css` (`@theme` block) — accent (#7289DA), coral (#D85A30), dark surface palette
- **Pages:** `src/pages/SongListPage.tsx` (home), `src/pages/SongWorkspacePage.tsx` (editor)

## Key Data Model Notes

- Chords store separate `voicing` (upper register, blue) and `bass` (lower register, coral) as MIDI note arrays — this distinction is central to the app
- Chord `name` is auto-identified from combined bass + voicing notes
- Sections and chords are stored as nested arrays within Song, not in separate DB tables

---

# SongSketch — V1 Product Specification

## Overview

SongSketch is a songwriter's workbench web app for non-classically-trained musicians who play by ear. It helps songwriters document their songs, identify chords they're playing, find tempo via tap, and organize song structures — all without requiring the ability to read sheet music.

**V1 Philosophy:** Documentation-first. No AI, no accounts, no complexity. Just a fast, intuitive tool for capturing songs as you write them.

---

## Tech Stack

| Layer              | Technology                  | Notes                                                    |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| UI Framework       | Preact + TypeScript         | Lightweight (3KB), JSX components, React-compatible API  |
| Build Tool         | Vite                        | Fast dev server, Preact plugin, optimized production builds |
| Styling            | Tailwind CSS                | Mobile-first responsive design, utility classes          |
| Local Storage      | Dexie.js (IndexedDB)        | Structured local DB, future-friendly for sync layer      |
| PWA                | Vite PWA Plugin             | Service worker for offline use + "Add to Home Screen"    |
| Hosting            | GitHub Pages                | Free static hosting, sufficient for client-only SPA      |

**Future stack additions (not in v1):**
- Web Audio API + Pitchy — mic-based chord detection / "Listen" feature (v2)
- Tone.js — audio synthesis, metronome, chord playback (v2+)
- Cloud backend + auth — sync, accounts (v2+)

---

## Data Model

All data is stored locally in IndexedDB via Dexie.js. The schema is designed to be serializable to JSON for future cloud sync.

### Song

```typescript
interface Song {
  id: string;            // UUID
  title: string;
  key: string | null;    // e.g. "Eb Major", "C# Minor", or null if unknown
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
  label: string;         // Display name, defaults to type but user can rename
  order: number;         // Sort position within the song
  chords: Chord[];
  notes: string;         // Freeform text (lyrics, ideas, notes)
}

type SectionType =
  | "intro"
  | "verse"
  | "pre-chorus"
  | "chorus"
  | "bridge"
  | "outro"
  | "custom";
```

### Chord

```typescript
interface Chord {
  id: string;            // UUID
  name: string;          // Display name, e.g. "Fmaj7", "Dm/A"
  voicing: number[];     // MIDI note numbers for the upper voicing (right hand / chord color)
  bass: number[];        // MIDI note numbers for the bass (left hand / foundation)
  order: number;         // Sort position within the section
}
```

**Bass vs Voicing:** Every chord stores two sets of notes. "Voicing" is the upper register — the harmonic color of the chord. "Bass" is the lower register — the foundation. This distinction captures *how you actually play* the chord, not just its name. Two players can voice the same Ebmaj7 completely differently; this model preserves that detail. The chord `name` is auto-identified from the combined notes but the voicing/bass split is what makes SongSketch unique.

### Dexie Schema

```typescript
const db = new Dexie("SongSketchDB");
db.version(1).stores({
  songs: "id, title, updatedAt"
});
```

Sections and chords are stored as nested arrays within the song object (not separate tables), keeping reads/writes simple. The `songs` table is indexed by `id`, `title`, and `updatedAt` for sorting.

---

## Application Structure

The app has two primary views:

### 1. Song List (Home)

The landing page. Shows all saved songs.

**Layout:**
- Top bar with app name ("SongSketch") and "New Song" button
- Search bar for filtering songs by title or tag
- Grid of song cards (responsive: 1 column on mobile, 2-3 on desktop)

**Song Card displays:**
- Song title
- Key and BPM (if set)
- Tags (as small pills/badges)
- Last edited date (relative: "2 hours ago", "Yesterday", etc.)

**Interactions:**
- Tap/click a card → navigate to Song Workspace for that song
- Long press or context menu → Delete song (with confirmation dialog)
- "New Song" → creates a song with default title "Untitled Song" and one empty Verse section, navigates to workspace

**Sorting:** By last edited (most recent first), always.

---

### 2. Song Workspace

The main working screen. All songwriting happens here.

#### 2a. Header Bar

A persistent top bar with:
- **Back arrow** — returns to Song List (auto-saves on exit)
- **Song title** — inline editable, tap to rename
- **Key selector** — dropdown with all major/minor keys, plus "Unknown"
- **BPM display + Tap Tempo** — shows current BPM (or "--" if unset). Tap the BPM area to enter tap tempo mode (see Tap Tempo spec below)
- **View switcher** — a toggle group in the toolbar below the header. V1 ships with two views:
  - **Sections view** (default) — vertical stack of collapsible section cards with chord chips and notes. The editing/working view.
  - **Keyboard view** — horizontal scroll of mini piano diagrams showing voicing (blue) and bass (coral) for each chord, grouped by section. A visual reference view that shows exactly how each chord is played.
  - Future views (Sheet, Timeline, etc.) can be added as disabled placeholders in the switcher or added in v2.

#### 2b. Sections View

The default editing view. A vertical stack of sections, displayed in order. Each section is a collapsible card.

**Section toolbar (above the section list):**
- **Expand all / Collapse all** toggle — a single button that toggles all sections open or closed. Icon-based (e.g. double chevron up/down). Useful when reviewing the full song or when wanting a compact overview.

**Section card (collapsed):**
- Section type badge (color-coded: verse = blue, chorus = purple, bridge = orange, etc.)
- Section label (e.g. "Verse 1")
- Chord progression preview (first few chord names as a compact string: "Am → F → C → G")
- Expand/collapse toggle

**Section card (expanded):**
- Full section label (editable)
- Section type selector (dropdown to change type)
- Chord progression row (see Chord Progression Row below)
- Notes text area (freeform, auto-resizing)
- "Delete Section" button (with confirmation)

**Section management:**
- "Add Section" button at the bottom of the list — opens a dropdown to pick section type, then appends a new section
- Drag handle on each section card for reordering (drag-and-drop)
- "Duplicate Section" option in each section's overflow menu

#### 2c. Chord Progression Row

Within each expanded section, chords are displayed as a horizontal scrollable row of "chips."

**Chord chip:**
- Displays chord name (e.g. "Cmaj7")
- Tap to select → shows chord details in the Chord Input Panel
- Drag to reorder within the row
- "×" button to remove

**"+ Add Chord" button** at the end of the row — opens/focuses the Chord Input Panel.

#### 2d. Chord Input Panel

A collapsible panel that slides up from the bottom of the screen (mobile) or appears as a docked panel (desktop). Contains two tabs:

**Tab 1: Piano**

- Interactive piano keyboard visualization, 2 octaves (C3 to B4), scrollable/pannable to reach more octaves on mobile
- **Bass / Voicing toggle** — a prominent two-state switch above or beside the keyboard. User taps "Bass" or "Voicing" to set which layer they're currently adding notes to:
  - **Voicing mode** (default): selected keys highlight in the primary accent color (#7289DA). These are the upper chord tones.
  - **Bass mode**: selected keys highlight in coral (#D85A30). These are the bass/foundation notes.
  - Both layers are visible simultaneously on the keyboard — you can see the full picture of bass + voicing at once
  - The toggle is sticky — stays in the selected mode until switched
- Tap keys to toggle them on/off within the active layer (bass or voicing)
- As keys are selected, the app analyzes the combined bass + voicing notes and displays:
  - **Chord name** (e.g. "Fmaj7") — the most likely chord interpretation
  - **Alternate names** if ambiguous (e.g. "also: Am6")
  - **Intervals** (e.g. "1 - 3 - 5 - 7") in plain terms
  - **Plain English description** (e.g. "F major with a major 7th — dreamy, jazzy")
  - If bass notes differ from root, auto-detect slash chord (e.g. bass = C, voicing = F-A-C → "F/C")
- "Add to Section" button — drops the chord (with both bass and voicing data) into the active section's progression
- "Clear" button — deselects all keys in both layers

**Chord identification logic:**
- Map selected MIDI notes to pitch classes (ignore octave)
- Compare against a dictionary of known chord formulas
- Rank by likelihood: root position triads first, then inversions, then extended chords
- If the combination doesn't match a known chord, display the individual note names and "Unknown chord"
- Prioritize showing the simplest correct name
- Use bass notes to determine slash chord naming (e.g. if bass root differs from chord root)

**Tab 2: Type**

- Text input field with placeholder "Type a chord name..."
- Autocomplete dropdown that filters as you type
- Chord dictionary includes all of: major, minor, 7, maj7, min7, dim, aug, sus2, sus4, add9, 6, min6, 9, maj9, min9, 11, 13, and slash chords (e.g. "C/E") — all must be in v1
- Selecting from autocomplete → shows chord details (same display as Piano tab)
- "Add to Section" button to commit
- When adding via Type tab, voicing/bass arrays are auto-generated from a default voicing for that chord type. User can edit the voicing later via the Piano tab.
- Support for entering custom chord names not in the dictionary

---

## Keyboard View

The second workspace view (alongside Sections view). A visual reference that shows exactly how each chord is played using mini piano diagrams.

**Layout:**
- Chords are grouped by section, flowing vertically down the page
- Each section has a colored label header (same color coding as Sections view)
- Within each section, chords are displayed as a horizontal scrollable row of "chord cards"

**Chord card contents:**
- Chord name at the top (e.g. "Ebmaj7") in monospace font
- **Voicing mini-keyboard** — a small piano graphic (approximately 1 octave range, cropped to the relevant register) showing which keys are pressed for the voicing. Highlighted in the primary accent color (#7289DA).
- **Bass mini-keyboard** — a smaller piano graphic below showing which keys are pressed for the bass. Highlighted in coral (#D85A30).
- Note labels below each mini-keyboard showing the note names
- Lyric snippet below the card (first line or two of the associated lyrics, truncated)

**Mini-keyboard rendering (realistic piano style):**
- Each mini-keyboard is a realistic piano graphic with both white and black keys visible — this is critical for spatial recognition. The black keys provide the visual landmarks that let a player instantly orient to where notes are on a real keyboard.
- The keyboard shows only the range relevant to its notes (crop to the octave(s) containing the pressed notes, with ~2-3 keys of padding on each side for context)
- White keys: light colored (#D4D2CC in dark mode), rectangular, with rounded bottom corners
- Black keys: dark colored (#333), shorter, overlapping white keys in the standard piano pattern (groups of 2 and 3)
- Pressed white keys: filled with the layer color (blue #7289DA for voicing, coral #D85A30 for bass)
- Pressed black keys: filled with the layer color (same blue/coral)
- Unpressed black keys remain dark (#333) — they serve as spatial landmarks even when not played
- Note names appear below the keyboard only for pressed notes, in the corresponding layer color

**Interactions:**
- Tapping a chord card opens the Chord Input Panel pre-loaded with that chord's notes, allowing editing
- Horizontal scroll within each section to see all chords
- Sections are not collapsible in this view — all are always visible for a full visual overview
- The view is read/reference focused — primary editing happens in Sections view or via the Chord Input Panel

**Color legend:**
- A small legend in the view toolbar: blue dot = "Voicing", coral dot = "Bass"

**Responsive behavior:**
- On mobile, chord cards are ~120px wide, scrollable horizontally
- On desktop, chord cards are ~140-160px wide, more visible per row before scrolling

---

## Tap Tempo

Accessible from the header bar's BPM area.

**Behavior:**
1. User taps the BPM button/area
2. First tap starts the counter — display "Tap..."
3. Each subsequent tap records the timestamp
4. After 2+ taps, calculate and display the running average BPM
5. BPM updates live with each tap
6. If no tap received for 3 seconds, finalize the BPM and save it to the song
7. "Reset" option to clear and start over
8. Minimum 2 taps required, recommended 4+ for accuracy

**Calculation:**
- BPM = 60000 / (average interval between taps in milliseconds)
- Round to nearest integer
- Clamp to range 20–300 BPM

---

## Auto-Save

- All changes auto-save to IndexedDB after a 1-second debounce
- No manual save button needed
- `updatedAt` timestamp refreshes on each save
- Visual indicator: small "Saved" text or checkmark that briefly appears after a save

---

## Responsive Design

The app must work well on both phone (propped on piano) and laptop (next to piano).

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px – 1024px
- Desktop: > 1024px

**Key responsive behaviors:**
- Song List: 1-column cards on mobile, 2-3 columns on desktop
- Song Workspace: single column layout on mobile, chord input panel slides up from bottom
- Song Workspace desktop: chord input panel docked to the right side or bottom
- Piano keyboard: horizontally scrollable on mobile, fits comfortably on desktop
- Section cards: full width on all sizes, padding adjusts

**Touch considerations:**
- Piano keys must be large enough for finger taps (~44px minimum touch target)
- Drag handles for reordering must be easy to grab
- Tap tempo button should be large and satisfying to tap

---

## UI/UX Design Direction

**Visual style:**
- Primary accent color: `#7289DA` — used for active states, selected piano keys (voicing), primary buttons, highlights
- Secondary accent color: `#D85A30` (coral) — used for bass notes on piano keyboards and mini-keyboard diagrams
- Clean, minimal, dark mode preferred (easier on eyes in dimly lit practice spaces)
- Light mode available as toggle
- Rounded cards and chips for a friendly feel
- Color-coded section types for quick visual scanning
- The piano keyboard should feel tactile — subtle shadows, key separation

**Typography:**
- Chord names in a monospace or semi-monospace font for clarity
- Song titles and body text in a clean sans-serif
- Notes/lyrics text area in a comfortable reading font at a good size

**Iconography:**
- Minimal icon usage — text labels preferred for clarity
- Music-appropriate icons where used (e.g. metronome for BPM, piano keys, microphone)

---

## Component Architecture

```
App
├── Router (hash-based, no server config needed for GitHub Pages)
│
├── SongListPage
│   ├── SearchBar
│   ├── SongCard[] (mapped from songs list)
│   └── NewSongButton
│
└── SongWorkspacePage
    ├── WorkspaceHeader
    │   ├── BackButton
    │   ├── SongTitleInput
    │   ├── KeySelector
    │   └── TapTempo (BPM display + tap interaction)
    │
    ├── ViewToolbar
    │   ├── ViewSwitcher (Sections | Keyboard)
    │   └── ExpandCollapseAllButton (Sections view only)
    │
    ├── SectionsView (active when view = "sections")
    │   ├── SectionCard[] (mapped from song.sections)
    │   │   ├── SectionHeader (type badge, label, collapse toggle)
    │   │   ├── ChordProgressionRow
    │   │   │   ├── ChordChip[] (mapped from section.chords)
    │   │   │   └── AddChordButton
    │   │   └── NotesTextArea
    │   ├── AddSectionButton
    │   └── DragDropContext (for reordering)
    │
    ├── KeyboardView (active when view = "keyboard")
    │   ├── ColorLegend (voicing = blue, bass = coral)
    │   └── KeyboardSection[] (mapped from song.sections)
    │       ├── SectionLabel (color-coded)
    │       └── ChordCardRow (horizontal scroll)
    │           └── ChordCard[]
    │               ├── ChordName
    │               ├── VoicingMiniKeyboard
    │               ├── BassMiniKeyboard
    │               └── LyricSnippet
    │
    └── ChordInputPanel
        ├── PanelTabs (Piano | Type)
        ├── PianoKeyboard
        │   ├── BassVoicingToggle (switches active input layer)
        │   ├── Key[] (interactive, color-coded by active layer)
        │   └── ChordDisplay (name, intervals, description)
        └── ChordTypeInput
            ├── AutocompleteInput
            └── ChordSuggestionList
```

---

## Build Order (Suggested Implementation Sequence)

### Phase 1: Foundation
1. Project scaffolding — Vite + Preact + TypeScript + Tailwind
2. Dexie.js database setup with Song schema (including bass/voicing chord model)
3. Hash-based router (Song List ↔ Song Workspace)
4. Song List page — create, list, delete songs
5. Basic Song Workspace — header with editable title, key selector, view switcher (Sections | Keyboard)

### Phase 2: Song Structure (Sections View)
6. Section list — add, reorder (drag-and-drop), delete sections
7. Section type selector and color-coded badges
8. Notes text area in each section
9. Expand all / Collapse all toggle
10. Auto-save with debounce

### Phase 3: Chord System
11. Chord data model and chord identification engine (note combination → chord name)
12. Chord progression row with chips (add, reorder, delete)
13. Chord Input Panel — Tab 2: Type (autocomplete text input) — simplest to build first
14. Chord Input Panel — Tab 1: Piano keyboard with Bass/Voicing toggle
15. Chord display (name, intervals, description, slash chord detection)

### Phase 4: Keyboard View
16. Mini-keyboard rendering component (shows pressed keys in a cropped range)
17. Chord card component (voicing mini-keyboard + bass mini-keyboard + chord name + lyric snippet)
18. Keyboard view layout — sections as horizontal scrollable chord card rows
19. Tap-to-edit interaction (tapping a chord card opens the Chord Input Panel pre-loaded)

### Phase 5: Polish & PWA
20. Tap Tempo
21. Dark/light mode toggle
22. Responsive design pass and touch optimization
23. Auto-save indicator
24. Empty states and onboarding hints
25. PWA setup — service worker via Vite PWA plugin, app manifest, icons, offline caching

---

## What Is Explicitly NOT in V1

- User accounts or authentication
- Cloud sync or backend
- AI-powered chord suggestions
- Audio recording or voice memos
- Audio-based chord detection ("Listen" feature — moved to v2)
- Sheet music or standard notation display
- Export (PDF, MIDI, MusicXML, etc.)
- Sharing or collaboration
- Metronome or audio playback
- Tone.js integration
- MIDI input device support
- Song folders or albums (organizing songs into collections)
- Alternative workspace views beyond Sections and Keyboard (Sheet view, Timeline view, Performance view — see Workspace Views note below)
- Next chord auto-suggest — AI-powered or rule-based suggestions for what chord to play next, based on the current progression, key, and common patterns
- Section chord progression indication — visual analysis showing the Roman numeral function of each chord in the key (e.g. I → vi → IV → V), helping the songwriter understand the harmonic movement
- Melody tracking — a way to document melodies alongside chords, potentially via piano roll input, audio humming, or a simplified notation. Would tie into Tone.js for playback.
- Sharing and exporting — export songs as PDF chord charts, MIDI files, MusicXML, or shareable links. Could also include printing support for the Sheet view.
- Time signatures — support for time signatures beyond the implied 4/4 (e.g. 3/4, 6/8, 7/8). Would affect how sections are counted, how the metronome works, and how chord durations are displayed.

All of the above are candidates for v2+.

**Additional v2+ backlog (from user testing):**
- Song list view toggle — option to switch between card grid and a list/table view showing more details (created date, last edited, section count, etc.)
- Keyboard view lyric display — better handling of how lyrics appear with mini keyboard chord cards (current truncation may not be ideal)
- Auto-detect song key — a "detect" option in the Key Selector that analyzes all chords in the song to infer the most likely key. Could use frequency analysis of pitch classes and common key signatures.
- Quick tools section — a "Tools" tab or floating panel with quick access to chord finder, tap tempo, and other utilities without needing to be inside a specific song/section
- Song notepad / scratchpad — a freeform notes area in the song workspace (separate from section notes) for dumping ideas, inspiration, and rough thoughts. Eventually could have a way to pull content from the notepad into sections or vice versa.

**Workspace Views (v2+ planning note):** V1 ships with Sections view and Keyboard view. Future versions should add: a "Sheet" view that lays out the song like a printed chord chart (chords above lyrics, sections flowing naturally), a "Performance" view (simplified, large text, auto-scrolling at BPM for playing live), and potentially a "Timeline" view. The view switcher is already in place from v1.

---

## Resolved Decisions

1. **Chord dictionary scope** — V1 includes all chord types: major, minor, 7, maj7, min7, dim, aug, sus2, sus4, add9, 6, min6, 9, maj9, min9, 11, 13, and slash chords.
2. **Piano keyboard range** — 2 octaves visible by default, scrollable/pannable to reach the full range.
3. **Drag-and-drop library** — To be evaluated during Phase 2. Options include `@dnd-kit` (via preact/compat) or a lightweight custom implementation. Choose based on bundle size and Preact compatibility.
4. **Listen feature** — Deferred to v2. Audio-based chord detection (mic input + pitch detection) is out of scope for v1. The interactive piano keyboard and type input provide reliable chord identification.
5. **Offline PWA** — Yes. V1 includes a service worker (via Vite PWA plugin) for full offline support and "Add to Home Screen" capability. Since all data is local, this is low effort and high value.