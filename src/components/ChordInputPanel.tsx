import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { PianoKeyboard } from './PianoKeyboard.tsx';
import { MiniKeyboard } from './MiniKeyboard.tsx';
import {
  identifyChord,
  searchChords,
  generateDefaultVoicing,
  midiToDisplayName,
} from '../utils/chordEngine.ts';
import type { Chord } from '../db.ts';

interface ChordInputPanelProps {
  open: boolean;
  onClose: () => void;
  onAddChord: (chord: Omit<Chord, 'id' | 'order'>) => void;
  editingChord?: Chord | null;  // pre-load for editing
  onUpdateChord?: (chord: Chord) => void;
}

export function ChordInputPanel({
  open,
  onClose,
  onAddChord,
  editingChord,
  onUpdateChord,
}: ChordInputPanelProps) {
  const [tab, setTab] = useState<'piano' | 'type'>('piano');
  const [activeLayer, setActiveLayer] = useState<'bass' | 'voicing'>('voicing');
  const [bassNotes, setBassNotes] = useState<number[]>([]);
  const [voicingNotes, setVoicingNotes] = useState<number[]>([]);

  // Type tab state
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

  // Type tab: handle query change
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

  // For Type tab visualization, use current shared note state if available, else generate from query
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
            onClick={() => setTab('type')}
            class={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              tab === 'type'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Type
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
        ) : (
          /* Type tab */
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
        )}
      </div>
    </div>
  );
}
