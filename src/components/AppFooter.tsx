import { useState } from 'preact/hooks';

export function AppFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <footer class="py-4 text-center text-xs text-text-muted">
        <button
          onClick={() => setAboutOpen(true)}
          class="hover:text-text-secondary transition-colors"
        >
          About
        </button>
        <span class="mx-2">·</span>
        <a
          href="https://github.com/Brianwebb22/SongSketch"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:text-text-secondary transition-colors"
        >
          GitHub
        </a>
        <span class="mx-2">·</span>
        <a
          href="https://buymeacoffee.com/brianwebb"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-opacity hover:opacity-80"
          style={{ color: '#947E00' }}
        >
          Buy me a coffee
        </a>
      </footer>

      {aboutOpen && (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setAboutOpen(false); }}
        >
          <div class="bg-surface-card rounded-2xl shadow-xl max-w-sm mx-4 p-6">
            <h2 class="text-lg font-semibold text-text-primary mb-2">SongSketch</h2>
            <p class="text-sm text-text-secondary leading-relaxed mb-4">
              A songwriter's workbench for musicians who play by ear. Document your songs, identify chords, find tempo via tap, and organize song structures — no sheet music required.
            </p>
            <div class="flex justify-end">
              <button
                onClick={() => setAboutOpen(false)}
                class="text-sm text-accent hover:text-accent-hover transition-colors px-3 py-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
