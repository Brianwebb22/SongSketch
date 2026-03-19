import { useMemo } from 'preact/hooks';

interface PianoKeyboardProps {
  bassNotes: number[];     // MIDI note numbers selected as bass
  voicingNotes: number[];  // MIDI note numbers selected as voicing
  activeLayer: 'bass' | 'voicing';
  onToggleNote: (midi: number) => void;
  startMidi?: number;      // default C3 = 48
  endMidi?: number;        // default B4 = 71
}

// Returns true if a MIDI note is a black key
function isBlackKey(midi: number): boolean {
  const pc = midi % 12;
  return [1, 3, 6, 8, 10].includes(pc);
}

const NOTE_LABELS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function PianoKeyboard({
  bassNotes,
  voicingNotes,
  activeLayer,
  onToggleNote,
  startMidi = 48,  // C3
  endMidi = 71,    // B4
}: PianoKeyboardProps) {
  // Build key data for the range
  const keys = useMemo(() => {
    const result: { midi: number; isBlack: boolean; label: string }[] = [];
    for (let m = startMidi; m <= endMidi; m++) {
      result.push({
        midi: m,
        isBlack: isBlackKey(m),
        label: NOTE_LABELS[m % 12],
      });
    }
    return result;
  }, [startMidi, endMidi]);

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const bassSet = useMemo(() => new Set(bassNotes), [bassNotes]);
  const voicingSet = useMemo(() => new Set(voicingNotes), [voicingNotes]);

  // White key width and total
  const whiteKeyWidth = 44; // px — meets 44px min touch target
  const totalWidth = whiteKeys.length * whiteKeyWidth;
  const whiteKeyHeight = 140;
  const blackKeyHeight = 90;
  const blackKeyWidth = 28;

  // Map each white key to its x position
  const whiteKeyPositions = new Map<number, number>();
  whiteKeys.forEach((k, i) => {
    whiteKeyPositions.set(k.midi, i * whiteKeyWidth);
  });

  // For black keys, position between the two adjacent white keys
  function getBlackKeyX(midi: number): number {
    // A black key sits between the white key below and above
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
      // Both — show active layer color with a gradient hint
      return activeLayer === 'bass' ? '#D85A30' : '#7289DA';
    }
    if (isBass) return '#D85A30';   // coral
    if (isVoicing) return '#7289DA'; // accent blue

    // Unpressed
    return isBlack ? '#333' : '#D4D2CC';
  }

  return (
    <div class="overflow-x-auto pb-2">
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
            />
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
            />
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

          const labelColor = isBass ? '#D85A30' : '#7289DA';

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
  );
}
