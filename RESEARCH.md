# SongSketch — Competitive Landscape Research

*Researched June 9, 2026 (agent-assisted web research). Pricing verified against vendor pages or App Store data as of June 2026 unless flagged as uncertain.*

> **How to use this document:** These notes are for ideation and comparison only. SongSketch's goal is to best suit my own needs as a songwriter, not to compete commercially or chase a hit app. Feature ideas here are inputs to the roadmap, filtered through "do I actually want this?" — see the project philosophy note in ROADMAP.md.

## Comparison Table

| Product | What it is | Platform | Pricing | Chord ID from played notes | Song structure (sections) | Piano + guitar views | Offline / no-account | Serves play-by-ear non-readers? |
|---|---|---|---|---|---|---|---|---|
| **SongSketch** (us) | Song documentation workbench | Web PWA | Free | Yes (notes → name, bass+voicing) | Yes (typed sections, notes/lyrics) | Piano now, guitar in progress | Yes (IndexedDB, no account) | Core focus |
| **Hookpad** (Hooktheory) | Theory-driven sketchpad/composer | Web | Free tier; $7.99/mo or $199 lifetime; Aria AI +$14.99/mo | Via MIDI input (paid) | Partial (linear arrangement, not labeled sections) | No guitar views | Account; cloud save; online | Partially (teaches theory as you go) |
| **Song Cage** | Songwriter chord+lyric canvas | Web (desktop); mobile capture-only | Free tier (1 active song after trial); Pro sub | No (palette-driven, not note input) | Yes (sections, per-section keys) | Yes — both, capo-aware | Account required, cloud | Yes — explicitly |
| **Scaler 3** | "Music theory workstation" plugin | VST/AU/AAX + standalone (Win/macOS/iPad) | $99 one-time; iPad $19.99 | Yes (MIDI & audio detect) | Partial (timeline/sections in plugin) | Yes incl. guitar panel | Yes (local app), no account | Partially (producer-oriented, dense) |
| **Chordify** | Chords-from-any-song player | Web, iOS, Android | Free (4 songs/day); Premium ~$8.99/mo | From recordings (not your playing) | No | Yes (piano/guitar/uke animations) | No (account, streaming) | Yes — learning side, not writing |
| **ChordChord** | AI progression generator | Web | $9.99 30-day trial → $27/mo | Yes (mic input: strum/play to input) | No | Charts for piano & guitar | No (login, cloud) | Yes (markets "no theory needed") |
| **Tonality** | Chord/scale reference + MIDI tools | iOS/iPadOS (AUv3) | $7.99 one-time | Yes (reverse search + mic ML) | No | Yes — both, custom tunings | Yes (fully local) | Yes (reference, not song organizer) |
| **Suggester 2** | Progression builder by harmonic function | iOS, macOS (AUv3) | Free + IAP unlock | Partial (MIDI input) | No | Piano-centric | Yes (local app) | Yes (Roman-numeral guided) |
| **OtoTheory** | Progression builder w/ backing grooves | iOS + web | Free tier; Pro $2.99/mo | No | Yes (Verse/Chorus/Bridge — Pro) | Yes (fretboard + keyboard overlays) | Partial (3 local sketches free) | Yes |
| **Chord ai** | Real-time AI chord recognition | iOS, Android | Free + premium sub | From audio/mic (not note entry) | No | Yes (shows shapes) | Partial | Yes — ear-players learning songs |
| **Moises** | Stem separation + chord finder suite | Web, desktop, iOS, Android | Free tier; Premium sub | From audio recordings | No | Limited | No (account) | Yes — learning/practice side |
| **Captain Plugins Epic** | Chords-to-arrangement suite | VST/AU + standalone | $99 one-time | No | Partial (arrangement-oriented) | No | Local app | Partially |
| **Songwriter's Pad + Lyrics AI** | AI lyric organizer/recorder | iOS/iPadOS/macOS | Free + $12.99/mo or $79/yr | No | Yes (lyric blocks per section) | No | No | Lyrics only — no chords/theory |
| **BandLab** | Free social DAW w/ SongStarter AI | Web, iOS, Android | Free (verify current tiers) | No | DAW arrangement, not labeled song-doc | No | No (account, cloud) | Partially |
| **Ultimate Guitar Pro** | Tab/chord database + tools | Web, iOS, Android | Subscription (~$25–40/yr, uncertain) | No | Reading others' songs | Guitar-first; some piano | No | Yes — reading, not writing |

Defunct / unverifiable: **Uberchord** sunsetted Aug 2024; **SongSpace** redirects to Downtown Music corporate site, product status unclear; **Simply Songwriter** page 404s, possibly discontinued; **"Kit" songwriting app** could not be verified.

## Major Competitors in Depth

