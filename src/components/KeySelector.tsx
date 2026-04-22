import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Chord } from '../db.ts';
import { detectKey, type KeyCandidate } from '../utils/keyDetection.ts';

const KEY_OPTIONS = [
  'Unknown',
  'C Major', 'C Minor', 'C# Major', 'C# Minor',
  'Db Major', 'Db Minor', 'D Major', 'D Minor',
  'Eb Major', 'Eb Minor', 'E Major', 'E Minor',
  'F Major', 'F Minor', 'F# Major', 'F# Minor',
  'Gb Major', 'Gb Minor', 'G Major', 'G Minor',
  'Ab Major', 'Ab Minor', 'A Major', 'A Minor',
  'Bb Major', 'Bb Minor', 'B Major', 'B Minor',
];

const HINT_CONFIDENCE_THRESHOLD = 0.7;
const LOW_CONFIDENCE_THRESHOLD = 0.5;
const SECONDARY_CONFIDENCE_FLOOR = 0.2;

function dismissalStorageKey(songId: string): string {
  return `songsketch:keyHintDismissed:${songId}`;
}

interface KeySelectorProps {
  songKey: string | null;
  onChange: (key: string | null) => void;
  chords: Chord[];
  songId: string;
}

export function KeySelector({ songKey, onChange, chords, songId }: KeySelectorProps) {
  const [open, setOpen] = useState(false);
  const [showMoreCandidates, setShowMoreCandidates] = useState(false);
  const [showManualList, setShowManualList] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setHintDismissed(localStorage.getItem(dismissalStorageKey(songId)) === '1');
    } catch {
      setHintDismissed(false);
    }
  }, [songId]);

  const candidates: KeyCandidate[] = useMemo(() => detectKey(chords), [chords]);
  const topCandidate = candidates[0] ?? null;
  const hasDetection = candidates.length > 0;
  const hasConfidentDetection =
    topCandidate !== null && topCandidate.confidence >= LOW_CONFIDENCE_THRESHOLD;

  const showPassiveHint =
    !songKey &&
    !hintDismissed &&
    topCandidate !== null &&
    topCandidate.confidence > HINT_CONFIDENCE_THRESHOLD;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setShowMoreCandidates(false);
    setShowManualList(false);
  }

  function applyKey(key: string | null) {
    onChange(key);
    close();
  }

  function handleDismissHint(e: MouseEvent) {
    e.stopPropagation();
    setHintDismissed(true);
    try {
      localStorage.setItem(dismissalStorageKey(songId), '1');
    } catch {
      // localStorage may be unavailable; dismissal still holds in state
    }
  }

  function handleHintClick() {
    setOpen(true);
  }

  const buttonLabel = songKey ?? 'Key';

  return (
    <div class="relative flex items-center gap-1.5" ref={wrapperRef}>
      <button
        onClick={() => (open ? close() : setOpen(true))}
        class="relative bg-surface-card hover:bg-surface-hover text-text-secondary px-2 py-1 rounded text-sm outline-none focus:ring-1 focus:ring-accent cursor-pointer flex items-center gap-1.5 transition-colors"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={songKey ? `Key: ${songKey}` : 'Select key'}
      >
        <span>{buttonLabel}</span>
        {hasDetection && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            class="text-accent"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3z" />
        </svg>
        {showPassiveHint && (
          <span
            class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent ring-2 ring-[var(--color-surface)]"
            aria-hidden="true"
          />
        )}
      </button>

      {showPassiveHint && topCandidate && (
        <button
          type="button"
          onClick={handleHintClick}
          class="flex items-center gap-1 text-xs text-accent bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded-full transition-colors"
          title="Click to review detected keys"
        >
          <span>Suggested: {topCandidate.key}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={handleDismissHint}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleDismissHint(e as unknown as MouseEvent);
              }
            }}
            class="ml-0.5 text-text-muted hover:text-text-primary leading-none"
            aria-label="Dismiss key suggestion"
          >
            ×
          </span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          class="absolute top-full left-0 mt-1 bg-surface-card border border-surface-hover rounded-xl shadow-lg z-30 w-72 max-h-[70vh] overflow-y-auto"
        >
          {songKey && (
            <div class="px-4 py-3 border-b border-surface-hover">
              <div class="text-[10px] text-text-muted uppercase tracking-wide mb-1">
                Current key
              </div>
              <div class="flex items-center justify-between">
                <span class="text-text-primary font-medium">{songKey}</span>
                <button
                  onClick={() => applyKey(null)}
                  class="text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div class="px-4 py-3">
            {hasDetection ? (
              hasConfidentDetection && topCandidate ? (
                <>
                  <div class="text-[10px] text-text-muted uppercase tracking-wide mb-2">
                    {songKey ? 'Detected alternatives' : 'Top guess'}
                  </div>
                  <div class="mb-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-lg font-semibold text-text-primary">
                        {topCandidate.key}
                      </span>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-text-muted tabular-nums">
                          {Math.round(topCandidate.confidence * 100)}%
                        </span>
                        <button
                          onClick={() => applyKey(topCandidate.key)}
                          disabled={topCandidate.key === songKey}
                          class="text-xs bg-accent hover:bg-accent-hover text-white px-2.5 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {topCandidate.key === songKey ? 'Applied' : 'Apply'}
                        </button>
                      </div>
                    </div>
                    <ConfidenceBar confidence={topCandidate.confidence} />
                    {topCandidate.reason && (
                      <div class="text-xs text-text-muted mt-1 capitalize">
                        {topCandidate.reason}
                      </div>
                    )}
                  </div>

                  {candidates.length > 1 && candidates[1].confidence >= SECONDARY_CONFIDENCE_FLOOR && (
                    <div class="mt-3">
                      <button
                        onClick={() => setShowMoreCandidates((v) => !v)}
                        class="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
                      >
                        <span class="inline-block w-2 text-center">
                          {showMoreCandidates ? '▾' : '▸'}
                        </span>
                        Other possibilities
                      </button>
                      {showMoreCandidates && (
                        <div class="mt-2 space-y-2">
                          {candidates
                            .slice(1, 4)
                            .filter((c) => c.confidence >= SECONDARY_CONFIDENCE_FLOOR)
                            .map((c) => (
                              <button
                                key={c.key}
                                onClick={() => applyKey(c.key)}
                                disabled={c.key === songKey}
                                class="w-full text-left hover:bg-surface-hover rounded px-2 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div class="flex items-center justify-between">
                                  <span class="text-sm text-text-primary">{c.key}</span>
                                  <span class="text-xs text-text-muted tabular-nums">
                                    {Math.round(c.confidence * 100)}%
                                  </span>
                                </div>
                                <ConfidenceBar confidence={c.confidence} />
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div class="text-sm text-text-muted">
                  Key unclear — the chord mix doesn't strongly point to one key. Pick manually
                  below.
                </div>
              )
            ) : (
              <div class="text-sm text-text-muted">
                {chords.length === 0
                  ? 'Add some chords and a suggestion will appear here.'
                  : 'Add at least 3 unique chords to see detection.'}
              </div>
            )}
          </div>

          <div class="border-t border-surface-hover">
            {!showManualList ? (
              <button
                onClick={() => setShowManualList(true)}
                class="w-full text-left px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                Choose manually…
              </button>
            ) : (
              <div class="py-1 max-h-64 overflow-y-auto">
                {KEY_OPTIONS.map((k) => {
                  const val = k === 'Unknown' ? null : k;
                  const selected = val === songKey;
                  return (
                    <button
                      key={k}
                      onClick={() => applyKey(val)}
                      class={`w-full text-left px-4 py-1.5 text-sm transition-colors ${
                        selected
                          ? 'bg-accent text-white'
                          : 'text-text-primary hover:bg-surface-hover'
                      }`}
                    >
                      {k === 'Unknown' ? 'Unknown / Clear' : k}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  return (
    <div class="h-1 bg-surface-hover rounded-full overflow-hidden mt-1">
      <div
        class="h-full bg-accent transition-all"
        style={{ width: `${Math.round(confidence * 100)}%` }}
      />
    </div>
  );
}
