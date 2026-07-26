export const CHROMATIC_PALETTE = Object.freeze([57, 58, 60, 61, 63, 64, 66, 67]);

export const CUE_PATTERNS = Object.freeze({
  hover: Object.freeze([
    Object.freeze({ note: 72, delay: 0, duration: 0.08, level: 0.24 }),
  ]),
  note: Object.freeze([
    Object.freeze({ note: 58, delay: 0, duration: 0.11, level: 0.3 }),
    Object.freeze({ note: 61, delay: 0.045, duration: 0.14, level: 0.23 }),
  ]),
  external: Object.freeze([
    Object.freeze({ note: 61, delay: 0, duration: 0.1, level: 0.22 }),
    Object.freeze({ note: 64, delay: 0.055, duration: 0.13, level: 0.17 }),
  ]),
  mail: Object.freeze([
    Object.freeze({ note: 64, delay: 0, duration: 0.09, level: 0.2 }),
    Object.freeze({ note: 67, delay: 0.04, duration: 0.1, level: 0.18 }),
    Object.freeze({ note: 71, delay: 0.08, duration: 0.16, level: 0.14 }),
  ]),
  enter: Object.freeze([
    Object.freeze({ note: 60, delay: 0, duration: 0.22, level: 0.2 }),
    Object.freeze({ note: 61, delay: 0.07, duration: 0.25, level: 0.18 }),
    Object.freeze({ note: 63, delay: 0.14, duration: 0.32, level: 0.15 }),
  ]),
});

export function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

export function createUiSoundEngine(AudioContextClass) {
  let context;
  let master;

  const ensureContext = () => {
    if (context || !AudioContextClass) return context;

    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
    return context;
  };

  const unlock = async () => {
    try {
      const activeContext = ensureContext();
      if (activeContext?.state === "suspended") {
        await activeContext.resume();
      }
      return activeContext?.state === "running";
    } catch {
      return false;
    }
  };

  const playTone = ({ note, delay, duration, level }) => {
    const activeContext = ensureContext();
    if (!activeContext || !master) return;

    const start = activeContext.currentTime + delay;
    const stop = start + duration;
    const frequency = midiToFrequency(note);
    const filter = activeContext.createBiquadFilter();
    const envelope = activeContext.createGain();
    const fundamental = activeContext.createOscillator();
    const shimmer = activeContext.createOscillator();

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(Math.min(frequency * 3.2, 5200), start);
    filter.Q.setValueAtTime(1.4, start);

    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(level, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, stop);

    fundamental.type = "sine";
    fundamental.frequency.setValueAtTime(frequency, start);
    shimmer.type = "triangle";
    shimmer.frequency.setValueAtTime(frequency * 2, start);
    shimmer.detune.setValueAtTime(7, start);

    fundamental.connect(filter);
    shimmer.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);

    fundamental.start(start);
    shimmer.start(start);
    fundamental.stop(stop + 0.02);
    shimmer.stop(stop + 0.02);

    shimmer.addEventListener("ended", () => {
      fundamental.disconnect();
      shimmer.disconnect();
      filter.disconnect();
      envelope.disconnect();
    }, { once: true });
  };

  const play = async (cueName) => {
    const pattern = CUE_PATTERNS[cueName];
    if (!pattern || !(await unlock())) return;
    pattern.forEach(playTone);
  };

  return Object.freeze({ play, unlock });
}
