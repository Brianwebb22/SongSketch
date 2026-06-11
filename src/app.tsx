import { useEffect, useMemo, useState } from 'preact/hooks';
import { SongListPage } from './pages/SongListPage.tsx';
import { SongWorkspacePage } from './pages/SongWorkspacePage.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { db } from './db.ts';
import { createSampleSong } from './data/sampleSong.ts';
import { QuickTools, type QuickTool } from './components/QuickTools.tsx';
import { ChordFinder } from './components/ChordFinder.tsx';
import { Tuner } from './components/Tuner.tsx';

function getHashRoute(): { path: string; id?: string } {
  const hash = window.location.hash.slice(1) || '/';
  const songMatch = hash.match(/^\/song\/(.+)$/);
  if (songMatch) return { path: 'song', id: songMatch[1] };
  return { path: '/' };
}

export function navigate(url: string) {
  window.location.hash = url;
}

export function App() {
  const [routeState, setRouteState] = useState(getHashRoute);
  const { theme, toggleTheme } = useTheme();
  const [chordFinderOpen, setChordFinderOpen] = useState(false);
  const [tunerOpen, setTunerOpen] = useState(false);

  const quickTools: QuickTool[] = useMemo(() => [
    {
      id: 'chord-finder',
      label: 'Chord Finder',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6" />
          <path d="M8 6v7M12 6v7M16 6v7" stroke="currentColor" stroke-width="1.6" />
          <rect x="6.5" y="13" width="2.5" height="3.5" fill="currentColor" />
          <rect x="14.5" y="13" width="2.5" height="3.5" fill="currentColor" />
        </svg>
      ),
      onSelect: () => setChordFinderOpen(true),
    },
    {
      id: 'tuner',
      label: 'Tuner',
      icon: (
        // Tuning fork
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 3v7a4 4 0 0 0 8 0V3M12 14v7"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
          <path d="M9.5 21h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      ),
      onSelect: () => setTunerOpen(true),
    },
  ], []);

  useEffect(() => {
    const onHashChange = () => setRouteState(getHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Load sample song on first launch
  useEffect(() => {
    const FLAG = 'songsketch-sample-loaded';
    if (!localStorage.getItem(FLAG)) {
      db.songs.add(createSampleSong()).then(() => {
        localStorage.setItem(FLAG, '1');
      }).catch(() => {
        // Song may already exist (e.g. race condition) — mark as loaded
        localStorage.setItem(FLAG, '1');
      });
    }
  }, []);

  return (
    <div class="min-h-screen">
      {routeState.path === 'song' && routeState.id ? (
        <SongWorkspacePage id={routeState.id} theme={theme} onToggleTheme={toggleTheme} />
      ) : (
        <SongListPage theme={theme} onToggleTheme={toggleTheme} />
      )}
      <QuickTools tools={quickTools} />
      <ChordFinder open={chordFinderOpen} onClose={() => setChordFinderOpen(false)} />
      <Tuner open={tunerOpen} onClose={() => setTunerOpen(false)} />
    </div>
  );
}
