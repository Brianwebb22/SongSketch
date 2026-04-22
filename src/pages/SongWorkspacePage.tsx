import { useEffect, useState, useRef, useCallback } from 'preact/hooks';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { navigate } from '../app.tsx';
import { db } from '../db.ts';
import type { Song, Section, SectionType, Chord } from '../db.ts';
import { SectionCard } from '../components/SectionCard.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { ChordInputPanel } from '../components/ChordInputPanel.tsx';
import { KeyboardView } from '../components/KeyboardView.tsx';
import { TapTempo } from '../components/TapTempo.tsx';
import { AppFooter } from '../components/AppFooter.tsx';
import { KeySelector } from '../components/KeySelector.tsx';
import type { Theme } from '../hooks/useTheme.ts';

// --- Auto-save hook ---

function useAutoSave(song: Song | null) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const songRef = useRef(song);
  songRef.current = song;

  const save = useCallback(() => {
    if (!songRef.current) return;
    const toSave = { ...songRef.current, updatedAt: new Date().toISOString() };
    setSaveStatus('saving');
    db.songs.put(toSave).then(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    });
  }, []);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 1000);
  }, [save]);

  // Save on unmount (navigating away)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        save();
      }
    };
  }, [save]);

  return { saveStatus, scheduleSave };
}

// --- Section type config ---

const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: 'intro', label: 'Intro' },
  { value: 'verse', label: 'Verse' },
  { value: 'pre-chorus', label: 'Pre-Chorus' },
  { value: 'chorus', label: 'Chorus' },
  { value: 'bridge', label: 'Bridge' },
  { value: 'outro', label: 'Outro' },
  { value: 'custom', label: 'Custom' },
];

function defaultLabelForType(type: SectionType, existingSections: Section[]): string {
  const count = existingSections.filter((s) => s.type === type).length + 1;
  const name = type === 'pre-chorus' ? 'Pre-Chorus' : type.charAt(0).toUpperCase() + type.slice(1);
  return `${name} ${count}`;
}

function createSection(type: SectionType, order: number, existingSections: Section[]): Section {
  return {
    id: crypto.randomUUID(),
    type,
    label: defaultLabelForType(type, existingSections),
    order,
    chords: [],
    notes: '',
  };
}

// --- Sortable section wrapper ---

function SortableSection({
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
}: {
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
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...(attributes as unknown as Record<string, unknown>)}>
      <SectionCard
        section={section}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onAddChord={onAddChord}
        onEditChord={onEditChord}
        onDeleteChord={onDeleteChord}
        songKey={songKey}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}

// --- Main page ---

