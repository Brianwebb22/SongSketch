import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { PianoKeyboard } from './PianoKeyboard.tsx';
import { MiniKeyboard } from './MiniKeyboard.tsx';
import {
  identifyChord,
  searchChords,
  generateDefaultVoicing,
  midiToDisplayName,
} from '../utils/chordEngine.ts';
import { generateVoicings, type ChordVoicing } from '../utils/chordVoicings.ts';

interface ChordFinderProps {
  open: boolean;
  onClose: () => void;
}

export function ChordFinder({ open, onClose }: ChordFinderProps) {
  const [tab, setTab] = useState<'piano' | 'search'>('piano');
  const [activeLayer, setActiveLayer] = useState<'bass' | 'voicing'>('voicing');
  const [bassNotes, setBassNotes] = useState<number[]>([]);
  const [voicingNotes, setVoicingNotes] = useState<number[]>([]);

  const [typeQuery, setTypeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [voicingIndex, setVoicingIndex] = useState(0);
  const [voicingList, setVoicingList] = useState<ChordVoicing[]>([]);

  const typeInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const lastIdentNameRef = useRef('');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTab('piano');
      setActiveLayer('voicing');
      setBassNotes([]);
      setVoicingNotes([]);
      setTypeQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setVoicingIndex(0);
      setVoicingList([]);
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

  const identification = identifyChord(voicingNotes, bassNotes);

  // Sync piano identification → typeQuery
  const identName = identification?.name || '';
  if (identName !== lastIdentNameRef.current) {
    lastIdentNameRef.current = identName;
    if (identName && (voicingNotes.length > 0 || bassNotes.length > 0)) {
      Promise.resolve().then(() => setTypeQuery(identName));
    }
  }

  function handleClearAll() {
    setBassNotes([]);
    setVoicingNotes([]);
    setTypeQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setVoicingIndex(0);
    setVoicingList([]);
    lastIdentNameRef.current = '';
  }

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

  function selectChordFromType(chordName: string) {
    setTypeQuery(chordName);
    setShowSuggestions(false);
    lastIdentNameRef.current = chordName;

    const allVoicings = generateVoicings(chordName);
    setVoicingList(allVoicings);
    setVoicingIndex(0);

    if (allVoicings.length > 0) {
      setVoicingNotes(allVoicings[0].voicing);
      setBassNotes(allVoicings[0].bass);
    } else {
      const voicingData = generateDefaultVoicing(chordName);
      if (voicingData) {
        setVoicingNotes(voicingData.voicing);
        setBassNotes(voicingData.bass);
      }
    }
  }

  function handleVoicingNav(direction: -1 | 1) {
    if (voicingList.length === 0) return;
    const newIndex = (voicingIndex + direction + voicingList.length) % voicingList.length;
    setVoicingIndex(newIndex);
    const v = voicingList[newIndex];
    setVoicingNotes(v.voicing);
    setBassNotes(v.bass);
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

  const notesSummary = [
    ...bassNotes.map((n) => ({ note: midiToDisplayName(n), type: 'bass' as const })),
    ...voicingNotes.map((n) => ({ note: midiToDisplayName(n), type: 'voicing' as const })),
  ];

  const typeVoicingData = (() => {
    if (voicingNotes.length > 0 || bassNotes.length > 0) {
      return { voicing: voicingNotes, bass: bassNotes };
    }
    if (typeQuery.trim()) {
      return generateDefaultVoicing(typeQuery.trim());
    }
    return null;
  })();

  const typeIdentification = (() => {
    if (identification) return identification;
    if (typeQuery.trim() && typeVoicingData) {
      return identifyChord(typeVoicingData.voicing, typeVoicingData.bass);
    }
    return null;
  })();

  return (
    <div
      class="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="bg-surface-card w-full md:max-w-2xl md:rounded-xl border-t md:border border-surface-hover shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div class="flex items-center justify-between p-3 border-b border-surface-hover sticky top-0 bg-surface-card z-10">
          <div class="flex items-center gap-3">
            <h2 class="text-base font-semibold text-text-primary">Chord Finder</h2>
            <div class="flex gap-1 bg-surface rounded-lg p-1">
              <button
                onClick={() => setTab('piano')}
                class={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  tab === 'piano'
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Piano
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
          <button
            onClick={onClose}
            class="text-text-muted hover:text-text-primary transition-colors text-lg px-2"
            aria-label="Close Chord Finder"
          >
            ✕
          </button>
        </div>

        <div class="p-3">
          {tab === 'piano' ? (
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
                  onClick={handleClearAll}
                  class="text-sm text-text-muted hover:text-text-secondary transition-colors"
                >
                  Clear
                </button>
              </div>

              <PianoKeyboard
                bassNotes={bassNotes}
                voicingNotes={voicingNotes}
                activeLayer={activeLayer}
                onToggleNote={handleToggleNote}
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
          ) : (
            <>
              <div class="relative mb-3">
                <div class="flex gap-2">
                  <input
                    ref={typeInputRef}
                    type="text"
                    value={typeQuery}
                    onInput={(e) => handleTypeInput((e.target as HTMLInputElement).value)}
                    onFocus={() => {
                      if (typeQuery.trim()) {
                        setSuggestions(searchChords(typeQuery));
                        setShowSuggestions(true);
                        updateDropdownPos();
                      }
                    }}
                    placeholder="Type a chord name... (e.g. Cmaj7, Dm/A)"
                    class="flex-1 bg-surface-hover text-text-primary text-sm px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-accent font-mono"
                  />
                  {(typeQuery.trim() || voicingNotes.length > 0 || bassNotes.length > 0) && (
                    <button
                      onClick={handleClearAll}
                      class="text-sm text-text-muted hover:text-text-secondary transition-colors px-2 shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && dropdownPos && (
                  <div
                    ref={suggestionsRef}
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
                        onClick={() => selectChordFromType(chord)}
                        class="w-full text-left px-4 py-2 text-sm font-mono text-text-primary hover:bg-surface-hover transition-colors"
                      >
                        {chord}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Voicing layer toggle (parallels Piano tab) */}
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

              {typeIdentification && typeVoicingData && (
                <div class="p-3 bg-surface rounded-xl">
                  <div class="text-2xl font-bold font-mono text-text-primary">
                    {typeIdentification.name}
                  </div>
                  <div class="text-sm text-accent font-mono mt-1">
                    {typeIdentification.intervals}
                  </div>
                  <div class="text-sm text-text-secondary mt-1">
                    {typeIdentification.description}
                  </div>
                  <div class="mt-3 space-y-1">
                    {typeVoicingData.voicing.length > 0 && (
                      <div>
                        <div class="text-[10px] text-accent font-medium mb-0.5">Voicing</div>
                        <MiniKeyboard notes={typeVoicingData.voicing} color="#7289DA" padding={2} />
                      </div>
                    )}
                    {typeVoicingData.bass.length > 0 && (
                      <div>
                        <div class="text-[10px] text-coral font-medium mb-0.5">Bass</div>
                        <MiniKeyboard notes={typeVoicingData.bass} color="#D85A30" padding={2} />
                      </div>
                    )}
                  </div>
                  {voicingList.length > 1 && (
                    <div class="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleVoicingNav(-1)}
                        class="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-hover hover:bg-surface-hover/80 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label="Previous voicing"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M10.5 3L5.5 8l5 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </button>
                      <div class="flex-1 text-center">
                        <div class="text-sm font-medium text-text-primary">
                          {voicingList[voicingIndex]?.label || 'Root position'}
                        </div>
                        <div class="text-[10px] text-text-muted">
                          {voicingIndex + 1} of {voicingList.length}
                        </div>
                      </div>
                      <button
                        onClick={() => handleVoicingNav(1)}
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
          )}
        </div>
      </div>
    </div>
  );
}
