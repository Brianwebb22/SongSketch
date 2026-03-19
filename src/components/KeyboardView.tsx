import { useState, useRef, useEffect } from 'preact/hooks';
import type { Section, SectionType, Chord } from '../db.ts';
import { MiniKeyboard } from './MiniKeyboard.tsx';

const SECTION_BORDER_COLORS: Record<SectionType, string> = {
  intro: '#9b7edb',
  verse: '#5b9fd6',
  'pre-chorus': '#59b8a0',
  chorus: '#c76bb1',
  bridge: '#d68c5b',
  outro: '#8b8bab',
  custom: '#7c7c96',
};

const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'pre-chorus', label: 'Pre-Chorus' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
  { value: 'custom', label: 'Custom' },
];

interface KeyboardViewProps {
  sections: Section[];
  onEditChord: (sectionId: string, chord: Chord) => void;
  onAddChord: (sectionId: string) => void;
  onDeleteChord: (sectionId: string, chordId: string) => void;
  onAddSection: (type: SectionType) => void;
  onDeleteSection: (sectionId: string) => void;
}

export function KeyboardView({
  sections,
  onEditChord,
  onAddChord,
  onDeleteChord,
  onAddSection,
  onDeleteSection,
}: KeyboardViewProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Close add menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    }
    if (addMenuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [addMenuOpen]);

  if (sorted.length === 0) {
    return (
      <div class="space-y-6">
        <div class="text-center text-text-muted py-16">
          <p class="text-lg mb-1">No sections yet</p>
          <p class="text-sm">Add your first section to start building your song.</p>
        </div>
        <AddSectionButton
          addMenuOpen={addMenuOpen}
          setAddMenuOpen={setAddMenuOpen}
          addMenuRef={addMenuRef}
          onAddSection={onAddSection}
        />
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {sorted.map((section) => {
        const sortedChords = [...section.chords].sort((a, b) => a.order - b.order);
        const borderColor = SECTION_BORDER_COLORS[section.type] || SECTION_BORDER_COLORS.custom;

        return (
          <div key={section.id}>
            {/* Section header */}
            <div class="flex items-center gap-2 mb-3 group">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: borderColor }}
              />
              <span class="text-sm font-medium text-text-secondary">
                {section.label}
              </span>
              <button
                onClick={() => onDeleteSection(section.id)}
                class="ml-auto text-text-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 text-xs px-1.5 py-0.5 rounded hover:bg-red-400/10"
                title={`Delete ${section.label}`}
                aria-label={`Delete ${section.label}`}
              >
                Delete
              </button>
            </div>

            {/* Chord cards - horizontal scroll */}
            <div class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {sortedChords.map((chord) => (
                <ChordCard
                  key={chord.id}
                  chord={chord}
                  lyricSnippet={getLyricSnippet(section.notes)}
                  onClick={() => onEditChord(section.id, chord)}
                  onDelete={() => onDeleteChord(section.id, chord.id)}
                />
              ))}
              {/* Add chord button */}
              <button
                onClick={() => onAddChord(section.id)}
                class="flex-shrink-0 w-[120px] sm:w-[150px] border-2 border-dashed border-surface-hover hover:border-accent/40 text-text-muted hover:text-text-secondary rounded-xl flex items-center justify-center text-sm transition-colors cursor-pointer min-h-[100px]"
              >
                + Add
              </button>
            </div>
          </div>
        );
      })}

      {/* Add section button */}
      <AddSectionButton
        addMenuOpen={addMenuOpen}
        setAddMenuOpen={setAddMenuOpen}
        addMenuRef={addMenuRef}
        onAddSection={onAddSection}
      />
    </div>
  );
}

function AddSectionButton({
  addMenuOpen,
  setAddMenuOpen,
  addMenuRef,
  onAddSection,
}: {
  addMenuOpen: boolean;
  setAddMenuOpen: (open: boolean) => void;
  addMenuRef: React.RefObject<HTMLDivElement>;
  onAddSection: (type: SectionType) => void;
}) {
  return (
    <div class="relative" ref={addMenuRef}>
      <button
        onClick={() => setAddMenuOpen(!addMenuOpen)}
        class="w-full border-2 border-dashed border-surface-hover hover:border-accent/40 text-text-muted hover:text-text-secondary rounded-xl py-3 text-sm transition-colors"
      >
        + Add Section
      </button>
      {addMenuOpen && (
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-card border border-surface-hover rounded-xl shadow-lg py-2 min-w-[160px] z-20">
          {SECTION_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onAddSection(opt.value);
                setAddMenuOpen(false);
              }}
              class="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors capitalize"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getLyricSnippet(notes: string): string {
  if (!notes.trim()) return '';
  const lines = notes.trim().split('\n');
  const snippet = lines.slice(0, 2).join(' ');
  return snippet.length > 60 ? snippet.slice(0, 57) + '...' : snippet;
}

interface ChordCardProps {
  chord: Chord;
  lyricSnippet: string;
  onClick: () => void;
  onDelete: () => void;
}

function ChordCard({ chord, lyricSnippet, onClick, onDelete }: ChordCardProps) {
  return (
    <div class="relative flex-shrink-0 w-[120px] sm:w-[150px] group/card">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        class="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-surface-card border border-surface-hover text-text-muted hover:text-red-400 hover:border-red-400/50 flex items-center justify-center text-xs opacity-0 group-hover/card:opacity-100 focus:opacity-100 transition-opacity"
        title="Delete chord"
        aria-label={`Delete ${chord.name || 'chord'}`}
      >
        ×
      </button>
      <button
        onClick={onClick}
        class="w-full bg-surface-card hover:bg-surface-hover border border-surface-hover rounded-xl p-3 text-left transition-colors cursor-pointer overflow-hidden"
      >
      {/* Chord name */}
      <div class="text-sm font-semibold text-text-primary font-mono text-center mb-2 truncate">
        {chord.name || '?'}
      </div>

      {/* Voicing mini-keyboard */}
      {chord.voicing.length > 0 && (
        <div class="mb-1">
          <MiniKeyboard notes={chord.voicing} color="#7289DA" />
        </div>
      )}

      {/* Bass mini-keyboard */}
      {chord.bass.length > 0 && (
        <div class="mb-1">
          <MiniKeyboard notes={chord.bass} color="#D85A30" />
        </div>
      )}

      {/* Empty state */}
      {chord.voicing.length === 0 && chord.bass.length === 0 && (
        <div class="text-[9px] text-text-muted text-center py-3">
          No notes
        </div>
      )}

      {/* Lyric snippet */}
      {lyricSnippet && (
        <div class="text-[9px] text-text-muted mt-2 leading-tight line-clamp-2">
          {lyricSnippet}
        </div>
      )}
      </button>
    </div>
  );
}
