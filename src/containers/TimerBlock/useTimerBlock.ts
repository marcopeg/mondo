import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimerPhase = "work" | "rest";
type HepticMode = "audio" | "vibration";

type TimerBlockProps = Record<string, string>;

type TimerBlockState = {
  canStart: boolean;
  currentLabel: string;
  displayTitle: string;
  durationSeconds: number;
  formattedRemaining: string;
  intervalSeconds: number;
  isResting: boolean;
  isRunning: boolean;
  progress: number;
  remainingSeconds: number;
  start: () => void;
  stop: () => void;
};

const parseSeconds = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.floor(numeric));
};

const formatTime = (value: number): string => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
  };
};

type ScreenWakeLockSentinel = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
  removeEventListener?: (type: "release", listener: () => void) => void;
};

type WindowWithAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const getAudioContextConstructor = (): typeof AudioContext | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const audioWindow = window as WindowWithAudioContext;

  return window.AudioContext ?? audioWindow.webkitAudioContext;
};

const triggerShortBeep = (mode: HepticMode) => {
  if (mode === "vibration") {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(180);
    }

    return;
  }

  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    return;
  }

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gain.gain.setValueAtTime(0.18, context.currentTime);

    oscillator.connect(gain);
    gain.connect(context.destination);

    const duration = 0.18;

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.stop(context.currentTime + duration);

    oscillator.addEventListener("ended", () => {
      context.close().catch(() => undefined);
    });
  } catch (error) {
    // Silently ignore audio errors
  }
};

const triggerHappyChime = (mode: HepticMode) => {
  if (mode === "vibration") {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([140, 80, 200]);
    }

    return;
  }

  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    return;
  }

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.18, now);

    oscillator.connect(gain);
    gain.connect(context.destination);

    const duration = 0.5;

    oscillator.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.stop(now + duration);

    oscillator.addEventListener("ended", () => {
      context.close().catch(() => undefined);
    });
  } catch (error) {
    // Silently ignore audio errors
  }
};

const triggerRestCue = (mode: HepticMode) => {
  if (mode === "vibration") {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([250, 100, 250]);
    }

    return;
  }

  const AudioContextConstructor = getAudioContextConstructor();

  if (!AudioContextConstructor) {
    return;
  }

  try {
    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.2, now);

    oscillator.connect(gain);
    gain.connect(context.destination);

    const duration = 0.5;

    oscillator.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.stop(now + duration);

    oscillator.addEventListener("ended", () => {
      context.close().catch(() => undefined);
    });
  } catch (error) {
    // Silently ignore audio errors
  }
};

const stopFeedback = (mode: HepticMode) => {
  if (mode === "vibration") {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(0);
    }
  }
};

