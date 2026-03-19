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

interface KeyboardViewProps {
  sections: Section[];
  onEditChord: (sectionId: string, chord: Chord) => void;
}

export function KeyboardView({ sections, onEditChord }: KeyboardViewProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    return (
      <div class="text-center text-text-muted py-16">
        No sections yet. Switch to Sections view to add some.
      </div>
    );
  }

  const hasAnyChords = sorted.some((s) => s.chords.length > 0);
  if (!hasAnyChords) {
    return (
      <div class="text-center text-text-muted py-16">
        No chords yet. Add chords in Sections view to see them here.
      </div>
    );
  }

  return (
    <div class="space-y-6">
      {sorted.map((section) => {
        const sortedChords = [...section.chords].sort((a, b) => a.order - b.order);
        if (sortedChords.length === 0) return null;

        const borderColor = SECTION_BORDER_COLORS[section.type] || SECTION_BORDER_COLORS.custom;

        return (
          <div key={section.id}>
            {/* Section header */}
            <div class="flex items-center gap-2 mb-3">
              <span
                class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: borderColor }}
              />
              <span class="text-sm font-medium text-text-secondary">
                {section.label}
              </span>
            </div>

            {/* Chord cards - horizontal scroll */}
            <div class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {sortedChords.map((chord) => (
                <ChordCard
                  key={chord.id}
                  chord={chord}
                  lyricSnippet={getLyricSnippet(section.notes)}
                  onClick={() => onEditChord(section.id, chord)}
                />
              ))}
            </div>
          </div>
        );
      })}
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
}

function ChordCard({ chord, lyricSnippet, onClick }: ChordCardProps) {
  return (
    <button
      onClick={onClick}
      class="flex-shrink-0 w-[120px] sm:w-[150px] bg-surface-card hover:bg-surface-hover border border-surface-hover rounded-xl p-3 text-left transition-colors cursor-pointer"
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
  );
}
