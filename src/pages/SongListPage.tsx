import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app.tsx';
import { db } from '../db.ts';
import type { Song, Section } from '../db.ts';
import { SAMPLE_SONG_ID } from '../data/sampleSong.ts';
import type { Theme } from '../hooks/useTheme.ts';
import { AppFooter } from '../components/AppFooter.tsx';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type ListViewMode = 'grid' | 'list';

type SortField = 'custom' | 'title' | 'key' | 'bpm' | 'sections' | 'createdAt' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

interface SortPreference {
  field: SortField;
  direction: SortDirection;
}

const VIEW_MODE_KEY = 'songsketch-list-view-mode';
const SORT_PREF_KEY = 'songsketch-sort-preference';

const DEFAULT_SORT: SortPreference = { field: 'updatedAt', direction: 'desc' };

function getStoredViewMode(): ListViewMode {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === 'list' ? 'list' : 'grid';
}

function getStoredSort(): SortPreference {
  try {
    const stored = localStorage.getItem(SORT_PREF_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_SORT;
}

function createNewSong(): Song {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const defaultSection: Section = {
    id: crypto.randomUUID(),
    type: 'verse',
    label: 'Verse 1',
    order: 0,
    chords: [],
    notes: '',
  };
  return {
    id,
    title: 'Untitled Song',
    key: null,
    bpm: null,
    tags: [],
    sections: [defaultSection],
    createdAt: now,
    updatedAt: now,
  };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sortSongs(songs: Song[], sort: SortPreference): Song[] {
  if (sort.field === 'custom') {
    return [...songs].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));
  }

  const dir = sort.direction === 'asc' ? 1 : -1;

  return [...songs].sort((a, b) => {
    switch (sort.field) {
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'key': {
        const ak = a.key ?? '';
        const bk = b.key ?? '';
        return dir * ak.localeCompare(bk);
      }
      case 'bpm': {
        const ab = a.bpm ?? 0;
        const bb = b.bpm ?? 0;
        return dir * (ab - bb);
      }
      case 'sections':
        return dir * (a.sections.length - b.sections.length);
      case 'createdAt':
        return dir * a.createdAt.localeCompare(b.createdAt);
      case 'updatedAt':
        return dir * a.updatedAt.localeCompare(b.updatedAt);
      default:
        return 0;
    }
  });
}

// --- Sortable wrappers ---

function SortableGridCard({ song, onDelete, dragEnabled }: {
  song: Song;
  onDelete: (id: string) => void;
  dragEnabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(attributes as unknown as Record<string, unknown>)}
      class={`bg-surface-card hover:bg-surface-hover rounded-xl p-4 text-left transition-colors relative group ${isDragging ? 'shadow-lg shadow-accent/20 opacity-80' : ''}`}
    >
      <div class="flex items-start gap-2">
        <span
          {...listeners}
          class={`shrink-0 mt-0.5 select-none ${dragEnabled ? 'text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing' : 'text-text-muted/30 cursor-default'}`}
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>
        <button
          onClick={() => navigate(`/song/${song.id}`)}
          class="flex-1 text-left min-w-0"
        >
          <div class="flex items-center gap-2">
            <h3 class="font-medium text-text-primary truncate">{song.title}</h3>
            {song.id === SAMPLE_SONG_ID && (
              <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                Demo
              </span>
            )}
          </div>
          <div class="flex gap-2 mt-1 text-sm text-text-secondary">
            {song.key && <span>{song.key}</span>}
            {song.bpm && <span>{song.bpm} BPM</span>}
          </div>
          {song.tags.length > 0 && (
            <div class="flex flex-wrap gap-1 mt-2">
              {song.tags.map((tag) => (
                <span
                  key={tag}
                  class="bg-surface-hover text-text-muted text-xs px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div class="text-xs text-text-muted mt-3">
            {timeAgo(song.updatedAt)}
          </div>
        </button>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${song.title}"?`)) {
            onDelete(song.id);
          }
        }}
        class="absolute top-3 right-3 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm p-1"
        aria-label={`Delete ${song.title}`}
      >
        ✕
      </button>
    </div>
  );
}

function SortableListRow({ song, onDelete, dragEnabled }: {
  song: Song;
  onDelete: (id: string) => void;
  dragEnabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id, disabled: !dragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(attributes as unknown as Record<string, unknown>)}
      class={`group relative hover:bg-surface-hover transition-colors border-b border-surface-hover last:border-b-0 ${isDragging ? 'shadow-lg shadow-accent/20 opacity-80 bg-surface-card' : ''}`}
    >
      <div class="flex items-center">
        <span
          {...listeners}
          class={`shrink-0 px-2 py-3 select-none ${dragEnabled ? 'text-text-muted hover:text-text-secondary cursor-grab active:cursor-grabbing' : 'text-text-muted/30 cursor-default'}`}
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>
        <button
          onClick={() => navigate(`/song/${song.id}`)}
          class="flex-1 text-left px-2 py-3 sm:grid sm:grid-cols-[1fr_80px_70px_70px_100px_100px] sm:gap-2 sm:items-center min-w-0"
        >
          {/* Mobile layout */}
          <div class="sm:hidden">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 min-w-0">
                <h3 class="font-medium text-text-primary truncate">{song.title}</h3>
                {song.id === SAMPLE_SONG_ID && (
                  <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                    Demo
                  </span>
                )}
              </div>
              <span class="text-xs text-text-muted ml-2 shrink-0">{timeAgo(song.updatedAt)}</span>
            </div>
            {song.key && (
              <span class="text-sm text-text-secondary">{song.key}</span>
            )}
          </div>
          {/* Desktop layout */}
          <span class="hidden sm:flex sm:items-center sm:gap-1.5 font-medium text-text-primary truncate">
            {song.title}
            {song.id === SAMPLE_SONG_ID && (
              <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                Demo
              </span>
            )}
          </span>
          <span class="hidden sm:block text-sm text-text-secondary">{song.key || '--'}</span>
          <span class="hidden sm:block text-sm text-text-secondary">{song.bpm || '--'}</span>
          <span class="hidden sm:block text-sm text-text-secondary">{song.sections.length}</span>
          <span class="hidden sm:block text-sm text-text-muted">{formatDate(song.createdAt)}</span>
          <span class="hidden sm:block text-sm text-text-muted">{formatDate(song.updatedAt)}</span>
        </button>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Delete "${song.title}"?`)) {
            onDelete(song.id);
          }
        }}
        class="absolute top-1/2 -translate-y-1/2 right-3 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm p-1"
        aria-label={`Delete ${song.title}`}
      >
        ✕
      </button>
    </div>
  );
}

// --- Sort arrow component ---

function SortArrow({ field, sort, inherit }: { field: SortField; sort: SortPreference; inherit?: boolean }) {
  if (sort.field !== field) return null;
  return (
    <span class={`ml-1 ${inherit ? 'text-inherit' : 'text-accent'}`}>
      {sort.direction === 'asc' ? '▲' : '▼'}
    </span>
  );
}

// --- Main component ---

interface SongListPageProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function SongListPage({ theme, onToggleTheme }: SongListPageProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ListViewMode>(getStoredViewMode);
  const [sort, setSort] = useState<SortPreference>(getStoredSort);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleViewModeChange(mode: ListViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  function handleSortChange(field: SortField) {
    setSort((prev) => {
      let next: SortPreference;
      if (field === 'custom') {
        next = { field: 'custom', direction: 'asc' };
      } else if (prev.field === field) {
        next = { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        // Default direction per field type
        const defaultDesc = field === 'updatedAt' || field === 'createdAt';
        next = { field, direction: defaultDesc ? 'desc' : 'asc' };
      }
      localStorage.setItem(SORT_PREF_KEY, JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    loadSongs();
  }, []);

  async function loadSongs() {
    const all = await db.songs.toArray();
    setSongs(all);
  }

  async function handleNewSong() {
    const song = createNewSong();
    // Assign sortOrder: put new songs first in custom order
    const minOrder = songs.length > 0
      ? Math.min(...songs.map((s) => s.sortOrder ?? 0))
      : 0;
    song.sortOrder = minOrder - 1;
    await db.songs.add(song);
    navigate(`/song/${song.id}`);
  }

  async function handleDeleteSong(id: string) {
    await db.songs.delete(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  const dragEnabled = sort.field === 'custom';

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSongs((prev) => {
      const sorted = sortSongs(prev, sort);
      const oldIndex = sorted.findIndex((s) => s.id === active.id);
      const newIndex = sorted.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = [...sorted];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      // Update sortOrder for all songs
      const updated = reordered.map((s, i) => ({ ...s, sortOrder: i }));

      // Persist to DB
      db.songs.bulkPut(updated);

      return updated;
    });
  }

  const filtered = search
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : songs;

  const sorted = sortSongs(filtered, sort);

  const columnHeaders: { field: SortField; label: string }[] = [
    { field: 'title', label: 'Title' },
    { field: 'key', label: 'Key' },
    { field: 'bpm', label: 'BPM' },
    { field: 'sections', label: 'Sections' },
    { field: 'createdAt', label: 'Created' },
    { field: 'updatedAt', label: 'Edited' },
  ];

  return (
    <div class="min-h-screen flex flex-col">
      <div class="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-2xl font-semibold text-text-primary">SongSketch</h1>
          <div class="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              class="text-text-muted hover:text-text-primary transition-colors text-lg p-1"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              onClick={handleNewSong}
              class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              New Song
            </button>
          </div>
        </div>

        {/* Search + View Toggle */}
        {songs.length > 0 && (
          <div class="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Search songs..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              class="flex-1 bg-surface-card text-text-primary placeholder-text-muted rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
            />
            <div class="flex bg-surface-card rounded-lg overflow-hidden">
              <button
                onClick={() => handleViewModeChange('grid')}
                class={`px-3 py-2.5 transition-colors ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
                title="Grid view"
                aria-label="Grid view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                class={`px-3 py-2.5 transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
                title="List view"
                aria-label="List view"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="1" y="1" width="14" height="3" rx="1" />
                  <rect x="1" y="6.5" width="14" height="3" rx="1" />
                  <rect x="1" y="12" width="14" height="3" rx="1" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Sort controls (visible when songs exist) */}
        {songs.length > 0 && (
          <div class="flex items-center gap-2 mb-4 text-xs text-text-muted">
            <span>Sort:</span>
            <button
              onClick={() => handleSortChange('custom')}
              class={`px-2 py-1 rounded transition-colors ${sort.field === 'custom' ? 'bg-accent text-white' : 'bg-surface-card hover:bg-surface-hover text-text-secondary'}`}
            >
              Custom order
            </button>
            {viewMode === 'grid' && (
              <>
                {columnHeaders.map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => handleSortChange(field)}
                    class={`px-2 py-1 rounded transition-colors ${sort.field === field ? 'bg-accent text-white' : 'bg-surface-card hover:bg-surface-hover text-text-secondary'}`}
                  >
                    {label}
                    <SortArrow field={field} sort={sort} inherit />
                  </button>
                ))}
              </>
            )}
          </div>
        )}

        {/* Song list */}
        {filtered.length === 0 ? (
          <div class="text-center text-text-muted py-16">
            {songs.length === 0 ? (
              <div>
                <p class="text-lg mb-2">Create your first song</p>
                <p class="text-sm">Tap "New Song" to start documenting your music.</p>
              </div>
            ) : (
              'No songs match your search.'
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sorted.map((s) => s.id)}
              strategy={rectSortingStrategy}
            >
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sorted.map((song) => (
                  <SortableGridCard
                    key={song.id}
                    song={song}
                    onDelete={handleDeleteSong}
                    dragEnabled={dragEnabled}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sorted.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div class="bg-surface-card rounded-xl overflow-hidden">
                {/* Table header — hidden on mobile */}
                <div class="hidden sm:grid sm:grid-cols-[24px_1fr_80px_70px_70px_100px_100px] gap-2 px-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wide border-b border-surface-hover">
                  <span></span>
                  {columnHeaders.map(({ field, label }) => (
                    <button
                      key={field}
                      onClick={() => handleSortChange(field)}
                      class="text-left hover:text-text-primary transition-colors flex items-center"
                    >
                      {label}
                      <SortArrow field={field} sort={sort} />
                    </button>
                  ))}
                </div>
                {sorted.map((song) => (
                  <SortableListRow
                    key={song.id}
                    song={song}
                    onDelete={handleDeleteSong}
                    dragEnabled={dragEnabled}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
