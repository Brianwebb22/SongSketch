import { useMemo, useState, useEffect, useRef } from 'preact/hooks';

interface PianoKeyboardProps {
  bassNotes: number[];     // MIDI note numbers selected as bass
  voicingNotes: number[];  // MIDI note numbers selected as voicing
  activeLayer: 'bass' | 'voicing';
  onToggleNote: (midi: number) => void;
}

// Returns true if a MIDI note is a black key
function isBlackKey(midi: number): boolean {
  const pc = midi % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}

const NOTE_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function octaveLabel(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

// Desaturated/darkened colors for inactive layer
const VOICING_ACTIVE = '#7289DA';
const VOICING_DIMMED = '#3D4560';
const BASS_ACTIVE = '#D85A30';
const BASS_DIMMED = '#5C3020';

export function PianoKeyboard({
  bassNotes,
  voicingNotes,
  activeLayer,
  onToggleNote,
}: PianoKeyboardProps) {
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const prevLayerRef = useRef(activeLayer);

  // Auto-jump octave when switching layers, if target layer has notes
  useEffect(() => {
    if (activeLayer === prevLayerRef.current) return;
    prevLayerRef.current = activeLayer;

    const targetNotes = activeLayer === 'bass' ? bassNotes : voicingNotes;
    if (targetNotes.length === 0) return;

    const minNote = Math.min(...targetNotes);
    const maxNote = Math.max(...targetNotes);
    const midNote = Math.round((minNote + maxNote) / 2);
    // Calculate octave offset to center the notes in a 2-octave window (C-B spanning 24 semitones)
    // Default window is C3(48) to B4(71). Shift so midNote is roughly centered.
    const targetOffset = Math.round((midNote - 60) / 12); // 60 = midpoint of default range
    const clampedOffset = Math.max(-2, Math.min(3, targetOffset)); // keep within piano range
    setOctaveOffset(clampedOffset);
  }, [activeLayer, bassNotes, voicingNotes]);

  const startMidi = 48 + octaveOffset * 12;
  const endMidi = 71 + octaveOffset * 12;

  const clampedStart = Math.max(21, startMidi);
  const clampedEnd = Math.min(108, endMidi);

  const canGoLower = clampedStart - 12 >= 21;
  const canGoHigher = clampedEnd + 12 <= 108;

  const keys = useMemo(() => {
    const result: { midi: number; isBlack: boolean; label: string }[] = [];
    for (let m = clampedStart; m <= clampedEnd; m++) {
      result.push({
        midi: m,
        isBlack: isBlackKey(m),
        label: NOTE_LABELS[m % 12],
      });
    }
    return result;
  }, [clampedStart, clampedEnd]);

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const bassSet = useMemo(() => new Set(bassNotes), [bassNotes]);
  const voicingSet = useMemo(() => new Set(voicingNotes), [voicingNotes]);

  const whiteKeyWidth = 44;
  const totalWidth = whiteKeys.length * whiteKeyWidth;
  const whiteKeyHeight = 140;
  const blackKeyHeight = 90;
  const blackKeyWidth = 28;
  const arrowBtnWidth = 32;

  const whiteKeyPositions = new Map<number, number>();
  whiteKeys.forEach((k, i) => {
    whiteKeyPositions.set(k.midi, i * whiteKeyWidth);
  });

  function getBlackKeyX(midi: number): number {
    const prevWhite = midi - 1;
    const nextWhite = midi + 1;
    const prevX = whiteKeyPositions.get(prevWhite);
    const nextX = whiteKeyPositions.get(nextWhite);

    if (prevX !== undefined && nextX !== undefined) {
      return (prevX + nextX) / 2 + whiteKeyWidth / 2 - blackKeyWidth / 2;
    }
    if (prevX !== undefined) {
      return prevX + whiteKeyWidth - blackKeyWidth / 2;
    }
    if (nextX !== undefined) {
      return nextX - blackKeyWidth / 2;
    }
    return 0;
  }

  function getKeyColor(midi: number, isBlack: boolean): string {
    const isBass = bassSet.has(midi);
    const isVoicing = voicingSet.has(midi);

    if (isBass && isVoicing) {
      // Both layers — show active at full color, inactive dimmed
      return activeLayer === 'bass' ? BASS_ACTIVE : VOICING_ACTIVE;
    }
    if (isBass) {
      return activeLayer === 'bass' ? BASS_ACTIVE : BASS_DIMMED;
    }
    if (isVoicing) {
      return activeLayer === 'voicing' ? VOICING_ACTIVE : VOICING_DIMMED;
    }

    return isBlack ? '#333' : '#D4D2CC';
  }

  function getLabelColor(midi: number): string {
    const isBass = bassSet.has(midi);
    const isVoicing = voicingSet.has(midi);

    if (isBass && isVoicing) {
      return activeLayer === 'bass' ? BASS_ACTIVE : VOICING_ACTIVE;
    }
    if (isBass) return activeLayer === 'bass' ? BASS_ACTIVE : BASS_DIMMED;
    if (isVoicing) return activeLayer === 'voicing' ? VOICING_ACTIVE : VOICING_DIMMED;
    return '#888';
  }

  const rangeLabel = `C${octaveLabel(clampedStart)}\u2013B${octaveLabel(clampedEnd)}`;

  return (
    <div>
      {/* Range label + notes toggle */}
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-text-muted font-mono">{rangeLabel}</span>
        <button
          onClick={() => setShowAllLabels((v) => !v)}
          class={`text-xs px-2 py-1 rounded transition-colors ${
            showAllLabels
              ? 'bg-accent/20 text-accent'
              : 'bg-surface-hover text-text-muted hover:text-text-secondary'
          }`}
        >
          Notes
        </button>
      </div>

      {/* Keyboard with arrow buttons on sides */}
      <div class="flex items-stretch">
        {/* Left arrow — flush with keyboard edge */}
        <button
          onClick={() => setOctaveOffset((o) => o - 1)}
          disabled={!canGoLower}
          class="shrink-0 flex items-center justify-center bg-surface-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-l"
          style={{ width: arrowBtnWidth }}
          title="Lower octave"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10 3l-5 5 5 5z"/></svg>
        </button>

        <div class="overflow-x-auto pb-2 flex-1 min-w-0">
          <div
            style={{ width: totalWidth, height: whiteKeyHeight + 24, position: 'relative' }}
            class="mx-auto"
          >
            {/* White keys */}
            {whiteKeys.map((k) => {
              const x = whiteKeyPositions.get(k.midi)!;
              const color = getKeyColor(k.midi, false);
              return (
                <button
                  key={k.midi}
                  onClick={() => onToggleNote(k.midi)}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: 0,
                    width: whiteKeyWidth - 2,
                    height: whiteKeyHeight,
                    backgroundColor: color,
                    borderRadius: '0 0 6px 6px',
                    border: '1px solid #555',
                    borderTop: 'none',
                    cursor: 'pointer',
                    zIndex: 1,
                  }}
                  aria-label={k.label}
                >
                  {showAllLabels && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: 9,
                        fontWeight: 600,
                        color: (bassSet.has(k.midi) || voicingSet.has(k.midi)) ? '#fff' : '#888',
                        pointerEvents: 'none',
                      }}
                    >
                      {k.label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Black keys */}
            {blackKeys.map((k) => {
              const x = getBlackKeyX(k.midi);
              const color = getKeyColor(k.midi, true);
              return (
                <button
                  key={k.midi}
                  onClick={() => onToggleNote(k.midi)}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: 0,
                    width: blackKeyWidth,
                    height: blackKeyHeight,
                    backgroundColor: color,
                    borderRadius: '0 0 4px 4px',
                    border: '1px solid #222',
                    borderTop: 'none',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                  aria-label={k.label}
                >
                  {showAllLabels && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: 8,
                        fontWeight: 600,
                        color: (bassSet.has(k.midi) || voicingSet.has(k.midi)) ? '#fff' : '#aaa',
                        pointerEvents: 'none',
                      }}
                    >
                      {k.label}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Note labels below keyboard for pressed keys */}
            {keys.map((k) => {
              const isBass = bassSet.has(k.midi);
              const isVoicing = voicingSet.has(k.midi);
              if (!isBass && !isVoicing) return null;

              const x = k.isBlack
                ? getBlackKeyX(k.midi) + blackKeyWidth / 2
                : whiteKeyPositions.get(k.midi)! + (whiteKeyWidth - 2) / 2;

              const labelColor = getLabelColor(k.midi);

              return (
                <span
                  key={`label-${k.midi}`}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: whiteKeyHeight + 4,
                    transform: 'translateX(-50%)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: labelColor,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {k.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right arrow — flush with keyboard edge */}
        <button
          onClick={() => setOctaveOffset((o) => o + 1)}
          disabled={!canGoHigher}
          class="shrink-0 flex items-center justify-center bg-surface-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-r"
          style={{ width: arrowBtnWidth }}
          title="Higher octave"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5z"/></svg>
        </button>
      </div>
    </div>
  );
}