### Hookpad (Hooktheory) — hooktheory.com/hookpad
The most established "smart songwriting" web app, built on the TheoryTab database of 75,000+ crowd-analyzed songs. Write chords and melody on a color-coded, scale-degree-based grid; "Magic Chords" suggests the statistically most common next chord; 500+ instrument sounds; exports MIDI/MP3/sheet music. Free tier covers chords, melody, transposition, unlimited cloud saves; Standard $7.99/mo or $199 lifetime; "Aria" generative-AI copilot +$14.99/mo.

Closest "serious" competitor on theory visualization (its UI is Roman-numeral-first), but it's a *composition* tool, not a *documentation* tool — it assumes you write inside Hookpad, not capture what you played on your instrument. No guitar fretboard, no concept of "how I voiced this chord," MIDI input paywalled, account + connectivity required, real learning curve. Its most-praised features: the 75k-song progression database and "chords that work in your key" palette.

### Song Cage — songcage.com
Newer (2025–26) web app; arguably the most direct competitor. Chord palette with Roman numerals, borrowed chords and secondary dominants labeled by mode, modulation panel with pivot-chord routes, **both capo-aware guitar shapes and piano voicings (Close/Open/Spread/Drop-2 + inversions)**, lyric workspace, voice recording, section-based structure with per-section key overrides. Free tier limits to one editable song after a 14-day Pro trial. (Source includes Song Cage's own blog roundup, which ranks itself #1 — self-claims, though its competitor data cross-checked accurately.)

Key differences: suggestion-engine-driven (tells you what to play next) rather than capture-driven (you tell it what you played); full editor is desktop-browser-only with capture-only mobile apps; requires account + cloud. Does not identify chords from notes entered on an instrument UI. SongSketch's offline-first, no-account, "document what your hands actually did" stance is genuinely different — but Song Cage shows active commercial energy in exactly this segment, marketing squarely at our user ("learn what your ear was already doing").

### Scaler 3 (Scaler Music) — scalermusic.com
Market-leading chord workstation for producers (March 2025): plugin + standalone macOS/Windows/iPad. Detects chords/keys from MIDI **and audio**, huge chord/voicing library with guitar panels, 1,000+ curated progressions, arrange timeline, performance playback. $99 one-time (~$79 on sale); iPad $19.99. Glowing press.

Weaknesses for our user: dense, production-oriented, $99, no lyrics, no song-documentation model, no quick-capture workflow. Telling user quote: *"When I'm writing a song from scratch, guitar in hand, idea in my head, I need something I can open in 10 seconds. That's not Scaler."* — basically SongSketch's positioning statement.

### Chordify — chordify.net
Audio-to-chords at massive scale: paste a YouTube link or pick from a 36M-song index, get a synchronized scrolling chord chart with **animated piano, guitar, and ukulele views**. 32,800+ App Store ratings at 4.7 — by far the largest user base here, and proof that "ear players who can't read music" is a huge market. Free ~4 songs/day; Premium ~$8.99/mo (transpose, capo hints, slow-down, looping, MIDI/PDF export).

Analysis-only — cannot capture or organize *your own* songs. A complement, not a substitute: our user likely uses Chordify for covers and has nowhere to put their originals.

### ChordChord — chordchord.com
Browser AI progression generator: prompt-to-demo, genre templates, drums/melody layering, MIDI/WAV/stems/PDF export, and notably **chord input by playing piano or strumming guitar into the mic**, with charts for both piano and guitar. Pricing: $9.99 30-day trial rolling into **$27/month** — widely seen as high for hobbyists, leaving room underneath for a free tool. A generator, not a workbench: no structure, no lyrics-per-section, projects locked behind subscription.

### Tonality: Music Theory — tonality-app.com
Beloved indie iOS reference app: $7.99 one-time, 4.84★. 1,000+ chord dictionary **for piano and guitar** with custom tunings, reverse chord search from piano or fretboard input, mic chord ID via ML, scales, interactive circle of fifths with Roman-numeral analysis, ear training, four AUv3 MIDI plugins. Fully local, no account.

Validates several SongSketch mechanics (reverse lookup, piano+fretboard duality, one-time/free pricing, offline) but it's a *reference*, not a *songbook* — no songs, sections, lyrics, BPM. Apple-only. SongSketch is effectively "Tonality's chord-ID brain attached to a song organizer," which nothing in this table fully offers.

### Suggester 2 — mathieurouthier.com/suggester
iOS/macOS progression builder organized around harmonic function and Roman numerals — forward (key→chords) and reverse (chords→key) modes, AUv3 plugin. Free with IAP unlock; ~4.5★. Apple-only, piano/abstract-chip oriented; a progression tool, not song documentation.

### OtoTheory — ototheory.com
Budget iOS+web progression builder for guitar/bass/keys: real-time fretboard and keyboard overlays, live key/scale detection with "fit percentage," backing grooves, and — in Pro ($2.99/mo) — **Verse/Chorus/Bridge section management** and multi-track MIDI export. Free: 3 local sketches. Closest competitor on the "sections + both instruments + cheap" axis; shallower theory, no lyrics, no chord-ID from played notes.

### Chord ai / Moises — honorable mentions for chord capture
**Chord ai** (iOS/Android): real-time ML chord recognition from mic/audio. **Moises** (all platforms, 70M users, iPad App of the Year 2024): stem separation, chord finder, speed changer, AI studio. Both serve ear players learning existing music; neither organizes original songs or captures exact voicings.

### Lyric-side competitors (brief)
**Songwriter's Pad + Lyrics AI** (iOS/macOS, $12.99/mo or $79/yr): AI lyrics, rhyme tools, recording, section-based lyric blocks — zero chord/theory features, middling ratings. **Hum** (iOS, ~$2.99): minimal lyrics+voice-memo capture, much loved but stagnant. **BandLab/Soundtrap**: cloud DAWs, not songwriter-terms documentation. **Ultimate Guitar**: dominant for consuming chord sheets; its personal-tab editor is text ChordPro-style, no chord ID or voicing capture.

## Gaps and Opportunities

1. **Nobody combines capture + organization.** The market splits into (i) generators/suggesters (Hookpad, Scaler, ChordChord, Suggester, Song Cage), (ii) analyzers of recordings (Chordify, Chord ai, Moises), and (iii) lyric notebooks (Songwriter's Pad, Hum). Reddit r/Songwriting threads repeatedly ask for the missing quadrant: *"one place… that would have my recordings, lead sheets/chord charts and lyrics"*, *"an app I can keep lyrics, chords and audio in… like Google Keep but for music"*. SongSketch is the only tool surveyed built around that request.
2. **Voicing fidelity is unique.** No competitor stores *how you played* a chord (bass vs. upper voicing as separate layers). Defensible differentiator — lean into it in messaging.
3. **Offline + no-account + free is an empty corner.** Everything comparable requires accounts and/or subscriptions ($2.99–$27/mo) except one-time-purchase native apps. A free, installable, offline PWA has zero direct competition.
4. **Cross-instrument chord representation is rare.** Only Tonality, Chordify (display-only), and Song Cage do piano *and* guitar well. The in-progress fretboard work closes the biggest gap vs. Song Cage; capo support and alternate tunings are the next asks guitarists will have.
5. **Risks/threats:** Song Cage is moving fast in this exact niche; Scaler 3's standalone+iPad release drops its DAW barrier; AI generation is where new entrants cluster — though generation is largely orthogonal to the documentation thesis.
6. **What users love elsewhere:** Hookpad's "every chord that works in your key" palette and Magic Chords; Chordify's instant gratification and animated instrument views; Tonality's one-time pricing and responsive solo dev; OtoTheory's play-along grooves; Scaler's audio playback of voicings.

## Feature Ideas Ranked by Fit to SongSketch's Niche

1. **Audio sketch per section/song (voice-memo attach)** — most-requested missing piece in every Reddit organization thread; ear players think in recordings first. Fits offline IndexedDB storage (blobs).
2. **Finish guitar fretboard/shape support, with capo + alternate tunings and "same chord on piano ⇄ guitar" toggle** — directly counters Song Cage/Tonality, serves the emerging guitarist audience.
3. **Chord playback (hear voicing + bass via WebAudio)** — every competitor plays chords; capturing a voicing you can't audition is a felt gap. Low effort, high payoff.
4. **"Chords in this key" palette on the input panel (diatonic + common borrowed, Roman-numeral labeled)** — degrees are already computed; inverting them into gentle suggestions fits the play-by-ear learner without becoming a generator.
5. **Export/share: PDF/text chord sheet (ChordPro-ish) and MIDI of voicings** — recurring forum ask; makes SongSketch a hub rather than a silo; client-side generation pairs with no-backend.
6. **MIDI keyboard input (Web MIDI)** — Hookpad paywalls this; SongSketch could give it free.
7. **Local backup/restore + optional file-based sync** — the #1 caveat users will raise about IndexedDB-only storage; an export-file answer preserves the no-account stance.
8. **Mic-based chord detection** — flashy but heavy ML for marginal gain over note-entry flow; lowest priority.

**Bottom line:** SongSketch's combination — capture what you actually played (two-layer voicings), organize it into labeled song sections with lyrics/BPM/key, show the theory (Roman numerals) without requiring it, on both piano and guitar, free, offline, no account — is not offered by any product surveyed. Nearest threats: Song Cage (same audience, suggestion-led, account/cloud) and OtoTheory (sections + dual-instrument, cheap, no capture). Clearest wins: audio attachments, chord playback, and finishing the guitar work.
