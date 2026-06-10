import { useEffect, useRef } from 'preact/hooks';

// Standard tuning, low to high
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
export const STRING_LABELS_LOW_TO_HIGH = ['E', 'A', 'D', 'G', 'B', 'E'];
// Unambiguous names for aria-labels (two strings share the visible label "E")
const STRING_NAMES_LOW_TO_HIGH = ['Low E', 'A', 'D', 'G', 'B', 'High E'];

/** State for one string. number ≥ 1 = fretted; 0 = open; 'x' = muted; null = unplayed. */
export type StringState = number | 'open' | 'muted' | null;

interface FretboardProps {
  /** length 6, low-to-high (low E first) */
  stringStates: StringState[];
  /** Updater form so rapid taps in the same frame don't clobber each other. */
  onChange: (updater: (prev: StringState[]) => StringState[]) => void;
  numFrets?: number;
  /** Highlighted fret label shown when shape sets non-zero starting fret (visual cue only). */
  highlightFret?: number | null;
}

const STRING_HEIGHT = 44;
const FRET_WIDTH = 60;
const NUT_WIDTH = 16;
const LABEL_WIDTH = 22;
const INDICATOR_WIDTH = 26;
const TOP_PADDING = 12;
const BOTTOM_PADDING = 20;
const MARKER_FRETS_SINGLE = [3, 5, 7, 9];
const MARKER_FRETS_DOUBLE = [12, 15];
const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 8;

/**
 * Convert a string state to its sounding MIDI note, or null if not played.
 * stringIdx is the low-to-high index (0 = low E).
 */
export function stringStateToMidi(state: StringState, stringIdx: number, tuning = STANDARD_TUNING): number | null {
  if (state === null || state === 'muted') return null;
  if (state === 'open') return tuning[stringIdx];
  return tuning[stringIdx] + state; // state is the fret number ≥ 1
}

/** Get all sounding MIDI notes from a string-state array. */
export function fretboardToMidi(stringStates: StringState[], tuning = STANDARD_TUNING): number[] {
  const notes: number[] = [];
  for (let i = 0; i < stringStates.length; i++) {
    const m = stringStateToMidi(stringStates[i], i, tuning);
    if (m !== null) notes.push(m);
  }
  return notes;
}

