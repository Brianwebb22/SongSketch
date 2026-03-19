import { useEffect, useState } from 'preact/hooks';
import { navigate } from '../app.tsx';
import { db } from '../db.ts';
import type { Song, Section } from '../db.ts';
import type { Theme } from '../hooks/useTheme.ts';
import { AppFooter } from '../components/AppFooter.tsx';

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

interface SongListPageProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function SongListPage({ theme, onToggleTheme }: SongListPageProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSongs();
  }, []);

  async function loadSongs() {
    const all = await db.songs.orderBy('updatedAt').reverse().toArray();
    setSongs(all);
  }

  async function handleNewSong() {
    const song = createNewSong();
    await db.songs.add(song);
    navigate(`/song/${song.id}`);
  }

  async function handleDeleteSong(id: string) {
    await db.songs.delete(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  const filtered = search
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : songs;

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

        {/* Search */}
        {songs.length > 0 && (
          <input
            type="text"
            placeholder="Search songs..."
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            class="w-full bg-surface-card text-text-primary placeholder-text-muted rounded-lg px-4 py-2.5 mb-6 outline-none focus:ring-2 focus:ring-accent"
          />
        )}

        {/* Song grid */}
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
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((song) => (
              <div
                key={song.id}
                class="bg-surface-card hover:bg-surface-hover rounded-xl p-4 text-left transition-colors relative group"
              >
                <button
                  onClick={() => navigate(`/song/${song.id}`)}
                  class="w-full text-left"
                >
                  <h3 class="font-medium text-text-primary truncate">{song.title}</h3>
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${song.title}"?`)) {
                      handleDeleteSong(song.id);
                    }
                  }}
                  class="absolute top-3 right-3 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm p-1"
                  aria-label={`Delete ${song.title}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
