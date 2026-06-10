import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { PianoKeyboard } from './PianoKeyboard.tsx';
import { MiniKeyboard } from './MiniKeyboard.tsx';
import {
  Fretboard,
  emptyFretboardState,
  fretboardToMidi,
  shapeToStringStates,
  type StringState,
} from './Fretboard.tsx';
import {
  identifyChord,
  searchChords,
  generateDefaultVoicing,
  midiToDisplayName,
} from '../utils/chordEngine.ts';
import { generateVoicings, type ChordVoicing } from '../utils/chordVoicings.ts';
import { getGuitarShapes, type GuitarShape } from '../utils/guitarShapes.ts';

interface ChordFinderProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'piano' | 'guitar';
type Tab = 'input' | 'search';

export function ChordFinder({ open, onClose }: ChordFinderProps) {
  const [mode, setMode] = useState<Mode>('piano');
  const [tab, setTab] = useState<Tab>('input');

  // Piano state
  const [activeLayer, setActiveLayer] = useState<'bass' | 'voicing'>('voicing');
  const [bassNotes, setBassNotes] = useState<number[]>([]);
  const [voicingNotes, setVoicingNotes] = useState<number[]>([]);

  // Guitar state
  const [stringStates, setStringStates] = useState<StringState[]>(emptyFretboardState());

  // Shared Search state
  const [typeQuery, setTypeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [pianoVoicingList, setPianoVoicingList] = useState<ChordVoicing[]>([]);
  const [guitarShapeList, setGuitarShapeList] = useState<GuitarShape[]>([]);
  const [pianoVoicingIndex, setPianoVoicingIndex] = useState(0);
  const [guitarShapeIndex, setGuitarShapeIndex] = useState(0);
  const [searchHasNoShape, setSearchHasNoShape] = useState(false);

  const typeInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastIdentNameRef = useRef('');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode('piano');
      setTab('input');
      setActiveLayer('voicing');
      setBassNotes([]);
      setVoicingNotes([]);
      setStringStates(emptyFretboardState());
      setTypeQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setPianoVoicingList([]);
      setGuitarShapeList([]);
      setPianoVoicingIndex(0);
      setGuitarShapeIndex(0);
      setSearchHasNoShape(false);
      lastIdentNameRef.current = '';
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ── Piano interactions ────────────────────────────────────────────
  const handleToggleNote = useCallback((midi: number) => {
    if (activeLayer === 'bass') {
      setBassNotes((prev) =>
        prev.includes(midi) ? prev.filter((n) => n !== midi) : [...prev, midi],
      );
    } else {
      setVoicingNotes((prev) =>
        prev.includes(midi) ? prev.filter((n) => n !== midi) : [...prev, midi],
      );
    }
  }, [activeLayer]);

  const pianoIdentification = identifyChord(voicingNotes, bassNotes);

  // ── Guitar interactions ───────────────────────────────────────────
  const guitarMidi = useMemo(() => fretboardToMidi(stringStates), [stringStates]);
  // Lowest fretted fret — highlighted on the fret number rail as a position cue
  const frettedFrets = stringStates.filter((s): s is number => typeof s === 'number');
  const highlightFret = frettedFrets.length > 0 ? Math.min(...frettedFrets) : null;
  const guitarIdentification = useMemo(() => {
    if (guitarMidi.length === 0) return null;
    const sorted = [...guitarMidi].sort((a, b) => a - b);
    const bass = [sorted[0]];
    const voicing = sorted.slice(1);
    return identifyChord(voicing, bass);
  }, [guitarMidi]);

  // Sync active-mode identification → typeQuery
  const activeIdentification = mode === 'piano' ? pianoIdentification : guitarIdentification;
  const identName = activeIdentification?.name || '';
  if (identName !== lastIdentNameRef.current) {
    lastIdentNameRef.current = identName;
    if (identName) {
      const hasNotes =
        mode === 'piano'
          ? voicingNotes.length > 0 || bassNotes.length > 0
          : guitarMidi.length > 0;
      if (hasNotes) {
        Promise.resolve().then(() => setTypeQuery(identName));
      }
    }
  }

  // ── Clear ─────────────────────────────────────────────────────────
  function handleClearAll() {
    setBassNotes([]);
    setVoicingNotes([]);
    setStringStates(emptyFretboardState());
    setTypeQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setPianoVoicingList([]);
    setGuitarShapeList([]);
    setPianoVoicingIndex(0);
    setGuitarShapeIndex(0);
    setSearchHasNoShape(false);
    lastIdentNameRef.current = '';
  }

  function handleClearFretboard() {
    setStringStates(emptyFretboardState());
    if (tab === 'input') {
      lastIdentNameRef.current = '';
    }
  }

  // ── Search ────────────────────────────────────────────────────────
  function updateDropdownPos() {
    if (typeInputRef.current) {
      const rect = typeInputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }

  function handleTypeInput(value: string) {
    setTypeQuery(value);
    if (value.trim()) {
      setSuggestions(searchChords(value));
      setShowSuggestions(true);
      updateDropdownPos();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function applyPianoVoicing(v: ChordVoicing) {
    setVoicingNotes(v.voicing);
    setBassNotes(v.bass);
  }

  function applyGuitarShape(s: GuitarShape) {
    setStringStates(shapeToStringStates(s.frets));
  }

  function selectChordFromType(chordName: string) {
    setTypeQuery(chordName);
    setShowSuggestions(false);
    lastIdentNameRef.current = chordName;

    // Piano voicings
    const pianoVoicings = generateVoicings(chordName);
    setPianoVoicingList(pianoVoicings);
    setPianoVoicingIndex(0);
    if (pianoVoicings.length > 0) {
      applyPianoVoicing(pianoVoicings[0]);
    } else {
      const fallback = generateDefaultVoicing(chordName);
      if (fallback) {
        setVoicingNotes(fallback.voicing);
        setBassNotes(fallback.bass);
      }
    }

    // Guitar shapes
    const shapes = getGuitarShapes(chordName);
    setGuitarShapeList(shapes);
    setGuitarShapeIndex(0);
    if (shapes.length > 0) {
      applyGuitarShape(shapes[0]);
      setSearchHasNoShape(false);
    } else {
      setStringStates(emptyFretboardState());
      setSearchHasNoShape(true);
    }
  }

  function handleVoicingNav(direction: -1 | 1) {
    if (mode === 'piano') {
      if (pianoVoicingList.length === 0) return;
      const next = (pianoVoicingIndex + direction + pianoVoicingList.length) % pianoVoicingList.length;
      setPianoVoicingIndex(next);
      applyPianoVoicing(pianoVoicingList[next]);
    } else {
      if (guitarShapeList.length === 0) return;
      const next = (guitarShapeIndex + direction + guitarShapeList.length) % guitarShapeList.length;
      setGuitarShapeIndex(next);
      applyGuitarShape(guitarShapeList[next]);
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        typeInputRef.current !== e.target
      ) {
        setShowSuggestions(false);
      }
    }
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showSuggestions]);

  if (!open) return null;

  // ── Search tab visualization data ─────────────────────────────────
  const pianoTypeVoicingData = (() => {
    if (voicingNotes.length > 0 || bassNotes.length > 0) {
      return { voicing: voicingNotes, bass: bassNotes };
    }
    if (typeQuery.trim()) {
      return generateDefaultVoicing(typeQuery.trim());
    }
    return null;
  })();

  const searchIdentification = (() => {
    const ident = mode === 'piano' ? pianoIdentification : guitarIdentification;
    if (ident) return ident;
    if (typeQuery.trim() && pianoTypeVoicingData) {
      return identifyChord(pianoTypeVoicingData.voicing, pianoTypeVoicingData.bass);
    }
    return null;
  })();

  const notesSummary = [
    ...bassNotes.map((n) => ({ note: midiToDisplayName(n), type: 'bass' as const })),
    ...voicingNotes.map((n) => ({ note: midiToDisplayName(n), type: 'voicing' as const })),
  ];

  // Voicing nav state for current mode
  const navList: { label: string }[] =
    mode === 'piano'
      ? pianoVoicingList.map((v) => ({ label: v.label }))
      : guitarShapeList.map((s) => ({ label: s.label }));
  const navIndex = mode === 'piano' ? pianoVoicingIndex : guitarShapeIndex;

  // Guitar identification — sounding note names list
  const guitarSoundingNotes = guitarMidi
    .slice()
    .sort((a, b) => a - b)
    .map((m) => midiToDisplayName(m));

  return (
    <div
      class="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="bg-surface-card w-full md:max-w-3xl md:rounded-xl border-t md:border border-surface-hover shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header: title, mode toggle, close */}
        <div class="flex items-center justify-between p-3 border-b border-surface-hover sticky top-0 bg-surface-card z-10">
          <div class="flex items-center gap-3 min-w-0">
            <h2 class="text-base font-semibold text-text-primary shrink-0">Chord Finder</h2>
            <div class="flex gap-1 bg-surface rounded-lg p-1">
              <button
                onClick={() => setMode('piano')}
                class={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === 'piano'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Piano
              </button>
              <button
                onClick={() => setMode('guitar')}
                class={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === 'guitar'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Guitar
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            class="text-text-muted hover:text-text-primary transition-colors text-lg px-2"
            aria-label="Close Chord Finder"
          >
            ✕
          </button>
        </div>

        {/* Tab selector: Input | Search */}
        <div class="px-3 pt-3">
          <div class="flex gap-1 bg-surface rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab('input')}
              class={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                tab === 'input'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {mode === 'piano' ? 'Piano' : 'Fretboard'}
            </button>
            <button
              onClick={() => setTab('search')}
              class={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                tab === 'search'
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Search
            </button>
          </div>
        </div>

        <div class="p-3">
          {tab === 'input' ? (
            mode === 'piano' ? (
              <PianoInputView
                activeLayer={activeLayer}
                setActiveLayer={setActiveLayer}
                bassNotes={bassNotes}
                voicingNotes={voicingNotes}
                onToggleNote={handleToggleNote}
                identification={pianoIdentification}
                notesSummary={notesSummary}
                onClear={handleClearAll}
              />
            ) : (
              <GuitarInputView
                stringStates={stringStates}
                onChange={setStringStates}
                highlightFret={highlightFret}
                identification={guitarIdentification}
                soundingNotes={guitarSoundingNotes}
                onClear={handleClearFretboard}
              />
            )
          ) : (
            <SearchView
              mode={mode}
              typeQuery={typeQuery}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              dropdownPos={dropdownPos}
              typeInputRef={typeInputRef}
              suggestionsRef={suggestionsRef}
              onTypeInput={handleTypeInput}
              onTypeFocus={() => {
                if (typeQuery.trim()) {
                  setSuggestions(searchChords(typeQuery));
                  setShowSuggestions(true);
                  updateDropdownPos();
                }
              }}
              onSelectChord={selectChordFromType}
              onClear={handleClearAll}
              activeLayer={activeLayer}
              setActiveLayer={setActiveLayer}
              identification={searchIdentification}
              pianoTypeVoicingData={pianoTypeVoicingData}
              navList={navList}
              navIndex={navIndex}
              onVoicingNav={handleVoicingNav}
              stringStates={stringStates}
              onFretboardChange={setStringStates}
              highlightFret={highlightFret}
              hasNoShape={searchHasNoShape && mode === 'guitar'}
              hasInput={
                typeQuery.trim().length > 0 ||
                voicingNotes.length > 0 ||
                bassNotes.length > 0 ||
                guitarMidi.length > 0
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Piano input subview
// ─────────────────────────────────────────────────────────────────────
function PianoInputView({
  activeLayer,
  setActiveLayer,
  bassNotes,
  voicingNotes,
  onToggleNote,
  identification,
  notesSummary,
  onClear,
}: {
  activeLayer: 'bass' | 'voicing';
  setActiveLayer: (l: 'bass' | 'voicing') => void;
  bassNotes: number[];
  voicingNotes: number[];
  onToggleNote: (midi: number) => void;
  identification: ReturnType<typeof identifyChord>;
  notesSummary: { note: string; type: 'bass' | 'voicing' }[];
  onClear: () => void;
}) {
  return (
    <>
      <div class="flex items-center gap-2 mb-3">
        <button
          onClick={() => setActiveLayer('voicing')}
          class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeLayer === 'voicing'
              ? 'bg-accent text-white'
              : 'bg-surface-hover text-text-secondary'
          }`}
        >
          Voicing
        </button>
        <button
          onClick={() => setActiveLayer('bass')}
          class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeLayer === 'bass'
              ? 'bg-coral text-white'
              : 'bg-surface-hover text-text-secondary'
          }`}
        >
          Bass
        </button>
        <div class="flex-1" />
        <button
          onClick={onClear}
          class="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Clear
        </button>
      </div>

      <PianoKeyboard
        bassNotes={bassNotes}
        voicingNotes={voicingNotes}
        activeLayer={activeLayer}
        onToggleNote={onToggleNote}
      />

      {identification ? (
        <div class="mt-3 p-3 bg-surface rounded-xl">
          <div class="flex items-baseline gap-3">
            <span class="text-2xl font-bold font-mono text-text-primary">
              {identification.name}
            </span>
            {identification.alternateNames.length > 0 && (
              <span class="text-xs text-text-muted">
                also: {identification.alternateNames.join(', ')}
              </span>
            )}
          </div>
          <div class="text-sm text-accent font-mono mt-1">
            {identification.intervals}
          </div>
          <div class="text-sm text-text-secondary mt-1">
            {identification.description}
          </div>
          {notesSummary.length > 0 && (
            <div class="flex gap-2 mt-2 flex-wrap">
              {notesSummary.map((n, i) => (
                <span
                  key={i}
                  class={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    n.type === 'bass'
                      ? 'bg-coral/20 text-coral'
                      : 'bg-accent/20 text-accent'
                  }`}
                >
                  {n.note}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div class="mt-3 p-4 bg-surface rounded-xl text-center text-sm text-text-muted">
          Tap keys to build a chord — its name and intervals will appear here.
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Guitar input subview
// ─────────────────────────────────────────────────────────────────────
function GuitarInputView({
  stringStates,
  onChange,
  highlightFret,
  identification,
  soundingNotes,
  onClear,
}: {
  stringStates: StringState[];
  onChange: (updater: (prev: StringState[]) => StringState[]) => void;
  highlightFret: number | null;
  identification: ReturnType<typeof identifyChord>;
  soundingNotes: string[];
  onClear: () => void;
}) {
  return (
    <>
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-text-muted">
          Tap a fret to fret. Tap the nut for open. Tap a string's letter (or long-press the string) to mute.
        </p>
        <button
          onClick={onClear}
          class="text-sm text-text-muted hover:text-text-secondary transition-colors shrink-0"
        >
          Clear fretboard
        </button>
      </div>

      <Fretboard stringStates={stringStates} onChange={onChange} highlightFret={highlightFret} />

      {identification ? (
        <div class="mt-3 p-3 bg-surface rounded-xl">
          <div class="flex items-baseline gap-3">
            <span class="text-2xl font-bold font-mono text-text-primary">
              {identification.name}
            </span>
            {identification.alternateNames.length > 0 && (
              <span class="text-xs text-text-muted">
                also: {identification.alternateNames.join(', ')}
              </span>
            )}
          </div>
          <div class="text-sm text-accent font-mono mt-1">
            {identification.intervals}
          </div>
          <div class="text-sm text-text-secondary mt-1">
            {identification.description}
          </div>
          {soundingNotes.length > 0 && (
            <div class="flex gap-2 mt-2 flex-wrap">
              {soundingNotes.map((n, i) => (
                <span
                  key={i}
                  class={`text-xs px-1.5 py-0.5 rounded font-mono ${
                    i === 0
                      ? 'bg-coral/20 text-coral'
                      : 'bg-accent/20 text-accent'
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div class="mt-3 p-4 bg-surface rounded-xl text-center text-sm text-text-muted">
          Tap frets to build a chord — its name and intervals will appear here.
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Search subview (shared, mode-aware visualization)
// ─────────────────────────────────────────────────────────────────────
function SearchView({
  mode,
  typeQuery,
  suggestions,
  showSuggestions,
  dropdownPos,
  typeInputRef,
  suggestionsRef,
  onTypeInput,
  onTypeFocus,
  onSelectChord,
  onClear,
  activeLayer,
  setActiveLayer,
  identification,
  pianoTypeVoicingData,
  navList,
  navIndex,
  onVoicingNav,
  stringStates,
  onFretboardChange,
  highlightFret,
  hasNoShape,
  hasInput,
}: {
  mode: Mode;
  typeQuery: string;
  suggestions: string[];
  showSuggestions: boolean;
  dropdownPos: { top: number; left: number; width: number } | null;
  typeInputRef: { current: HTMLInputElement | null };
  suggestionsRef: { current: HTMLDivElement | null };
  onTypeInput: (v: string) => void;
  onTypeFocus: () => void;
  onSelectChord: (name: string) => void;
  onClear: () => void;
  activeLayer: 'bass' | 'voicing';
  setActiveLayer: (l: 'bass' | 'voicing') => void;
  identification: ReturnType<typeof identifyChord>;
  pianoTypeVoicingData: { voicing: number[]; bass: number[] } | null;
  navList: { label: string }[];
  navIndex: number;
  onVoicingNav: (direction: -1 | 1) => void;
  stringStates: StringState[];
  onFretboardChange: (updater: (prev: StringState[]) => StringState[]) => void;
  highlightFret: number | null;
  hasNoShape: boolean;
  hasInput: boolean;
}) {
  return (
    <>
      <div class="relative mb-3">
        <div class="flex gap-2">
          <input
            ref={typeInputRef as any}
            type="text"
            value={typeQuery}
            onInput={(e) => onTypeInput((e.target as HTMLInputElement).value)}
            onFocus={onTypeFocus}
            placeholder="Type a chord name... (e.g. Cmaj7, Dm/A)"
            class="flex-1 bg-surface-hover text-text-primary text-sm px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-accent font-mono"
          />
          {hasInput && (
            <button
              onClick={onClear}
              class="text-sm text-text-muted hover:text-text-secondary transition-colors px-2 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
        {showSuggestions && suggestions.length > 0 && dropdownPos && (
          <div
            ref={suggestionsRef as any}
            class="bg-surface-card border border-surface-hover rounded-xl shadow-lg max-h-48 overflow-y-auto"
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
          >
            {suggestions.map((chord) => (
              <button
                key={chord}
                onClick={() => onSelectChord(chord)}
                class="w-full text-left px-4 py-2 text-sm font-mono text-text-primary hover:bg-surface-hover transition-colors"
              >
                {chord}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voicing layer toggle — only for piano mode */}
      {mode === 'piano' && (
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-text-muted">Highlight:</span>
          <button
            onClick={() => setActiveLayer('voicing')}
            class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeLayer === 'voicing'
                ? 'bg-accent text-white'
                : 'bg-surface-hover text-text-secondary'
            }`}
          >
            Voicing
          </button>
          <button
            onClick={() => setActiveLayer('bass')}
            class={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              activeLayer === 'bass'
                ? 'bg-coral text-white'
                : 'bg-surface-hover text-text-secondary'
            }`}
          >
            Bass
          </button>
        </div>
      )}

      {hasNoShape && (
        <div class="p-3 mb-3 rounded-xl border border-surface-hover bg-surface text-sm text-text-secondary">
          No standard guitar shape for <span class="font-mono">{typeQuery.trim()}</span>.
          Switch to the Fretboard tab to enter a fingering manually.
        </div>
      )}

      {identification && (
        <div class="p-3 bg-surface rounded-xl">
          <div class="text-2xl font-bold font-mono text-text-primary">
            {identification.name}
          </div>
          <div class="text-sm text-accent font-mono mt-1">
            {identification.intervals}
          </div>
          <div class="text-sm text-text-secondary mt-1">
            {identification.description}
          </div>

          {/* Mode-specific visualization */}
          <div class="mt-3">
            {mode === 'piano' && pianoTypeVoicingData ? (
              <div class="space-y-1">
                {pianoTypeVoicingData.voicing.length > 0 && (
                  <div>
                    <div class="text-[10px] text-accent font-medium mb-0.5">Voicing</div>
                    <MiniKeyboard notes={pianoTypeVoicingData.voicing} color="#7289DA" padding={2} />
                  </div>
                )}
                {pianoTypeVoicingData.bass.length > 0 && (
                  <div>
                    <div class="text-[10px] text-coral font-medium mb-0.5">Bass</div>
                    <MiniKeyboard notes={pianoTypeVoicingData.bass} color="#D85A30" padding={2} />
                  </div>
                )}
              </div>
            ) : mode === 'guitar' ? (
              <Fretboard stringStates={stringStates} onChange={onFretboardChange} highlightFret={highlightFret} />
            ) : null}
          </div>

          {/* Voicing/shape navigator */}
          {navList.length > 1 && (
            <div class="mt-3 flex items-center gap-2">
              <button
                onClick={() => onVoicingNav(-1)}
                class="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-hover hover:bg-surface-hover/80 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Previous voicing"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <div class="flex-1 text-center">
                <div class="text-sm font-medium text-text-primary">
                  {navList[navIndex]?.label || 'Default'}
                </div>
                <div class="text-[10px] text-text-muted">
                  {navIndex + 1} of {navList.length}
                </div>
              </div>
              <button
                onClick={() => onVoicingNav(1)}
                class="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-hover hover:bg-surface-hover/80 text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Next voicing"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5.5 3L10.5 8l-5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
