import { useEffect, useRef } from 'preact/hooks';
import type { Section, SectionType, Chord } from '../db.ts';
import { getChordDegree } from '../utils/chordDegrees.ts';

const SECTION_COLORS: Record<SectionType, string> = {
  intro: 'bg-section-intro/20 text-section-intro',
  verse: 'bg-section-verse/20 text-section-verse',
  'pre-chorus': 'bg-section-pre-chorus/20 text-section-pre-chorus',
  chorus: 'bg-section-chorus/20 text-section-chorus',
  bridge: 'bg-section-bridge/20 text-section-bridge',
  outro: 'bg-section-outro/20 text-section-outro',
  custom: 'bg-section-custom/20 text-section-custom',
};

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'pre-chorus', label: 'Pre-Chorus' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
  { value: 'custom', label: 'Custom' },
];

interface SectionCardProps {
  section: Section;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Section>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddChord: () => void;
  onEditChord: (chord: Chord) => void;
  onDeleteChord: (chordId: string) => void;
  songKey: string | null;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

function chordPreview(section: Section): string {
  if (section.chords.length === 0) return '';
  const names = section.chords.map((c) => c.name);
  if (names.length <= 6) return names.join(' → ');
  return names.slice(0, 6).join(' → ') + ' …';
}

export function SectionCard({
  section,
  expanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddChord,
  onEditChord,
  onDeleteChord,
  songKey,
  dragHandleProps,
  isDragging,
}: SectionCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    autoResize();
  }, [section.notes, expanded]);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  const colorClasses = SECTION_COLORS[section.type];

  if (!expanded) {
    return (
      <div
        class={`bg-surface-card rounded-xl transition-shadow ${isDragging ? 'shadow-lg shadow-accent/20 opacity-80' : ''}`}
      >
        <div class="relative">
          <button
            onClick={onToggleExpand}
            class="w-full flex items-start gap-3 p-4 pr-10 text-left"
          >
            {/* Drag handle */}
            <span
              {...dragHandleProps}
              class="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing select-none shrink-0 mt-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              ⠿
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${colorClasses}`}>
                  {section.type}
                </span>
                <span class="text-sm font-medium text-text-primary truncate">
                  {section.label}
                </span>
              </div>
              {section.chords.length > 0 && (
                <div class="text-xs text-text-muted font-mono mt-1 truncate">
                  {chordPreview(section)}
                </div>
              )}
            </div>
          </button>
          <span class="absolute top-4 right-3 text-text-muted pointer-events-none text-lg leading-none">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5z"/></svg>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      class={`bg-surface-card rounded-xl transition-shadow ${isDragging ? 'shadow-lg shadow-accent/20 opacity-80' : ''}`}
    >
      {/* Expanded header */}
      <div class="relative flex items-center gap-3 p-4 pb-0 pr-10">
        <span
          {...dragHandleProps}
          class="text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          ⠿
        </span>
        <span class={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${colorClasses}`}>
          {section.type}
        </span>
        <button
          onClick={onToggleExpand}
          class="absolute top-4 right-3 text-text-muted hover:text-text-secondary transition-colors"
          aria-label="Collapse section"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 6l5 5 5-5z"/></svg>
        </button>
      </div>

      <div class="p-4 pt-3 space-y-3">
        {/* Label + type row */}
        <div class="flex gap-2">
          <input
            type="text"
            value={section.label}
            onInput={(e) => onUpdate({ label: (e.target as HTMLInputElement).value })}
            class="flex-1 bg-surface-hover text-text-primary text-sm px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-accent"
            placeholder="Section label"
          />
          <select
            value={section.type}
            onChange={(e) => onUpdate({ type: (e.target as HTMLSelectElement).value as SectionType })}
            class="bg-surface-hover text-text-primary text-sm px-3 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-accent"
          >
            {SECTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Chord progression row */}
        <div class="flex flex-wrap gap-2 min-h-[32px] items-center">
          {section.chords.length > 0 ? (
            section.chords.map((chord) => {
              const degree = getChordDegree(chord.name, songKey);
              return (
              <span
                key={chord.id}
                class="group relative bg-surface-hover text-text-primary text-sm px-2.5 py-1 rounded-lg font-mono cursor-pointer hover:bg-accent/20 hover:text-accent transition-colors"
                onClick={() => onEditChord(chord)}
              >
                {degree && (
                  <span class="block text-[10px] text-text-muted leading-tight -mb-0.5">{degree}</span>
                )}
                {chord.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChord(chord.id);
                  }}
                  class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] leading-none hidden group-hover:flex items-center justify-center hover:bg-red-400"
                  aria-label={`Remove ${chord.name}`}
                >
                  ×
                </button>
              </span>
              );
            })
          ) : (
            <span class="text-sm text-text-muted italic">Add your first chord</span>
          )}
          <button
            onClick={onAddChord}
            class="text-sm text-accent hover:text-accent-hover transition-colors px-2 py-1"
          >
            + Add
          </button>
        </div>

        {/* Notes textarea */}
        <textarea
          ref={textareaRef}
          value={section.notes}
          onInput={(e) => {
            onUpdate({ notes: (e.target as HTMLTextAreaElement).value });
            autoResize();
          }}
          placeholder="Notes, lyrics, ideas..."
          class="w-full bg-surface-hover text-text-primary text-sm px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-accent resize-none overflow-hidden min-h-[60px]"
          rows={2}
        />

        {/* Section actions */}
        <div class="flex gap-2 pt-1">
          <button
            onClick={onDuplicate}
            class="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={onDelete}
            class="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Delete Section
          </button>
        </div>
      </div>
    </div>
  );
}
