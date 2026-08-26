/**
 * Short synthesized alert tones. Generated with the Web Audio API instead of
 * shipping audio files: no asset to host, no download before the first play.
 */

export const SOUND_KEY = "delta-capital-notification-sound";

export const isSoundEnabled = (): boolean => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};

export const setSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // Storage can be unavailable in private windows; sound just falls back to on.
  }
};

interface ToneStep {
  frequency: number;
  /** Seconds from the start of the tone. */
  at: number;
}

const play = (steps: ToneStep[], duration: number, volume: number): void => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;

    oscillator.type = "sine";
    steps.forEach((step) => oscillator.frequency.setValueAtTime(step.frequency, start + step.at));

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Audio is a progressive enhancement: the alert still appears on screen.
  }
};

/** System alerts: a single clear note. */
export const playNotificationTone = (): void => {
  if (!isSoundEnabled()) return;
  play([{ frequency: 740, at: 0 }], 0.18, 0.11);
};

/** Incoming chat message: two rising notes, so it is not mistaken for an alert. */
export const playMessageTone = (): void => {
  if (!isSoundEnabled()) return;
  play([{ frequency: 620, at: 0 }, { frequency: 880, at: 0.09 }], 0.22, 0.09);
};
