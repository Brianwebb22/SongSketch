// Monophonic pitch detection for the Tuner quick tool.
// Autocorrelation with parabolic interpolation — pure functions, no DOM/audio deps.

/** Detectable range: low B on a 5-string bass up to high fretted notes. */
const MIN_FREQ = 50;
const MAX_FREQ = 1500;

/** RMS below this is treated as silence. */
const SILENCE_RMS = 0.01;

/**
 * Detect the fundamental frequency of a mono time-domain buffer.
 * Returns frequency in Hz, or null for silence / no confident pitch.
 */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  const size = buf.length;
  if (size === 0) return null;

  let rms = 0;
  for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / size);
  if (rms < SILENCE_RMS) return null;

  const minLag = Math.floor(sampleRate / MAX_FREQ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_FREQ), size - 2);
  if (minLag >= maxLag) return null;

  // Autocorrelation, only for lags in the detectable range.
  // Normalized by overlap count — the raw sum has fewer terms at larger
  // lags, which biases the peak toward smaller lag (reads sharp).
  const corr = new Float32Array(maxLag + 2);
  for (let lag = 0; lag <= maxLag + 1; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < size; i++) sum += buf[i] * buf[i + lag];
    corr[lag] = sum / (size - lag);
  }

  // Skip the zero-lag peak: walk down to the first dip
  let d = 0;
  while (d < maxLag && corr[d] > corr[d + 1]) d++;

  const start = Math.max(d, minLag);
  let bestVal = -Infinity;
  for (let lag = start; lag <= maxLag; lag++) {
    if (corr[lag] > bestVal) bestVal = corr[lag];
  }
  if (bestVal <= 0) return null;

  // Weak periodicity (peak small relative to signal energy) — likely noise
  if (bestVal < 0.3 * corr[0]) return null;

  // The period is the FIRST local maximum near the global max — lag
  // multiples of the period peak equally high, so taking the absolute
  // max risks octave-down errors.
  const threshold = 0.9 * bestVal;
  let bestLag = -1;
  for (let lag = start; lag <= maxLag; lag++) {
    if (corr[lag] >= threshold && corr[lag] >= corr[lag - 1] && corr[lag] >= corr[lag + 1]) {
      bestLag = lag;
      break;
    }
  }
  if (bestLag <= 0) return null;

  // Parabolic interpolation around the peak for sub-sample precision
  let lag = bestLag;
  const x1 = corr[bestLag - 1];
  const x2 = corr[bestLag];
  const x3 = corr[bestLag + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a !== 0) lag = bestLag - b / (2 * a);

  const freq = sampleRate / lag;
  if (freq < MIN_FREQ || freq > MAX_FREQ) return null;
  return freq;
}

/** Equal-tempered frequency of a MIDI note (A4 = 440 Hz). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Nearest MIDI note and cents offset (−50..+50) for a frequency.
 * Positive cents = sharp, negative = flat.
 */
export function frequencyToNote(freq: number): { midi: number; cents: number } {
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  return { midi, cents };
}
