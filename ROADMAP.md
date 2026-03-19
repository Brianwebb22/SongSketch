# SongSketch — Roadmap & Backlog

This file tracks all planned features, known issues, and future ideas. It is NOT loaded by Claude Code — reference it in conversations and CC prompts as needed.

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

## V2 Backlog — Prioritized

### Tier 1: High Priority (Next Up)

**Next chord auto-suggest**
Rule-based or AI-powered suggestions for what chord to play next, based on current progression, key, and common patterns. Could start simple (common progression lookup) and get smarter.

**Time signatures**
Support for 3/4, 6/8, 7/8, etc. Affects section counting, metronome, chord duration display. Needs a `duration` field on the Chord model.

**Sheet view**
Chord chart layout like paper — chords above lyrics, sections flowing naturally. Already prototyped in design phase. Same data, new rendering.

### Tier 2: Important

**Auto-detect song key**
A "detect" option in the Key Selector that analyzes all chords to infer the most likely key. Frequency analysis of pitch classes + common key signature matching.

**Chord voicing switcher**
In the Type tab, offer multiple voicing options (root position, inversions, spread voicings, close voicings) to cycle through. Essential to creative exploration.

**Sharing and exporting**
PDF chord charts, MIDI files, MusicXML, shareable links, printing support for Sheet view.

**Song notepad / scratchpad**
Freeform notes area in song workspace (separate from section notes) for ideas and inspiration. Eventually pull content into sections or vice versa.

### Tier 3: Nice to Have

**Song list view enhancements**
Already have grid + list toggle. Could add more filtering, tags management, batch operations.

**Keyboard view lyric display**
Better handling of how lyrics appear with mini keyboard chord cards — current truncation may not be ideal.

**Quick tools section**
A "Tools" tab or floating panel with quick access to chord finder, tap tempo, etc. without needing to be inside a specific song/section.

**Piano minimap**
Small overview of full 88-key piano above chord selector, showing current viewport and all selected notes across the full range.

---

## Future (V3+)

**Listen feature (audio chord detection)**
Mic-based chord identification via Web Audio API + pitch detection. Originally scoped for v1, deferred for complexity. Polyphonic detection is hard — may need a "confirm what I heard" step.

**Melody tracking**
Document melodies alongside chords via piano roll input, audio humming, or simplified notation. Biggest lift on the list — needs Tone.js for playback.

**Metronome / audio playback**
Tone.js integration for hearing chord progressions and keeping time.

**MIDI input device support**
Plug in a MIDI keyboard to input chords directly.

**Guitar mode**
Alternative instrument mode showing chord fingerings on a guitar fretboard diagram instead of/alongside piano keyboard.

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

---

## Completed V2 Features

*(Move items here as they ship)*

- ✓ Keyboard view editing — add sections and chords directly from Keyboard view
- ✓ Song list view toggle — card grid + list/table view with sortable columns
- ✓ Chord degrees (Roman numerals) — shows harmonic analysis based on song key