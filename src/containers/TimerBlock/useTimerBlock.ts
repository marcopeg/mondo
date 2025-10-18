import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimerPhase = "work" | "rest";
type HepticMode = "audio" | "vibration" | "both";

type TimerBlockProps = Record<string, string>;

type TimerBlockState = {
  canStart: boolean;
  currentLoop: number;
  currentLabel: string;
  displayTitle: string;
  durationSeconds: number;
  formattedElapsed: string;
  formattedRemaining: string;
  hasFiniteLoops: boolean;
  intervalSeconds: number;
  isResting: boolean;
  isRunning: boolean;
  progress: number;
  remainingSeconds: number;
  totalLoops: number;
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

const formatChronograph = (value: number): string => {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const totalSeconds = Math.floor(safeValue / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(safeValue % 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
};

type LoopConfig =
  | { mode: "none" }
  | { mode: "infinite" }
  | { mode: "finite"; total: number };

const parseLoop = (value: string | undefined): LoopConfig => {
  if (!value) {
    return { mode: "infinite" };
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized || normalized === "true") {
    return { mode: "infinite" };
  }

  if (normalized === "false") {
    return { mode: "none" };
  }

  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) {
    return { mode: "infinite" };
  }

  const totalLoops = Math.floor(numeric);

  if (totalLoops <= 0) {
    return { mode: "none" };
  }

  return { mode: "finite", total: totalLoops };
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

const shouldVibrate = (mode: HepticMode): boolean =>
  mode === "vibration" || mode === "both";

const shouldPlayAudio = (mode: HepticMode): boolean =>
  mode === "audio" || mode === "both";

const triggerVibration = (pattern: number | number[], mode: HepticMode) => {
  if (!shouldVibrate(mode)) {
    return;
  }

  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  navigator.vibrate(pattern);
};

const triggerShortBeep = (mode: HepticMode) => {
  triggerVibration(180, mode);

  if (!shouldPlayAudio(mode)) {
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
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration
    );
    oscillator.stop(context.currentTime + duration);

    oscillator.addEventListener("ended", () => {
      context.close().catch(() => undefined);
    });
  } catch (error) {
    // Silently ignore audio errors
  }
};

const triggerHappyChime = (mode: HepticMode) => {
  triggerVibration([140, 80, 200], mode);

  if (!shouldPlayAudio(mode)) {
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
  triggerVibration([250, 100, 250], mode);

  if (!shouldPlayAudio(mode)) {
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
  if (!shouldVibrate(mode)) {
    return;
  }

  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }

  navigator.vibrate(0);
};

export const useTimerBlock = (props: TimerBlockProps): TimerBlockState => {
  const durationSeconds = useMemo(
    () => parseSeconds(props.duration),
    [props.duration]
  );
  const intervalSeconds = useMemo(
    () => parseSeconds(props.interval),
    [props.interval]
  );
  const loopConfig = useMemo(() => parseLoop(props.loop), [props.loop]);
  const hasFiniteLoops = loopConfig.mode === "finite";
  const totalLoops = hasFiniteLoops ? loopConfig.total : 0;
  const hepticMode: HepticMode = useMemo(() => {
    const normalized = props.heptic?.toLowerCase();

    if (
      normalized === "audio" ||
      normalized === "vibration" ||
      normalized === "both"
    ) {
      return normalized;
    }

    return "audio";
  }, [props.heptic]);
  const stepSeconds = useMemo(() => parseSeconds(props.step), [props.step]);
  const title = useMemo(() => props.title?.trim() || "work", [props.title]);

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [currentLoop, setCurrentLoop] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [progress, setProgress] = useState(1);
  const phaseDurationRef = useRef(Math.max(durationSeconds || 1, 1));
  const phaseStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);
  const lastFeedbackAtRef = useRef<number>(0);
  const stepCountRef = useRef(0);
  const workAccumulatedRef = useRef(0);

  const getNow = useCallback(() => {
    if (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    ) {
      return performance.now();
    }

    return Date.now();
  }, []);

  const markFeedback = useCallback(() => {
    lastFeedbackAtRef.current = getNow();
  }, [getNow]);

  const playShortBeep = useCallback(() => {
    triggerShortBeep(hepticMode);
    markFeedback();
  }, [hepticMode, markFeedback]);

  const playHappyChime = useCallback(() => {
    triggerHappyChime(hepticMode);
    markFeedback();
  }, [hepticMode, markFeedback]);

  const playRestCue = useCallback(() => {
    triggerRestCue(hepticMode);
    markFeedback();
  }, [hepticMode, markFeedback]);

  const stopCurrentFeedback = useCallback(() => {
    stopFeedback(hepticMode);
  }, [hepticMode]);

  useEffect(() => {
    if (!isRunning) {
      workAccumulatedRef.current = 0;
      setElapsedMilliseconds(0);
      setCurrentLoop(0);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) {
      setPhase("work");
      setRemainingSeconds(durationSeconds);
      setProgress(1);
      phaseStartTimeRef.current = null;
    }
  }, [durationSeconds, isRunning]);

  useEffect(() => {
    if (!isRunning) {
      stepCountRef.current = 0;
    }
  }, [isRunning]);

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

        if (
          typeof document !== "undefined" &&
          document.visibilityState === "visible"
        ) {
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

  const stop = useCallback(() => {
    setIsRunning(false);
    setPhase("work");
    setRemainingSeconds(durationSeconds);
    setProgress(1);
    phaseStartTimeRef.current = null;
    stepCountRef.current = 0;
    stopCurrentFeedback();
    void releaseWakeLock();
  }, [durationSeconds, releaseWakeLock, stopCurrentFeedback]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (remainingSeconds === 0) {
      if (phase === "work") {
        const workDurationMs = Math.max(durationSeconds, 0) * 1000;

        workAccumulatedRef.current += workDurationMs;
        setElapsedMilliseconds(workAccumulatedRef.current);

        const shouldContinue =
          loopConfig.mode !== "none" &&
          (!hasFiniteLoops || currentLoop < totalLoops);

        if (!shouldContinue) {
          playHappyChime();
          stop();

          return;
        }

        if (intervalSeconds > 0) {
          playRestCue();
          setPhase("rest");
          setRemainingSeconds(intervalSeconds);
          setProgress(1);
          phaseStartTimeRef.current = null;

          return;
        }

        playHappyChime();
        setPhase("work");
        setRemainingSeconds(durationSeconds);
        setProgress(1);
        phaseStartTimeRef.current = null;
        setCurrentLoop((value) => {
          if (hasFiniteLoops) {
            return Math.min(value + 1, totalLoops);
          }

          return value + 1;
        });

        return;
      }

      playHappyChime();
      setPhase("work");
      setRemainingSeconds(durationSeconds);
      setProgress(1);
      phaseStartTimeRef.current = null;
      setCurrentLoop((value) => {
        if (hasFiniteLoops) {
          return Math.min(value + 1, totalLoops);
        }

        return value + 1;
      });

      return;
    }

    if (remainingSeconds > 0 && remainingSeconds <= 3) {
      playShortBeep();
    }
  }, [
    currentLoop,
    durationSeconds,
    intervalSeconds,
    isRunning,
    hasFiniteLoops,
    phase,
    playHappyChime,
    playRestCue,
    playShortBeep,
    remainingSeconds,
    loopConfig,
    totalLoops,
    stop,
  ]);

  const start = useCallback(() => {
    if (durationSeconds <= 0) {
      return;
    }

    stepCountRef.current = 0;
    stopCurrentFeedback();
    playHappyChime();
    setPhase("work");
    setRemainingSeconds(durationSeconds);
    setProgress(1);
    workAccumulatedRef.current = 0;
    setElapsedMilliseconds(0);
    setCurrentLoop(1);
    phaseStartTimeRef.current = null;
    setIsRunning(true);
    void requestWakeLock();
  }, [durationSeconds, playHappyChime, requestWakeLock, stopCurrentFeedback]);

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

  useEffect(() => {
    stepCountRef.current = 0;
  }, [activePhaseDuration, phase, stepSeconds]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (stepSeconds <= 0) {
      return;
    }

    if (remainingSeconds <= 0) {
      return;
    }

    if (remainingSeconds <= 3) {
      return;
    }

    const duration = Math.max(activePhaseDuration, 1);
    const elapsed = duration - remainingSeconds;

    if (elapsed <= 0) {
      return;
    }

    const completedSteps = Math.floor(elapsed / stepSeconds);

    if (completedSteps <= 0) {
      return;
    }

    if (completedSteps > stepCountRef.current) {
      const timeSinceLastFeedback = getNow() - lastFeedbackAtRef.current;

      stepCountRef.current = completedSteps;

      if (timeSinceLastFeedback > 400) {
        playShortBeep();
      }
    }
  }, [
    activePhaseDuration,
    getNow,
    isRunning,
    playShortBeep,
    remainingSeconds,
    stepSeconds,
  ]);

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
    const totalElapsedMilliseconds = Math.floor(
      workAccumulatedRef.current +
        (phase === "work" ? Math.min(elapsed, durationMs) : 0)
    );

    setProgress(ratio);
    setRemainingSeconds((value) => {
      if (!Number.isFinite(remainingSecondsEstimate)) {
        return value;
      }

      return value === remainingSecondsEstimate
        ? value
        : remainingSecondsEstimate;
    });
    setElapsedMilliseconds((value) =>
      value === totalElapsedMilliseconds ? value : totalElapsedMilliseconds
    );
  }, [getNow, isRunning, phase]);

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
    currentLoop,
    currentLabel,
    displayTitle: title,
    durationSeconds,
    formattedElapsed: formatChronograph(elapsedMilliseconds),
    formattedRemaining,
    hasFiniteLoops,
    intervalSeconds,
    isResting: phase === "rest",
    isRunning,
    progress,
    remainingSeconds: isRunning ? remainingSeconds : durationSeconds,
    totalLoops,
    start,
    stop,
  };
};
