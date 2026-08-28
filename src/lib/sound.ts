/**
 * Short synthesized alert tones, generated with the Web Audio API so there is no
 * audio file to host or download.
 *
 * One AudioContext is shared for the whole session. Creating one per sound looks
 * harmless but browsers cap how many can exist at once (Chrome allows about six)
 * and closing them is asynchronous, so after a handful of alerts every new
 * context throws and the app goes silent. Browsers also start a context
 * suspended until the user has interacted with the page, so it is resumed on the
 * first gesture and again before each tone.
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
    // Private windows can block storage; sound simply stays on.
  }
};

type AudioContextConstructor = typeof AudioContext;

let sharedContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  if (sharedContext) return sharedContext;
  const AudioContextClass: AudioContextConstructor | undefined =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    sharedContext = new AudioContextClass();
    return sharedContext;
  } catch {
    return null;
  }
};

/** Browsers keep a fresh context suspended until the user interacts. */
export const unlockAudio = (): void => {
  const context = getContext();
  if (context && context.state === "suspended") void context.resume().catch(() => undefined);
};

if (typeof window !== "undefined") {
  const unlock = () => unlockAudio();
  window.addEventListener("pointerdown", unlock, { once: false, passive: true });
  window.addEventListener("keydown", unlock, { once: false, passive: true });
}

interface ToneStep {
  frequency: number;
  /** Seconds from the start of the tone. */
  at: number;
}

const play = (steps: ToneStep[], duration: number, volume: number): void => {
  const context = getContext();
  if (!context) return;

  try {
    if (context.state === "suspended") void context.resume().catch(() => undefined);

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
    // The nodes are disconnected on end; the context stays alive for reuse.
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    });
  } catch {
    // Audio is a progressive enhancement: the alert still appears on screen.
  }
};

/** System alerts: a single clear note. */
export const playNotificationTone = (): void => {
  if (!isSoundEnabled()) return;
  play([{ frequency: 740, at: 0 }], 0.18, 0.13);
};

/** Incoming chat message: two rising notes, distinct from a system alert. */
export const playMessageTone = (): void => {
  if (!isSoundEnabled()) return;
  play([{ frequency: 620, at: 0 }, { frequency: 880, at: 0.09 }], 0.22, 0.11);
};

/** New leads assigned: three ascending notes, the most attention-getting. */
export const playAssignmentTone = (): void => {
  if (!isSoundEnabled()) return;
  play([{ frequency: 660, at: 0 }, { frequency: 880, at: 0.1 }, { frequency: 1180, at: 0.2 }], 0.4, 0.13);
};
