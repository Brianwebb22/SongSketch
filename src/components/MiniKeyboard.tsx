import { useMemo } from 'preact/hooks';

interface MiniKeyboardProps {
  notes: number[];          // MIDI note numbers to highlight
  color: string;            // Fill color for pressed keys
  padding?: number;         // Extra white keys of padding on each side (default 3)
}

// Returns true if a MIDI note is a black key
function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

const NOTE_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function MiniKeyboard({ notes, color, padding = 3 }: MiniKeyboardProps) {
  const { whiteKeys, blackKeys, whiteKeyPositions, totalWidth, whiteKeyHeight, blackKeyHeight, blackKeyWidth, whiteKeyWidth, noteSet } = useMemo(() => {
    if (notes.length === 0) {
      // Show a blank octave (C4-B4) when no notes
      const start = 60;
      const end = 71;
      return buildKeyboard(start, end, 0, notes);
    }

    const minNote = Math.min(...notes);
    const maxNote = Math.max(...notes);

    // Find range boundaries - expand to include padding white keys
    let start = minNote;
    let end = maxNote;

    // Expand start backward by `padding` white keys
    let whiteCount = 0;
    while (whiteCount < padding && start > 21) {
      start--;
      if (!isBlackKey(start)) whiteCount++;
    }

    // Expand end forward by `padding` white keys
    whiteCount = 0;
    while (whiteCount < padding && end < 108) {
      end++;
      if (!isBlackKey(end)) whiteCount++;
    }

    // Snap start to a white key (round down)
    while (isBlackKey(start) && start > 21) start--;
    // Snap end to a white key (round up)
    while (isBlackKey(end) && end < 108) end++;

    return buildKeyboard(start, end, 0, notes);
  }, [notes, color, padding]);

  if (notes.length === 0) {
    return (
      <div class="flex items-center justify-center py-2">
        <span class="text-text-muted text-[9px]">No notes</span>
      </div>
    );
  }

  const wkw = whiteKeyWidth;

  return (
    <div class="flex flex-col items-center">
      <div
        style={{ width: totalWidth, height: whiteKeyHeight + 16, position: 'relative' }}
      >
        {/* White keys */}
        {whiteKeys.map((k) => {
          const x = whiteKeyPositions.get(k.midi)!;
          const pressed = noteSet.has(k.midi);
          return (
            <div
              key={k.midi}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: wkw - 1,
                height: whiteKeyHeight,
                backgroundColor: pressed ? color : '#D4D2CC',
                borderRadius: '0 0 3px 3px',
                border: '1px solid #555',
                borderTop: 'none',
              }}
            />
          );
        })}

        {/* Black keys */}
        {blackKeys.map((k) => {
          const pressed = noteSet.has(k.midi);
          // Position between adjacent white keys
          const prevWhiteX = whiteKeyPositions.get(k.midi - 1);
          const nextWhiteX = whiteKeyPositions.get(k.midi + 1);
          let x = 0;
          if (prevWhiteX !== undefined && nextWhiteX !== undefined) {
            x = (prevWhiteX + nextWhiteX) / 2 + wkw / 2 - blackKeyWidth / 2;
          } else if (prevWhiteX !== undefined) {
            x = prevWhiteX + wkw - blackKeyWidth / 2;
          } else if (nextWhiteX !== undefined) {
            x = nextWhiteX - blackKeyWidth / 2;
          }

          return (
            <div
              key={k.midi}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width: blackKeyWidth,
                height: blackKeyHeight,
                backgroundColor: pressed ? color : '#333',
                borderRadius: '0 0 2px 2px',
                border: '1px solid #222',
                borderTop: 'none',
                zIndex: 2,
              }}
            />
          );
        })}

        {/* Note labels for pressed keys */}
        {notes.map((midi) => {
          const black = isBlackKey(midi);
          let x: number;
          if (black) {
            const prevWhiteX = whiteKeyPositions.get(midi - 1);
            const nextWhiteX = whiteKeyPositions.get(midi + 1);
            if (prevWhiteX !== undefined && nextWhiteX !== undefined) {
              x = (prevWhiteX + nextWhiteX) / 2 + wkw / 2;
            } else if (prevWhiteX !== undefined) {
              x = prevWhiteX + wkw - blackKeyWidth / 2 + blackKeyWidth / 2;
            } else {
              x = (whiteKeyPositions.get(midi + 1) ?? 0);
            }
          } else {
            x = (whiteKeyPositions.get(midi) ?? 0) + (wkw - 1) / 2;
          }

          return (
            <span
              key={`lbl-${midi}`}
              style={{
                position: 'absolute',
                left: x,
                top: whiteKeyHeight + 2,
                transform: 'translateX(-50%)',
                fontSize: 8,
                fontWeight: 700,
                color,
                whiteSpace: 'nowrap',
              }}
            >
              {NOTE_LABELS[midi % 12]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function buildKeyboard(start: number, end: number, _unused: number, notes: number[]) {
  const whiteKeyWidth = 14;
  const blackKeyWidth = 9;
  const whiteKeyHeight = 44;
  const blackKeyHeight = 28;

  const keys: { midi: number; isBlack: boolean; label: string }[] = [];
  for (let m = start; m <= end; m++) {
    keys.push({ midi: m, isBlack: isBlackKey(m), label: NOTE_LABELS[m % 12] });
  }

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const whiteKeyPositions = new Map<number, number>();
  whiteKeys.forEach((k, i) => {
    whiteKeyPositions.set(k.midi, i * whiteKeyWidth);
  });

  const totalWidth = whiteKeys.length * whiteKeyWidth;
  const noteSet = new Set(notes);

  return { whiteKeys, blackKeys, whiteKeyPositions, totalWidth, whiteKeyHeight, blackKeyHeight, blackKeyWidth, whiteKeyWidth, noteSet };
}
