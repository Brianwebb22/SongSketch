import { useEffect, useRef, useState } from 'preact/hooks';
import { detectPitch, frequencyToNote } from '../utils/pitchDetection.ts';
import { midiToDisplayName } from '../utils/chordEngine.ts';
import { STANDARD_TUNING, STRING_LABELS_LOW_TO_HIGH } from './Fretboard.tsx';

interface TunerProps {
  open: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'requesting' | 'denied' | 'error' | 'active';

interface Reading {
  freq: number;
  midi: number;
  cents: number;
}

/** Within this many cents counts as in tune. */
const IN_TUNE_CENTS = 5;
/** Median over this many recent detections. */
const SMOOTHING_WINDOW = 5;
/** Keep the last note on screen this long after the signal drops... */
const HOLD_MS = 2000;
/** ...then fade it out over this long. Quiet sources (an unplugged
 * electric) dip below the silence gate between readings — without the
 * hold, the note flickers in and out. */
const FADE_MS = 600;

export function Tuner({ open, onClose }: TunerProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [reading, setReading] = useState<Reading | null>(null);
  // What's actually shown: lags `reading` so the last note holds, then fades
  const [display, setDisplay] = useState<Reading | null>(null);
  const [fading, setFading] = useState(false);
  // Bumped by the Retry button to re-run the mic effect
  const [attempt, setAttempt] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Hold-then-fade: live readings show immediately; when the signal drops,
  // keep the last note solid for HOLD_MS, fade over FADE_MS, then clear.
  useEffect(() => {
    if (reading) {
      setDisplay(reading);
      setFading(false);
      return;
    }
    const fadeTimer = window.setTimeout(() => setFading(true), HOLD_MS);
    const clearTimer = window.setTimeout(() => {
      setDisplay(null);
      setFading(false);
    }, HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [reading]);

  // Microphone lifecycle — start on open, tear down fully on close/unmount
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function start() {
      setStatus('requesting');
      setReading(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        // Large window: a 2048-sample buffer holds only ~3.5 periods of low E
        // and reads up to 9 cents off; 8192 keeps worst-case error under 2 cents.
        analyser.fftSize = 8192;
        source.connect(analyser);
        setStatus('active');

        const buf = new Float32Array(analyser.fftSize);
        const recent: (number | null)[] = [];
        let frame = 0;

        const loop = () => {
          // Detection is O(window × lag range) — every 3rd frame (~20 Hz) is
          // plenty for a tuner and keeps the main thread comfortable.
          if (frame++ % 3 === 0) {
            analyser.getFloatTimeDomainData(buf);
            recent.push(detectPitch(buf, ctx.sampleRate));
            if (recent.length > SMOOTHING_WINDOW) recent.shift();

            const freqs = recent.filter((f): f is number => f !== null).sort((a, b) => a - b);
            if (freqs.length >= 2) {
              const freq = freqs[Math.floor(freqs.length / 2)];
              setReading({ freq, ...frequencyToNote(freq) });
            } else {
              setReading(null);
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setStatus('idle');
      setReading(null);
      // Hooks state survives while closed — don't show a stale note on reopen
      setDisplay(null);
      setFading(false);
    };
  }, [open, attempt]);

  if (!open) return null;

  const inTune = display !== null && Math.abs(display.cents) <= IN_TUNE_CENTS;

  // Nearest standard-tuning string to the detected pitch
  const nearestStringIdx =
    display === null
      ? null
      : STANDARD_TUNING.reduce(
          (best, midi, i) =>
            Math.abs(midi - display.midi) < Math.abs(STANDARD_TUNING[best] - display.midi) ? i : best,
          0,
        );

  const fadeClass = `transition-opacity ${fading ? 'opacity-0' : 'opacity-100'}`;
  const fadeStyle = { transitionDuration: `${fading ? FADE_MS : 150}ms` };

  return (
    <div
      class="fixed inset-0 z-40 flex items-end md:items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="bg-surface-card w-full md:max-w-md md:rounded-xl border-t md:border border-surface-hover shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between p-3 border-b border-surface-hover">
          <h2 class="text-base font-semibold text-text-primary">Tuner</h2>
          <button
            onClick={onClose}
            class="text-text-muted hover:text-text-primary transition-colors text-lg px-2"
            aria-label="Close Tuner"
          >
            ✕
          </button>
        </div>

        <div class="p-4">
          {status === 'requesting' && (
            <div class="p-6 text-center text-sm text-text-muted">
              Waiting for microphone access — check your browser's permission prompt.
            </div>
          )}

          {(status === 'denied' || status === 'error') && (
            <div class="p-6 text-center">
              <p class="text-sm text-text-secondary mb-3">
                {status === 'denied'
                  ? 'Microphone access is needed to tune — check your browser permissions.'
                  : "Couldn't access the microphone."}
              </p>
              <button
                onClick={() => setAttempt((a) => a + 1)}
                class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {status === 'active' && (
            <>
              {/* Detected note */}
              <div class={`text-center mb-4 min-h-[72px] ${fadeClass}`} style={fadeStyle}>
                {display ? (
                  <>
                    <span
                      class={`text-5xl font-bold font-mono ${
                        inTune ? 'text-green-400' : 'text-text-primary'
                      }`}
                    >
                      {midiToDisplayName(display.midi)}
                    </span>
                    <span class="text-2xl font-mono text-text-muted ml-1">
                      {Math.floor(display.midi / 12) - 1}
                    </span>
                  </>
                ) : (
                  <span class="text-5xl font-bold font-mono text-text-muted">—</span>
                )}
              </div>

              {/* Cents meter: −50 .. +50 */}
              <div class="relative h-10 bg-surface rounded-xl overflow-hidden mb-1">
                {/* Center line */}
                <div class="absolute left-1/2 top-0 bottom-0 w-px bg-text-muted/50" />
                {/* In-tune zone */}
                <div
                  class="absolute top-0 bottom-0 bg-green-400/10"
                  style={{ left: `${50 - IN_TUNE_CENTS}%`, width: `${IN_TUNE_CENTS * 2}%` }}
                />
                {/* Needle */}
                {display && (
                  <div
                    class={`absolute top-1 bottom-1 w-1 rounded-full transition-[left,opacity] ${
                      fading ? 'opacity-0' : 'opacity-100'
                    } ${inTune ? 'bg-green-400' : 'bg-accent'}`}
                    style={{
                      left: `calc(${50 + Math.max(-50, Math.min(50, display.cents))}% - 2px)`,
                      transitionDuration: `75ms, ${fading ? FADE_MS : 150}ms`,
                    }}
                  />
                )}
              </div>
              <div class="flex justify-between text-[10px] font-mono text-text-muted mb-3">
                <span>−50</span>
                <span class={fadeClass} style={fadeStyle}>
                  {display ? `${display.cents > 0 ? '+' : ''}${display.cents}¢` : ''}
                </span>
                <span>+50</span>
              </div>

              {/* Frequency readout */}
              <div class={`text-center text-xs font-mono text-text-muted mb-4 min-h-[16px] ${fadeClass}`} style={fadeStyle}>
                {display ? `${display.freq.toFixed(1)} Hz` : 'Play a note...'}
              </div>

              {/* Guitar string hints */}
              <div class="flex justify-center gap-2">
                {STANDARD_TUNING.map((midi, i) => {
                  const isNearest = nearestStringIdx === i;
                  const isTuned = isNearest && reading !== null && reading.midi === midi && inTune;
                  return (
                    <span
                      key={i}
                      class={`px-2 py-1 rounded-md text-xs font-mono transition-colors ${
                        isTuned
                          ? 'bg-green-400/20 text-green-400'
                          : isNearest
                            ? 'bg-accent/20 text-accent'
                            : 'bg-surface text-text-muted'
                      }`}
                    >
                      {STRING_LABELS_LOW_TO_HIGH[i]}
                      <span class="opacity-60">{Math.floor(midi / 12) - 1}</span>
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
