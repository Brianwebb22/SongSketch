import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

interface TapTempoProps {
  bpm: number | null;
  onBpmChange: (bpm: number) => void;
}

export function TapTempo({ bpm, onBpmChange }: TapTempoProps) {
  const [tapping, setTapping] = useState(false);
  const [displayBpm, setDisplayBpm] = useState<number | null>(null);
  const tapsRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const finalize = useCallback((calculatedBpm: number) => {
    setTapping(false);
    setDisplayBpm(null);
    tapsRef.current = [];
    onBpmChange(calculatedBpm);
  }, [onBpmChange]);

  const handleTap = useCallback(() => {
    const now = performance.now();

    // Clear any existing finalization timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!tapping) {
      // First tap — start
      setTapping(true);
      tapsRef.current = [now];
      setDisplayBpm(null);

      // Set 3-second timeout to cancel if no follow-up
      timeoutRef.current = setTimeout(() => {
        setTapping(false);
        setDisplayBpm(null);
        tapsRef.current = [];
      }, 3000);
      return;
    }

    // Subsequent taps
    tapsRef.current.push(now);
    const taps = tapsRef.current;

    if (taps.length >= 2) {
      // Calculate average interval
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      const clamped = Math.max(20, Math.min(300, calculatedBpm));
      setDisplayBpm(clamped);

      // Set 3-second finalization timeout
      timeoutRef.current = setTimeout(() => {
        finalize(clamped);
      }, 3000);
    }
  }, [tapping, finalize]);

  const handleReset = useCallback((e: Event) => {
    e.stopPropagation();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTapping(false);
    setDisplayBpm(null);
    tapsRef.current = [];
  }, []);

  if (tapping) {
    return (
      <div class="flex items-center gap-2">
        <button
          onClick={handleTap}
          class="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors select-none active:scale-95 min-w-[80px]"
        >
          {displayBpm != null ? `${displayBpm}` : 'Tap...'}
        </button>
        <button
          onClick={handleReset}
          class="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Reset
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleTap}
      class="bg-surface-card hover:bg-surface-hover px-3 py-1 rounded text-sm text-text-secondary transition-colors select-none"
      title="Tap to set BPM"
    >
      {bpm ? `${bpm} BPM` : '-- BPM'}
    </button>
  );
}