export const useTimerBlock = (props: TimerBlockProps): TimerBlockState => {
  const durationSeconds = useMemo(() => parseSeconds(props.duration), [props.duration]);
  const intervalSeconds = useMemo(() => parseSeconds(props.interval), [props.interval]);
  const hepticMode: HepticMode = useMemo(() => {
    return props.heptic?.toLowerCase() === "vibration" ? "vibration" : "audio";
  }, [props.heptic]);
  const title = useMemo(() => props.title?.trim() || "work", [props.title]);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [progress, setProgress] = useState(1);
  const phaseDurationRef = useRef(Math.max(durationSeconds || 1, 1));
  const phaseStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);

  const getNow = useCallback(() => {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now();
    }

    return Date.now();
  }, []);

  useEffect(() => {
    if (!isRunning) {
      setPhase("work");
      setRemainingSeconds(durationSeconds);
      setProgress(1);
      phaseStartTimeRef.current = null;
    }
  }, [durationSeconds, isRunning]);

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) {
      return;
    }

    try {
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      await sentinel.release();
    } catch (error) {
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined") {
      return;
    }

    const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;

    if (!navigatorWithWakeLock.wakeLock?.request) {
      return;
    }

    if (wakeLockRef.current) {
      return;
    }

    try {
      const sentinel = await navigatorWithWakeLock.wakeLock.request("screen");

      const handleRelease = () => {
        wakeLockRef.current = null;

        if (sentinel.removeEventListener) {
          sentinel.removeEventListener("release", handleRelease);
        }

        if (typeof document !== "undefined" && document.visibilityState === "visible") {
          if (isRunning) {
            void requestWakeLock();
          }
        }
      };

      wakeLockRef.current = sentinel;

      if (sentinel.addEventListener) {
        sentinel.addEventListener("release", handleRelease);
      }
    } catch (error) {
      wakeLockRef.current = null;
    }
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (remainingSeconds === 0) {
      setPhase((currentPhase) => {
        if (currentPhase === "work") {
          if (intervalSeconds > 0) {
            triggerRestCue(hepticMode);
            setRemainingSeconds(intervalSeconds);
            setProgress(1);
            phaseStartTimeRef.current = null;

            return "rest";
          }

          triggerHappyChime(hepticMode);
          setRemainingSeconds(durationSeconds);
          setProgress(1);
          phaseStartTimeRef.current = null;

          return "work";
        }

        triggerHappyChime(hepticMode);
        setRemainingSeconds(durationSeconds);
        setProgress(1);
        phaseStartTimeRef.current = null;

        return "work";
      });

      return;
    }

    if (remainingSeconds > 0 && remainingSeconds <= 3) {
      triggerShortBeep(hepticMode);
    }
  }, [durationSeconds, hepticMode, intervalSeconds, isRunning, remainingSeconds]);

  const start = useCallback(() => {
    if (durationSeconds <= 0) {
      return;
    }

    stopFeedback(hepticMode);
    triggerHappyChime(hepticMode);
    setPhase("work");
    setRemainingSeconds(durationSeconds);
    setProgress(1);
    phaseStartTimeRef.current = null;
    setIsRunning(true);
    void requestWakeLock();
  }, [durationSeconds, hepticMode, requestWakeLock]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setPhase("work");
    setRemainingSeconds(durationSeconds);
    setProgress(1);
    phaseStartTimeRef.current = null;
    stopFeedback(hepticMode);
    void releaseWakeLock();
  }, [durationSeconds, hepticMode, releaseWakeLock]);

  const formattedRemaining = useMemo(
    () => formatTime(isRunning ? remainingSeconds : durationSeconds),
    [durationSeconds, isRunning, remainingSeconds]
  );

  const currentLabel = useMemo(() => {
    if (isRunning && phase === "rest") {
      return "rest";
    }

    return title;
  }, [isRunning, phase, title]);

  const activePhaseDuration = useMemo(() => {
    if (phase === "rest") {
      if (intervalSeconds > 0) {
        return intervalSeconds;
      }

      return durationSeconds || 1;
    }

    return durationSeconds || 1;
  }, [durationSeconds, intervalSeconds, phase]);

  useEffect(() => {
    phaseDurationRef.current = Math.max(activePhaseDuration, 1);

    if (isRunning) {
      phaseStartTimeRef.current = getNow();
      setProgress(1);
      return;
    }

    phaseStartTimeRef.current = null;
    setProgress(1);
  }, [activePhaseDuration, getNow, isRunning, phase]);

  const recomputeTiming = useCallback(() => {
    if (!isRunning) {
      return;
    }

    const durationMs = Math.max(phaseDurationRef.current * 1000, 1);
    const now = getNow();
    const start = phaseStartTimeRef.current ?? now;

    if (phaseStartTimeRef.current === null) {
      phaseStartTimeRef.current = start;
    }

    const elapsed = now - start;
    const remaining = Math.max(durationMs - elapsed, 0);
    const ratio = Math.max(0, Math.min(1, remaining / durationMs));
    const remainingSecondsEstimate = Math.ceil(remaining / 1000);

    setProgress(ratio);
    setRemainingSeconds((value) => {
      if (!Number.isFinite(remainingSecondsEstimate)) {
        return value;
      }

      return value === remainingSecondsEstimate ? value : remainingSecondsEstimate;
    });
  }, [getNow, isRunning]);

  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      return;
    }

    let isCancelled = false;

    const tick = () => {
      if (isCancelled) {
        return;
      }

      recomputeTiming();

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      isCancelled = true;

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning, recomputeTiming]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = window.setInterval(() => {
      recomputeTiming();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRunning, recomputeTiming]);

  useEffect(() => {
    if (!isRunning) {
      void releaseWakeLock();

      return;
    }

    void requestWakeLock();

    if (typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        recomputeTiming();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRunning, recomputeTiming, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    canStart: durationSeconds > 0,
    currentLabel,
    displayTitle: title,
    durationSeconds,
    formattedRemaining,
    intervalSeconds,
    isResting: phase === "rest",
    isRunning,
    progress,
    remainingSeconds: isRunning ? remainingSeconds : durationSeconds,
    start,
    stop,
  };
};
