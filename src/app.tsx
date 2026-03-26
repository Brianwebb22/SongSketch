import { useEffect, useState } from 'preact/hooks';
import { SongListPage } from './pages/SongListPage.tsx';
import { SongWorkspacePage } from './pages/SongWorkspacePage.tsx';
import { useTheme } from './hooks/useTheme.ts';
import { db } from './db.ts';
import { createSampleSong } from './data/sampleSong.ts';

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
    </div>
  );
}
