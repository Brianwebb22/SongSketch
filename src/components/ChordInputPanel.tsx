import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { PianoKeyboard } from './PianoKeyboard.tsx';
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
  const typeInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load editing chord data
  useEffect(() => {
    if (editingChord) {
      setBassNotes([...editingChord.bass]);
      setVoicingNotes([...editingChord.voicing]);
      setTypeQuery('');
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

  function handleClear() {
    setBassNotes([]);
    setVoicingNotes([]);
  }

  function handleAddToSection() {
    const name = identification?.name || 'Unknown';

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

    handleClear();
    onClose();
  }

  // Type tab: handle query change
  function handleTypeInput(value: string) {
    setTypeQuery(value);
    if (value.trim()) {
      setSuggestions(searchChords(value));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function selectChordFromType(chordName: string) {
    setTypeQuery(chordName);
    setShowSuggestions(false);

    // Generate voicing and show on piano
    const voicingData = generateDefaultVoicing(chordName);
    if (voicingData) {
      setVoicingNotes(voicingData.voicing);
      setBassNotes(voicingData.bass);
    }
  }

  function handleTypeAdd() {
    const name = typeQuery.trim();
    if (!name) return;

    const voicingData = generateDefaultVoicing(name);
    if (voicingData) {
      onAddChord({
        name,
        voicing: voicingData.voicing,
        bass: voicingData.bass,
      });
    } else {
      // Custom chord name — add with empty voicing
      onAddChord({
        name,
        voicing: [],
        bass: [],
      });
    }

    setTypeQuery('');
    setSuggestions([]);
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
                onClick={handleClear}
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
              <input
                ref={typeInputRef}
                type="text"
                value={typeQuery}
                onInput={(e) => handleTypeInput((e.target as HTMLInputElement).value)}
                onFocus={() => {
                  if (typeQuery.trim()) {
                    setSuggestions(searchChords(typeQuery));
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Type a chord name... (e.g. Cmaj7, Dm/A)"
                class="w-full bg-surface-hover text-text-primary text-sm px-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-accent font-mono"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  class="absolute left-0 right-0 bottom-full mb-1 bg-surface-card border border-surface-hover rounded-xl shadow-lg max-h-48 overflow-y-auto z-20"
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

            {/* Show chord details if we have a valid chord typed/selected */}
            {typeQuery.trim() && (() => {
              const voicingData = generateDefaultVoicing(typeQuery.trim());
              if (!voicingData) return null;
              const id = identifyChord(voicingData.voicing, voicingData.bass);
              if (!id) return null;
              return (
                <div class="p-3 bg-surface rounded-xl mb-3">
                  <div class="text-2xl font-bold font-mono text-text-primary">
                    {id.name}
                  </div>
                  <div class="text-sm text-accent font-mono mt-1">
                    {id.intervals}
                  </div>
                  <div class="text-sm text-text-secondary mt-1">
                    {id.description}
                  </div>
                </div>
              );
            })()}

            <button
              onClick={handleTypeAdd}
              disabled={!typeQuery.trim()}
              class="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors"
            >
              Add to Section
            </button>
          </>
        )}
      </div>
    </div>
  );
}
