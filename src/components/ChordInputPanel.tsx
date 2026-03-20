import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { PianoKeyboard } from './PianoKeyboard.tsx';
import { MiniKeyboard } from './MiniKeyboard.tsx';
import {
  identifyChord,
  searchChords,
  generateDefaultVoicing,
  midiToDisplayName,
} from '../utils/chordEngine.ts';
import { suggestNextChords, type ChordSuggestion } from '../utils/chordSuggest.ts';
import type { Chord } from '../db.ts';

interface ChordInputPanelProps {
  open: boolean;
  onClose: () => void;
  onAddChord: (chord: Omit<Chord, 'id' | 'order'>) => void;
  editingChord?: Chord | null;  // pre-load for editing
  onUpdateChord?: (chord: Chord) => void;
  songKey?: string | null;
  sectionChords?: Chord[];
  sameTypeChords?: Chord[];     // chords from other sections of the same type
  allSongChords?: Chord[];
}

export function ChordInputPanel({
  open,
  onClose,
  onAddChord,
  editingChord,
  onUpdateChord,
  songKey = null,
  sectionChords = [],
  sameTypeChords = [],
  allSongChords = [],
}: ChordInputPanelProps) {
  const [tab, setTab] = useState<'piano' | 'search' | 'suggest'>('piano');
  const [activeLayer, setActiveLayer] = useState<'bass' | 'voicing'>('voicing');
  const [bassNotes, setBassNotes] = useState<number[]>([]);
  const [voicingNotes, setVoicingNotes] = useState<number[]>([]);

  // Suggest tab view toggle
  const [suggestView, setSuggestView] = useState<'grid' | 'list'>('grid');

  // Search tab state
  const [typeQuery, setTypeQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Track last identification name to sync to typeQuery
  const lastIdentNameRef = useRef<string>('');

  // Load editing chord data
  useEffect(() => {
    if (editingChord) {
      setBassNotes([...editingChord.bass]);
      setVoicingNotes([...editingChord.voicing]);
      setTypeQuery(editingChord.name || '');
    }
  }, [editingChord]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setBassNotes([]);
      setVoicingNotes([]);
      setTypeQuery('');
      setSuggestions([]);
      setActiveLayer('voicing');
      lastIdentNameRef.current = '';
    }
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

  // Sync: when piano identification changes, update typeQuery
  const identName = identification?.name || '';
  if (identName !== lastIdentNameRef.current) {
    lastIdentNameRef.current = identName;
    if (identName) {
      // Only auto-sync if there are notes selected (not on clear)
      if (voicingNotes.length > 0 || bassNotes.length > 0) {
        // Use a microtask to avoid setting state during render
        Promise.resolve().then(() => setTypeQuery(identName));
      }
    }
  }

  function handleClearAll() {
    setBassNotes([]);
    setVoicingNotes([]);
    setTypeQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    lastIdentNameRef.current = '';
  }

  function handleAddToSection() {
    const name = identification?.name || typeQuery.trim() || 'Unknown';

    if (editingChord && onUpdateChord) {
      onUpdateChord({
        ...editingChord,
        name,
        voicing: [...voicingNotes],
        bass: [...bassNotes],
      });
    } else {
      onAddChord({
        name,
        voicing: [...voicingNotes],
        bass: [...bassNotes],
      });
    }

    handleClearAll();
    onClose();
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

  // Search tab: handle query change
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

    // Generate voicing and update piano state
    const voicingData = generateDefaultVoicing(chordName);
    if (voicingData) {
      setVoicingNotes(voicingData.voicing);
      setBassNotes(voicingData.bass);
    }
  }

  function handleTypeAdd() {
    const name = typeQuery.trim();
    if (!name) return;

    // If we have notes from piano (synced state), use those
    if (voicingNotes.length > 0 || bassNotes.length > 0) {
      onAddChord({
        name,
        voicing: [...voicingNotes],
        bass: [...bassNotes],
      });
    } else {
      const voicingData = generateDefaultVoicing(name);
      if (voicingData) {
        onAddChord({
          name,
          voicing: voicingData.voicing,
          bass: voicingData.bass,
        });
      } else {
        onAddChord({
          name,
          voicing: [],
          bass: [],
        });
      }
    }

    handleClearAll();
    onClose();
  }

  // Suggest tab: load suggestion into Piano tab
  function handleLoadSuggestion(suggestion: ChordSuggestion) {
    setVoicingNotes(suggestion.defaultVoicing);
    setBassNotes(suggestion.defaultBass);
    setTypeQuery(suggestion.chordName);
    lastIdentNameRef.current = suggestion.chordName;
    setTab('piano');
  }

  // Suggest tab: add chord directly
  function handleAddSuggestion(suggestion: ChordSuggestion) {
    onAddChord({
      name: suggestion.chordName,
      voicing: suggestion.defaultVoicing,
      bass: suggestion.defaultBass,
    });
  }

  // Compute chord suggestions
  const chordSuggestions = useMemo(() => {
    if (!open || tab !== 'suggest') return [];
    return suggestNextChords({
      songKey,
      sectionChords,
      allSongChords,
      count: 5,
    });
  }, [open, tab, songKey, sectionChords, allSongChords]);

  // Context pills: weighted deduplication of existing chords
  const contextPills = useMemo(() => {
    if (!open || tab !== 'suggest') return [];
    const seen = new Set<string>();
    const pills: Chord[] = [];
    // Priority 1: current section chords
    for (const c of sectionChords) {
      if (!seen.has(c.name)) { seen.add(c.name); pills.push(c); }
    }
    // Priority 2: same section type chords
    for (const c of sameTypeChords) {
      if (!seen.has(c.name)) { seen.add(c.name); pills.push(c); }
    }
    // Priority 3: all other song chords
    for (const c of allSongChords) {
      if (!seen.has(c.name)) { seen.add(c.name); pills.push(c); }
    }
    return pills.slice(0, 5);
  }, [open, tab, sectionChords, sameTypeChords, allSongChords]);

  // Load a pill chord into Piano tab for preview
  function handleLoadPill(chord: Chord) {
    setVoicingNotes([...chord.voicing]);
    setBassNotes([...chord.bass]);
    setTypeQuery(chord.name);
    lastIdentNameRef.current = chord.name;
    setTab('piano');
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

  // For Search tab visualization, use current shared note state if available, else generate from query
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
    <div class="fixed bottom-0 left-0 right-0 z-30 bg-surface-card border-t border-surface-hover shadow-2xl max-h-[70vh] overflow-y-auto md:relative md:mt-4 md:rounded-xl md:border md:shadow-none md:max-h-none">
      {/* Panel header */}
      <div class="flex items-center justify-between p-3 border-b border-surface-hover sticky top-0 bg-surface-card z-10">
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
          <button
            onClick={() => setTab('suggest')}
            class={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              tab === 'suggest'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Suggest
          </button>
        </div>
        <button
          onClick={onClose}
          class="text-text-muted hover:text-text-primary transition-colors text-lg px-2"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div class="p-3">
        {tab === 'piano' ? (
          <>
            {/* Bass / Voicing toggle */}
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

            {/* Piano keyboard */}
            <PianoKeyboard
              bassNotes={bassNotes}
              voicingNotes={voicingNotes}
              activeLayer={activeLayer}
              onToggleNote={handleToggleNote}
            />

            {/* Chord display */}
            {identification && (
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
                {/* Note summary */}
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
            )}

            {/* Add button */}
            <button
              onClick={handleAddToSection}
              disabled={voicingNotes.length === 0 && bassNotes.length === 0}
              class="w-full mt-3 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
            >
              {editingChord ? 'Update Chord' : 'Add to Section'}
            </button>
          </>
        ) : tab === 'search' ? (
          /* Search tab */
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

            {/* Show chord details + piano visualization */}
            {typeIdentification && typeVoicingData && (
              <div class="p-3 bg-surface rounded-xl mb-3">
                <div class="text-2xl font-bold font-mono text-text-primary">
                  {typeIdentification.name}
                </div>
                <div class="text-sm text-accent font-mono mt-1">
                  {typeIdentification.intervals}
                </div>
                <div class="text-sm text-text-secondary mt-1">
                  {typeIdentification.description}
                </div>
                {/* Mini piano visualization */}
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
              </div>
            )}

            <button
              onClick={handleTypeAdd}
              disabled={!typeQuery.trim()}
              class="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
            >
              {editingChord ? 'Update Chord' : 'Add to Section'}
            </button>
          </>
        ) : (
          /* Suggest tab */
          <>
            {/* Context pills + view toggle */}
            <div class="flex items-center gap-2 mb-2">
              {/* Context pills */}
              {contextPills.length > 0 && (
                <div class="flex gap-1.5 overflow-x-auto min-w-0 flex-1">
                  {contextPills.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleLoadPill(c)}
                      class="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-mono text-text-muted bg-surface-hover hover:text-text-secondary hover:bg-surface-hover/80 transition-colors border border-surface-hover"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {!contextPills.length && <div class="flex-1" />}
              <div class="flex gap-0.5 bg-surface rounded-lg p-0.5 shrink-0">
                <button
                  onClick={() => setSuggestView('grid')}
                  class={`p-1.5 rounded-md transition-colors ${
                    suggestView === 'grid'
                      ? 'bg-surface-hover text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1" width="6" height="6" rx="1" />
                    <rect x="9" y="1" width="6" height="6" rx="1" />
                    <rect x="1" y="9" width="6" height="6" rx="1" />
                    <rect x="9" y="9" width="6" height="6" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setSuggestView('list')}
                  class={`p-1.5 rounded-md transition-colors ${
                    suggestView === 'list'
                      ? 'bg-surface-hover text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                  aria-label="List view"
                  title="List view"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <rect x="1" y="1.5" width="14" height="3" rx="1" />
                    <rect x="1" y="6.5" width="14" height="3" rx="1" />
                    <rect x="1" y="11.5" width="14" height="3" rx="1" />
                  </svg>
                </button>
              </div>
            </div>

            {chordSuggestions.length > 0 ? (
              suggestView === 'grid' ? (
                /* Grid view */
                <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {chordSuggestions.map((s) => (
                    <div
                      key={s.chordName}
                      class="p-2.5 bg-surface rounded-xl border border-surface-hover hover:border-accent/30 transition-colors flex flex-col"
                    >
                      <button
                        onClick={() => handleLoadSuggestion(s)}
                        class="flex-1 text-left min-w-0"
                      >
                        <div class="flex items-baseline gap-1.5">
                          <span class="text-lg font-bold font-mono text-text-primary">
                            {s.chordName}
                          </span>
                          {s.degree && (
                            <span class="text-xs font-mono text-accent">
                              {s.degree}
                            </span>
                          )}
                        </div>
                        <div class="text-[10px] text-text-muted mt-0.5">
                          {s.mood}
                        </div>
                        {/* Mini keyboard previews */}
                        <div class="mt-2 space-y-1">
                          {s.defaultVoicing.length > 0 && (
                            <MiniKeyboard notes={s.defaultVoicing} color="#7289DA" padding={1} />
                          )}
                          {s.defaultBass.length > 0 && (
                            <MiniKeyboard notes={s.defaultBass} color="#D85A30" padding={1} />
                          )}
                        </div>
                        <div class="text-[10px] text-text-secondary italic mt-1.5 line-clamp-2">
                          {s.reason}
                        </div>
                      </button>
                      <button
                        onClick={() => handleAddSuggestion(s)}
                        class="w-full mt-2 px-2 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                /* List view */
                <div class="space-y-2">
                  {chordSuggestions.map((s) => (
                    <div
                      key={s.chordName}
                      class="p-3 bg-surface rounded-xl border border-surface-hover hover:border-accent/30 transition-colors"
                    >
                      <div class="flex items-start justify-between gap-2">
                        <button
                          onClick={() => handleLoadSuggestion(s)}
                          class="flex-1 text-left min-w-0"
                        >
                          <div class="flex items-baseline gap-2">
                            <span class="text-xl font-bold font-mono text-text-primary">
                              {s.chordName}
                            </span>
                            {s.degree && (
                              <span class="text-sm font-mono text-accent">
                                {s.degree}
                              </span>
                            )}
                          </div>
                          <div class="text-xs text-text-muted mt-0.5">
                            {s.mood}
                          </div>
                          <div class="text-xs text-text-secondary italic mt-0.5">
                            {s.reason}
                          </div>
                        </button>
                        <button
                          onClick={() => handleAddSuggestion(s)}
                          class="shrink-0 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div class="text-center text-text-muted py-8">
                <p class="text-sm">No suggestions available.</p>
                <p class="text-xs mt-1">Try setting a song key or adding chords to get started.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
