import { useEffect, useState } from 'preact/hooks';
import { SongListPage } from './pages/SongListPage.tsx';
import { SongWorkspacePage } from './pages/SongWorkspacePage.tsx';
import { useTheme } from './hooks/useTheme.ts';

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