export function Fretboard({ stringStates, onChange, numFrets = 15, highlightFret = null }: FretboardProps) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const fretboardWidth = NUT_WIDTH + FRET_WIDTH * numFrets;
  const fretboardHeight = STRING_HEIGHT * 6;
  const totalHeight = TOP_PADDING + fretboardHeight + BOTTOM_PADDING;

  // Display top-to-bottom: high E (lowToHighIdx 5) first, low E (idx 0) last.
  const displayOrder = [5, 4, 3, 2, 1, 0];

  function updateString(stringIdx: number, compute: (current: StringState) => StringState) {
    onChange((prev) => {
      const next = [...prev];
      next[stringIdx] = compute(prev[stringIdx]);
      return next;
    });
  }

  function handleTap(stringIdx: number, fretIdx: number) {
    // fretIdx 0 = nut/open, 1..numFrets = fretted
    if (fretIdx === 0) {
      updateString(stringIdx, (current) => (current === 'open' ? null : 'open'));
    } else {
      updateString(stringIdx, (current) => (current === fretIdx ? null : fretIdx));
    }
  }

  function toggleMuted(stringIdx: number) {
    updateString(stringIdx, (current) => (current === 'muted' ? null : 'muted'));
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onPointerDown(e: PointerEvent, stringIdx: number) {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    longPressFiredRef.current = false;
    movedRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      toggleMuted(stringIdx);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: PointerEvent) {
    if (!pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      movedRef.current = true;
      clearLongPressTimer();
    }
  }

  function onPointerUp(stringIdx: number, fretIdx: number) {
    clearLongPressTimer();
    const wasMove = movedRef.current;
    const wasLongPress = longPressFiredRef.current;
    pointerStartRef.current = null;
    movedRef.current = false;
    longPressFiredRef.current = false;
    if (wasLongPress || wasMove) return;
    handleTap(stringIdx, fretIdx);
  }

  // Cleanup any pending timer on unmount
  useEffect(() => () => clearLongPressTimer(), []);

  function fretCellX(fretIdx: number): number {
    // Center x of the cell (for finger dot placement)
    if (fretIdx === 0) return NUT_WIDTH / 2;
    return NUT_WIDTH + (fretIdx - 0.5) * FRET_WIDTH;
  }

  function stringRowY(displayIdx: number): number {
    return TOP_PADDING + displayIdx * STRING_HEIGHT + STRING_HEIGHT / 2;
  }

  return (
    <div
      class="overflow-x-auto -mx-3 px-3"
      onPointerMove={onPointerMove}
    >
      <div style={{ display: 'flex', minWidth: 'max-content' }}>
        {/* Sticky left columns: string letter + X/O indicator */}
        <div
          style={{
            position: 'sticky',
            left: 0,
            zIndex: 5,
            backgroundColor: 'var(--color-surface-card)',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: TOP_PADDING,
            paddingBottom: BOTTOM_PADDING,
            paddingRight: 4,
            boxShadow: '2px 0 6px rgba(0,0,0,0.25)',
          }}
        >
          {displayOrder.map((stringIdx) => {
            const state = stringStates[stringIdx];
            const isMuted = state === 'muted';
            const indicator = state === 'open' ? 'O' : state === 'muted' ? 'X' : '';
            const indicatorColor = state === 'open' ? 'var(--color-accent)' : 'var(--color-text-muted)';
            return (
              <button
                key={stringIdx}
                onClick={() => toggleMuted(stringIdx)}
                aria-label={`Toggle mute on ${STRING_NAMES_LOW_TO_HIGH[stringIdx]} string`}
                aria-pressed={isMuted}
                title="Mute/unmute string"
                style={{
                  height: STRING_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  opacity: isMuted ? 0.5 : 1,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span
                  style={{
                    width: LABEL_WIDTH,
                    textAlign: 'center',
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {STRING_LABELS_LOW_TO_HIGH[stringIdx]}
                </span>
                <span
                  style={{
                    width: INDICATOR_WIDTH,
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: indicatorColor,
                  }}
                >
                  {indicator}
                </span>
              </button>
            );
          })}
        </div>

        {/* Fretboard playing area */}
        <div
          style={{
            position: 'relative',
            width: fretboardWidth,
            height: totalHeight,
            backgroundColor: 'var(--color-surface)',
            borderRadius: 4,
          }}
        >
          {/* Position markers */}
          {MARKER_FRETS_SINGLE.filter((f) => f <= numFrets).map((f) => (
            <div
              key={`mk1-${f}`}
              style={{
                position: 'absolute',
                left: fretCellX(f),
                top: TOP_PADDING + fretboardHeight / 2,
                transform: 'translate(-50%, -50%)',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.07)',
                pointerEvents: 'none',
              }}
            />
          ))}
          {MARKER_FRETS_DOUBLE.filter((f) => f <= numFrets).map((f) => (
            <div key={`mk2-${f}`} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  position: 'absolute',
                  left: fretCellX(f),
                  top: TOP_PADDING + fretboardHeight * 0.3,
                  transform: 'translate(-50%, -50%)',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: fretCellX(f),
                  top: TOP_PADDING + fretboardHeight * 0.7,
                  transform: 'translate(-50%, -50%)',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.07)',
                }}
              />
            </div>
          ))}

          {/* Fret number labels along the bottom */}
          {Array.from({ length: numFrets }, (_, i) => i + 1).map((f) => (
            <div
              key={`fn-${f}`}
              style={{
                position: 'absolute',
                left: fretCellX(f),
                top: TOP_PADDING + fretboardHeight + 4,
                transform: 'translateX(-50%)',
                fontSize: 10,
                fontFamily: 'monospace',
                color: f === highlightFret ? 'var(--color-accent)' : 'var(--color-text-muted)',
                fontWeight: f === highlightFret ? 700 : 400,
                pointerEvents: 'none',
              }}
            >
              {f}
            </div>
          ))}

          {/* String lines */}
          {displayOrder.map((stringIdx, displayIdx) => {
            const isMuted = stringStates[stringIdx] === 'muted';
            // Thicker for low strings, thinner for high
            const thickness = 1 + (stringIdx === 5 ? 0 : (5 - stringIdx) * 0.4);
            return (
              <div
                key={`line-${stringIdx}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: stringRowY(displayIdx) - thickness / 2,
                  height: thickness,
                  backgroundColor: isMuted ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)',
                  pointerEvents: 'none',
                }}
              />
            );
          })}

          {/* Nut (thick line at right edge of nut column) */}
          <div
            style={{
              position: 'absolute',
              left: NUT_WIDTH - 3,
              top: TOP_PADDING - 4,
              width: 4,
              height: fretboardHeight + 8,
              backgroundColor: 'var(--color-text-secondary)',
              pointerEvents: 'none',
            }}
          />

          {/* Fret wires */}
          {Array.from({ length: numFrets }, (_, i) => i + 1).map((f) => (
            <div
              key={`fret-${f}`}
              style={{
                position: 'absolute',
                left: NUT_WIDTH + f * FRET_WIDTH - 1,
                top: TOP_PADDING,
                width: 2,
                height: fretboardHeight,
                backgroundColor: 'rgba(180,180,200,0.35)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Tap zones — one per string per fret slot (including nut at fretIdx 0) */}
          {displayOrder.map((stringIdx, displayIdx) => (
            <div key={`zones-${stringIdx}`}>
              {Array.from({ length: numFrets + 1 }, (_, fretIdx) => {
                const left = fretIdx === 0 ? 0 : NUT_WIDTH + (fretIdx - 1) * FRET_WIDTH;
                const width = fretIdx === 0 ? NUT_WIDTH : FRET_WIDTH;
                return (
                  <button
                    key={`zone-${stringIdx}-${fretIdx}`}
                    onPointerDown={(e) => onPointerDown(e, stringIdx)}
                    onPointerUp={() => onPointerUp(stringIdx, fretIdx)}
                    onPointerCancel={() => {
                      clearLongPressTimer();
                      pointerStartRef.current = null;
                      longPressFiredRef.current = false;
                    }}
                    aria-label={`${STRING_NAMES_LOW_TO_HIGH[stringIdx]} string ${fretIdx === 0 ? 'open/nut' : `fret ${fretIdx}`}`}
                    style={{
                      position: 'absolute',
                      left,
                      top: TOP_PADDING + displayIdx * STRING_HEIGHT,
                      width,
                      height: STRING_HEIGHT,
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      touchAction: 'manipulation',
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* Finger dots */}
          {displayOrder.map((stringIdx, displayIdx) => {
            const state = stringStates[stringIdx];
            if (typeof state !== 'number') return null;
            if (state < 1 || state > numFrets) return null;
            return (
              <div
                key={`dot-${stringIdx}`}
                style={{
                  position: 'absolute',
                  left: fretCellX(state),
                  top: stringRowY(displayIdx),
                  transform: 'translate(-50%, -50%)',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-accent)',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  pointerEvents: 'none',
                }}
              >
                {state}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Build a default empty fretboard state (6 unplayed strings). */
export function emptyFretboardState(): StringState[] {
  return [null, null, null, null, null, null];
}

/**
 * Convert a guitar shape's frets array (low-to-high, with 'x' for muted, 0 for open)
 * into Fretboard StringState values.
 */
export function shapeToStringStates(frets: (number | 'x')[]): StringState[] {
  return frets.map((f) => {
    if (f === 'x') return 'muted';
    if (f === 0) return 'open';
    return f;
  });
}