export function SongWorkspacePage({ id, theme, onToggleTheme }: { id: string; theme: Theme; onToggleTheme: () => void }) {
  const [song, setSong] = useState<Song | null>(null);
  const [view, setView] = useState<'sections' | 'keyboard'>('sections');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Chord input panel state
  const [chordPanelOpen, setChordPanelOpen] = useState(false);
  const [chordPanelSectionId, setChordPanelSectionId] = useState<string | null>(null);
  const [editingChord, setEditingChord] = useState<Chord | null>(null);

  const { saveStatus, scheduleSave } = useAutoSave(song);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    db.songs.get(id).then((s) => {
      if (s) {
        setSong(s);
        // Expand all sections initially
        setExpandedIds(new Set(s.sections.map((sec) => sec.id)));
      } else {
        navigate('/');
      }
    });
  }, [id]);

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

  if (!song) {
    return (
      <div class="flex items-center justify-center h-screen text-text-muted">
        Loading...
      </div>
    );
  }

  const sortedSections = [...song.sections].sort((a, b) => a.order - b.order);

  // --- Mutation helpers ---

  function updateSection(sectionId: string, updates: Partial<Section>) {
    setSong((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, ...updates } : s,
        ),
      };
    });
    scheduleSave();
  }

  function addSection(type: SectionType) {
    const maxOrder = song!.sections.reduce((max, s) => Math.max(max, s.order), -1);
    const section = createSection(type, maxOrder + 1, song!.sections);
    setSong((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: [...prev.sections, section] };
    });
    setExpandedIds((prev) => new Set([...prev, section.id]));
    setAddMenuOpen(false);
    scheduleSave();
  }

  function duplicateSection(sectionId: string) {
    setSong((prev) => {
      if (!prev) return prev;
      const source = prev.sections.find((s) => s.id === sectionId);
      if (!source) return prev;
      const newId = crypto.randomUUID();
      const dupe: Section = {
        ...source,
        id: newId,
        label: source.label + ' (copy)',
        order: source.order + 0.5, // will normalize
        chords: source.chords.map((c) => ({ ...c, id: crypto.randomUUID() })),
      };
      const sections = [...prev.sections, dupe]
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ ...s, order: i }));
      setExpandedIds((ids) => new Set([...ids, newId]));
      return { ...prev, sections };
    });
    scheduleSave();
  }

  function deleteSection(sectionId: string) {
    setSong((prev) => {
      if (!prev) return prev;
      const sections = prev.sections
        .filter((s) => s.id !== sectionId)
        .sort((a, b) => a.order - b.order)
        .map((s, i) => ({ ...s, order: i }));
      return { ...prev, sections };
    });
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(sectionId);
      return next;
    });
    setDeleteTarget(null);
    scheduleSave();
  }

  // --- Chord mutation helpers ---

  function openChordPanel(sectionId: string) {
    setChordPanelSectionId(sectionId);
    setEditingChord(null);
    setChordPanelOpen(true);
  }

  function openChordPanelForEdit(sectionId: string, chord: Chord) {
    setChordPanelSectionId(sectionId);
    setEditingChord(chord);
    setChordPanelOpen(true);
  }

  function addChordToSection(chordData: Omit<Chord, 'id' | 'order'>) {
    if (!chordPanelSectionId) return;
    const sectionId = chordPanelSectionId;
    setSong((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const maxOrder = s.chords.reduce((max, c) => Math.max(max, c.order), -1);
          const newChord: Chord = {
            ...chordData,
            id: crypto.randomUUID(),
            order: maxOrder + 1,
          };
          return { ...s, chords: [...s.chords, newChord] };
        }),
      };
    });
    scheduleSave();
  }

  function updateChordInSection(updatedChord: Chord) {
    if (!chordPanelSectionId) return;
    const sectionId = chordPanelSectionId;
    setSong((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            chords: s.chords.map((c) => (c.id === updatedChord.id ? updatedChord : c)),
          };
        }),
      };
    });
    scheduleSave();
  }

  function deleteChordFromSection(sectionId: string, chordId: string) {
    setSong((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            chords: s.chords
              .filter((c) => c.id !== chordId)
              .sort((a, b) => a.order - b.order)
              .map((c, i) => ({ ...c, order: i })),
          };
        }),
      };
    });
    scheduleSave();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSong((prev) => {
      if (!prev) return prev;
      const sorted = [...prev.sections].sort((a, b) => a.order - b.order);
      const oldIndex = sorted.findIndex((s) => s.id === active.id);
      const newIndex = sorted.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = [...sorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);
      const sections = reordered.map((s, i) => ({ ...s, order: i }));
      return { ...prev, sections };
    });
    scheduleSave();
  }

  // --- Expand/collapse ---

  const allExpanded = sortedSections.length > 0 && sortedSections.every((s) => expandedIds.has(s.id));

  function toggleExpandAll() {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(sortedSections.map((s) => s.id)));
    }
  }

  function toggleExpand(sectionId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  // --- Render ---

  const deleteTargetSection = deleteTarget
    ? song.sections.find((s) => s.id === deleteTarget)
    : null;

  return (
    <div class="min-h-screen flex flex-col">
    <div class="flex-1 max-w-4xl mx-auto px-4 py-4 w-full">
      {/* Header */}
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => navigate('/')}
          class="text-text-secondary hover:text-text-primary transition-colors text-lg"
          aria-label="Back to song list"
        >
          ←
        </button>
        <input
          type="text"
          value={song.title}
          onInput={(e) => {
            const title = (e.target as HTMLInputElement).value;
            setSong((prev) => prev ? { ...prev, title } : prev);
            scheduleSave();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            } else if (e.key === 'Escape') {
              const input = e.target as HTMLInputElement;
              const original = song.title || 'Untitled Song';
              setSong((prev) => prev ? { ...prev, title: original } : prev);
              input.value = original;
              input.blur();
            }
          }}
          onBlur={(e) => {
            const title = (e.target as HTMLInputElement).value.trim();
            if (!title) {
              setSong((prev) => prev ? { ...prev, title: 'Untitled Song' } : prev);
              scheduleSave();
            }
          }}
          class="text-xl font-semibold text-text-primary bg-transparent outline-none flex-1 min-w-0 truncate focus:ring-1 focus:ring-accent rounded px-1 -ml-1"
          aria-label="Song title"
        />
        <div class="flex items-center gap-2 text-sm text-text-secondary">
          <KeySelector
            songKey={song.key}
            onChange={(key) => {
              setSong((prev) => prev ? { ...prev, key } : prev);
              scheduleSave();
            }}
            chords={sortedSections.flatMap((s) =>
              [...s.chords].sort((a, b) => a.order - b.order),
            )}
            songId={song.id}
          />
          <TapTempo
            bpm={song.bpm}
            onBpmChange={(bpm) => {
              setSong((prev) => prev ? { ...prev, bpm } : prev);
              scheduleSave();
            }}
          />
          <button
            onClick={onToggleTheme}
            class="text-text-muted hover:text-text-primary transition-colors text-lg p-1"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          {/* Save indicator */}
          <span
            class={`text-xs transition-opacity duration-300 ${
              saveStatus === 'saved'
                ? 'text-green-400 opacity-100'
                : saveStatus === 'saving'
                  ? 'text-text-muted opacity-100'
                  : 'opacity-0'
            }`}
          >
            {saveStatus === 'saving' ? 'Saving...' : '✓ Saved'}
          </span>
        </div>
      </div>

      {/* View switcher + toolbar */}
      <div class="flex items-center gap-3 mb-6">
        <div class="flex gap-1 bg-surface-card rounded-lg p-1">
          <button
            onClick={() => setView('sections')}
            class={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'sections'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sections
          </button>
          <button
            onClick={() => setView('keyboard')}
            class={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'keyboard'
                ? 'bg-accent text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Keyboard
          </button>
        </div>

        {view === 'sections' && sortedSections.length > 0 && (
          <button
            onClick={toggleExpandAll}
            class="ml-auto text-sm text-text-muted hover:text-text-secondary transition-colors"
            title={allExpanded ? 'Collapse all' : 'Expand all'}
          >
            {allExpanded ? (
              <span class="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 10l5-5 5 5z"/></svg>
                Collapse all
              </span>
            ) : (
              <span class="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 6l5 5 5-5z"/></svg>
                Expand all
              </span>
            )}
          </button>
        )}

        {view === 'keyboard' && (
          <div class="flex items-center gap-3 text-xs text-text-muted">
            <span class="flex items-center gap-1">
              <span class="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#7289DA' }} />
              Voicing
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: '#D85A30' }} />
              Bass
            </span>
          </div>
        )}
      </div>

      {/* View content */}
      {view === 'sections' ? (
        <div class="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedSections.length === 0 && (
                <div class="text-center text-text-muted py-12">
                  <p class="text-lg mb-1">No sections yet</p>
                  <p class="text-sm">Add your first section to start building your song.</p>
                </div>
              )}
              {sortedSections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  expanded={expandedIds.has(section.id)}
                  onToggleExpand={() => toggleExpand(section.id)}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => setDeleteTarget(section.id)}
                  onDuplicate={() => duplicateSection(section.id)}
                  onAddChord={() => openChordPanel(section.id)}
                  onEditChord={(chord) => openChordPanelForEdit(section.id, chord)}
                  onDeleteChord={(chordId) => deleteChordFromSection(section.id, chordId)}
                  songKey={song.key}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Add section button */}
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
                    onClick={() => addSection(opt.value)}
                    class="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface-hover transition-colors capitalize"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <KeyboardView
          sections={sortedSections}
          onEditChord={(sectionId, chord) => openChordPanelForEdit(sectionId, chord)}
          onAddChord={(sectionId) => openChordPanel(sectionId)}
          onDeleteChord={(sectionId, chordId) => deleteChordFromSection(sectionId, chordId)}
          onAddSection={(type) => addSection(type)}
          onDeleteSection={(sectionId) => setDeleteTarget(sectionId)}
          songKey={song.key}
          chordPanelSectionId={chordPanelOpen ? chordPanelSectionId : null}
          chordPanel={
            <ChordInputPanel
              open={chordPanelOpen}
              onClose={() => {
                setChordPanelOpen(false);
                setEditingChord(null);
                setChordPanelSectionId(null);
              }}
              onAddChord={addChordToSection}
              editingChord={editingChord}
              onUpdateChord={updateChordInSection}
              songKey={song.key}
              sectionChords={chordPanelSectionId ? (song.sections.find(s => s.id === chordPanelSectionId)?.chords ?? []) : []}
              sameTypeChords={(() => {
                if (!chordPanelSectionId) return [];
                const current = song.sections.find(s => s.id === chordPanelSectionId);
                if (!current) return [];
                return song.sections
                  .filter(s => s.id !== chordPanelSectionId && s.type === current.type)
                  .flatMap(s => s.chords);
              })()}
              allSongChords={song.sections.flatMap(s => s.chords)}
              inline
            />
          }
        />
      )}

      {/* Chord input panel (sections view only) */}
      {view === 'sections' && (
        <ChordInputPanel
          open={chordPanelOpen}
          onClose={() => {
            setChordPanelOpen(false);
            setEditingChord(null);
            setChordPanelSectionId(null);
          }}
          onAddChord={addChordToSection}
          editingChord={editingChord}
          onUpdateChord={updateChordInSection}
          songKey={song.key}
          sectionChords={chordPanelSectionId ? (song.sections.find(s => s.id === chordPanelSectionId)?.chords ?? []) : []}
          sameTypeChords={(() => {
            if (!chordPanelSectionId) return [];
            const current = song.sections.find(s => s.id === chordPanelSectionId);
            if (!current) return [];
            return song.sections
              .filter(s => s.id !== chordPanelSectionId && s.type === current.type)
              .flatMap(s => s.chords);
          })()}
          allSongChords={song.sections.flatMap(s => s.chords)}
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Section"
        message={
          deleteTargetSection
            ? `Delete "${deleteTargetSection.label}"? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteSection(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
    <AppFooter />
    </div>
  );
}
