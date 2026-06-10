# SongSketch — Roadmap & Backlog

This file tracks all planned features, known issues, and future ideas. It is NOT loaded by Claude Code — reference it in conversations and CC prompts as needed.

**Project philosophy:** SongSketch is built to best suit my own needs as a songwriter — not to be a hit app or make money. Competitive research (see RESEARCH.md) is for ideation and comparison only. When prioritizing, "do I want this when I'm writing songs?" beats "would this compete well?"

---

## V1 — Shipped ✓

- Song list with search, card grid + list view toggle, sortable columns, drag-and-drop reorder
- Song workspace with Sections view and Keyboard view
- Chord identification engine (18+ chord types, slash chords)
- Interactive piano with bass/voicing toggle, octave navigation, note label toggle
- Type tab with autocomplete, mini-piano preview, synced state with Piano tab
- Chord degrees (Roman numeral analysis based on song key)
- Tap tempo (manual input + tap mode)
- Drag-and-drop section reordering
- Section management (add, delete, duplicate, collapse/expand all)
- Keyboard view editing (add sections and chords directly)
- Auto-save to IndexedDB
- Dark/light mode toggle
- Responsive design (mobile, tablet, desktop)
- PWA with offline support
- Deployed to GitHub Pages

---

## In Progress (fab branch)

**Chord Finder quick tool + Guitar mode**
Standalone Chord Finder (QuickTools panel) with piano/guitar mode switch. Guitar mode: interactive fretboard input (tap frets, open/muted strings) feeding the chord identification engine, plus a curated chord-shape library for search. Fast-follow ideas: capo support, alternate tunings, "same chord on piano ⇄ guitar" toggle, fretboard diagrams in the song workspace.

---

## V2 Backlog — Prioritized

### Tier 1: High Priority (Next Up)

**Chord playback** *(promoted from V3; research-inspired)*
Hear a chord's voicing + bass via WebAudio/Tone.js. We store exact voicings but can't audition them — low effort, high payoff. Stepping stone to full progression playback/metronome (still V3).

**Time signatures**
Support for 3/4, 6/8, 7/8, etc. Affects section counting, metronome, chord duration display. Needs a `duration` field on the Chord model.

**Sheet view**
Chord chart layout like paper — chords above lyrics, sections flowing naturally. Already prototyped in design phase. Same data, new rendering.

### Tier 2: Important

**Audio sketches (voice memos)** *(research-inspired)*
Record/attach audio snippets to a song or section. Ear players think in recordings first — this completes the "lyrics + chords + audio in one place" picture. IndexedDB handles blobs, so it stays offline/no-backend.

**Sharing and exporting**
PDF chord charts, MIDI files, MusicXML, shareable links, printing support for Sheet view. Also: local backup/restore (export/import a song file) — the natural answer to "IndexedDB-only" without needing accounts or a backend.

**Song notepad / scratchpad**
Freeform notes area in song workspace (separate from section notes) for ideas and inspiration. Eventually pull content into sections or vice versa.

**"Chords in this key" palette** *(research-inspired)*
On the input panel, show diatonic + common borrowed chords for the song key, labeled with Roman numerals — one tap to enter. Builds on the existing degrees + suggest work; gentle guidance, not a generator.

### Tier 3: Nice to Have

**Song list view enhancements**
Already have grid + list toggle. Could add more filtering, tags management, batch operations.

**Keyboard view lyric display**
Better handling of how lyrics appear with mini keyboard chord cards — current truncation may not be ideal.

**Piano minimap**
Small overview of full 88-key piano above chord selector, showing current viewport and all selected notes across the full range.

---

## Future (V3+)

**Listen feature (audio chord detection)**
Mic-based chord identification via Web Audio API + pitch detection. Originally scoped for v1, deferred for complexity. Polyphonic detection is hard — may need a "confirm what I heard" step.

**Melody tracking**
Document melodies alongside chords via piano roll input, audio humming, or simplified notation. Biggest lift on the list — needs Tone.js for playback.

**Metronome / progression playback**
Tone.js integration for hearing full chord progressions and keeping time. (Single-chord playback promoted to V2 Tier 1.)

**MIDI input device support**
Plug in a MIDI keyboard to input chords directly (Web MIDI).

**Performance view**
Simplified large text, auto-scrolling at BPM for playing live.

**Timeline view**
Potential DAW-style horizontal timeline layout.

**User accounts / authentication**
Required for cloud sync and sharing.

**Cloud sync / backend**
Sync song data across devices. Dexie.js schema is already designed to be serializable for this.

**Song folders / albums**
Organize songs into collections.

---

## Known Issues / Polish

- Adjacent note labels on mini-piano in Type tab still overlap in some edge cases — needs a more robust staggering/layout algorithm
- Chord degrees feature is a good start but needs more work to be truly useful (revisit UX)
- Guitar shape library coverage is sparse — chord engine knows ~19 qualities but `guitarShapes.ts` covers majors/minors fully and only patchy 7ths/sus/add9 (no 6, 9, 13, dim7, aug, most m7 roots). The "no standard shape" fallback handles it gracefully. Fix by expanding the data, or better: generate movable barre shapes (E/A forms) algorithmically.
- Enharmonic note spelling ignores chord context — e.g. E major's third displays as "Ab" instead of "G#". `midiToDisplayName` would need chord/key-aware spelling.

---

## Completed V2 Features

*(Move items here as they ship)*

- ✓ Keyboard view editing — add sections and chords directly from Keyboard view
- ✓ Song list view toggle — card grid + list/table view with sortable columns
- ✓ Chord degrees (Roman numerals) — shows harmonic analysis based on song key
- ✓ Next chord auto-suggest — Suggest tab with contextual chord suggestions in Chord Input Panel (PR #5)
- ✓ Chord voicing switcher — cycle voicing options in the Search tab (PR #6)
- ✓ Pre-loaded sample song — House of the Rising Sun for first-run experience (PR #7)
- ✓ Inline keyboard (PR #8)
- ✓ Auto-detect song key — inline suggestions in the Key Selector (PR #9)