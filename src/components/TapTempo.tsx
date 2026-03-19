import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

interface TapTempoProps {
  bpm: number | null;
  onBpmChange: (bpm: number) => void;
}

export function TapTempo({ bpm, onBpmChange }: TapTempoProps) {
  const [tapping, setTapping] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayBpm, setDisplayBpm] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [flash, setFlash] = useState(false);
  const tapsRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const finalize = useCallback((calculatedBpm: number) => {
    setTapping(false);
    setEditing(false);
    setDisplayBpm(null);
    setInputValue(String(calculatedBpm));
    tapsRef.current = [];
    onBpmChange(calculatedBpm);
  }, [onBpmChange]);

  const handleTap = useCallback(() => {
    const now = performance.now();

    // Flash feedback
    setFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setFlash(false), 120);

    // Clear any existing finalization timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!tapping) {
      setTapping(true);
      tapsRef.current = [now];
      setDisplayBpm(null);

      timeoutRef.current = setTimeout(() => {
        setTapping(false);
        setDisplayBpm(null);
        tapsRef.current = [];
      }, 3000);
      return;
    }

    tapsRef.current.push(now);
    const taps = tapsRef.current;

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clamped = Math.max(20, Math.min(300, calculatedBpm));
      setDisplayBpm(clamped);

      timeoutRef.current = setTimeout(() => {
        finalize(clamped);
      }, 3000);
    }
  }, [tapping, finalize]);

  function handleBpmClick() {
    if (tapping) return;
    setInputValue(bpm ? String(bpm) : '');
    setEditing(true);
  }

  function commitBpmInput() {
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && val >= 20 && val <= 300) {
      onBpmChange(val);
    }
    setEditing(false);
    setTapping(false);
    setDisplayBpm(null);
    tapsRef.current = [];
  }

  function handleInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      commitBpmInput();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  function handleInputBlur() {
    setTimeout(() => {
      if (!tapping) {
        commitBpmInput();
      }
    }, 150);
  }

  function handleReset() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTapping(false);
    setDisplayBpm(null);
    tapsRef.current = [];
  }

  return (
    <div class="flex items-center gap-1.5">
      {editing ? (
        <>
          <input
            ref={inputRef}
            type="number"
            min="20"
            max="300"
            value={tapping ? (displayBpm != null ? String(displayBpm) : '') : inputValue}
            onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            readOnly={tapping}
            class="w-16 bg-surface-hover text-text-primary text-sm px-2 py-1 rounded text-center outline-none focus:ring-1 focus:ring-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder={tapping ? 'Tap...' : 'BPM'}
          />
          {/* Fixed-layout container: tap button + reset space always reserved */}
          <div class="flex items-center gap-1.5">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleTap();
              }}
              class={`w-14 h-14 rounded-full text-sm font-semibold select-none active:scale-95 transition-all duration-100 flex items-center justify-center shrink-0 ${
                flash
                  ? 'bg-white text-gray-900'
                  : tapping
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-text-secondary hover:bg-accent/30'
              }`}
              title="Tap to set BPM"
            >
              {tapping ? (displayBpm != null ? displayBpm : 'Tap') : 'Tap'}
            </button>
            {/* Reset always takes space to prevent layout shift */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleReset();
              }}
              class={`text-xs transition-colors w-10 ${
                tapping
                  ? 'text-text-muted hover:text-text-secondary'
                  : 'invisible'
              }`}
            >
              Reset
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleBpmClick}
          class="bg-surface-card hover:bg-surface-hover px-3 py-1 rounded text-sm text-text-secondary transition-colors select-none"
          title="Click to enter BPM"
        >
          {bpm ? `${bpm} BPM` : '-- BPM'}
        </button>
      )}
    </div>
  );
}
