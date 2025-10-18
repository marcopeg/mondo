import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TimerPhase = "work" | "rest";
type HepticMode = "audio" | "vibration" | "both";

type TimerBlockProps = Record<string, unknown>;

type TimerPlanStep = {
  title: string;
  durationSeconds: number;
  pauseSeconds: number;
};

export type TimerBlockController = {
  canStart: boolean;
  currentLabel: string;
  displayTitle: string;
  durationSeconds: number;
  formattedElapsed: string;
  formattedRemaining: string;
  intervalSeconds: number;
  isResting: boolean;
  isRunning: boolean;
  nextLabel?: string;
  progress: number;
  remainingSeconds: number;
  start: () => void;
  stop: () => void;
};

const parseSeconds = (value: unknown): number => {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.floor(value));
  }

  if (typeof value !== "string") {
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
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);
  const seconds = safeValue % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const toStepTitle = (value: unknown, fallback: string): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return fallback;
};

const parsePlanSteps = (value: unknown): TimerPlanStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const steps: TimerPlanStep[] = [];

  value.forEach((rawStep, index) => {
    if (!rawStep || typeof rawStep !== "object") {
      return;
    }

    const stepRecord = rawStep as Record<string, unknown>;
    const durationSeconds = parseSeconds(stepRecord.duration ?? stepRecord.time);

    if (durationSeconds <= 0) {
      return;
    }

    const pauseSeconds = parseSeconds(stepRecord.pause ?? stepRecord.rest ?? 0);
    const fallbackTitle = `step ${index + 1}`;
    const title = toStepTitle(stepRecord.title ?? stepRecord.name, fallbackTitle);

    steps.push({
      title,
      durationSeconds,
      pauseSeconds,
    });
  });

  return steps;
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

const shouldVibrate = (mode: HepticMode): boolean => mode === "vibration" || mode === "both";

const shouldPlayAudio = (mode: HepticMode): boolean => mode === "audio" || mode === "both";

const triggerVibration = (pattern: number | number[], mode: HepticMode) => {
  if (!shouldVibrate(mode)) {
    return;
  }

  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
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

  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(0);
};

export const useTimerBlock = (props: TimerBlockProps): TimerBlockController => {
  const baseDurationSeconds = useMemo(() => parseSeconds(props.duration), [props.duration]);
  const baseIntervalSeconds = useMemo(() => parseSeconds(props.interval), [props.interval]);
  const hepticMode: HepticMode = useMemo(() => {
    const raw = typeof props.heptic === "string" ? props.heptic.toLowerCase() : "";

    if (raw === "audio" || raw === "vibration" || raw === "both") {
      return raw;
    }

    return "audio";
  }, [props.heptic]);
  const stepSeconds = useMemo(() => parseSeconds(props.step), [props.step]);
  const planSteps = useMemo(() => parsePlanSteps(props.steps), [props.steps]);
  const planStepsLength = planSteps.length;
  const hasPlan = planStepsLength > 0;
  const initialPlanDuration = useMemo(
    () => (planStepsLength > 0 ? planSteps[0]?.durationSeconds ?? 0 : 0),
    [planSteps, planStepsLength]
  );
  const rawTitle = typeof props.title === "string" ? props.title : "";
  const title = useMemo(() => {
    const trimmed = rawTitle.trim();

    if (trimmed.length > 0) {
      return trimmed;
    }

    return hasPlan ? "time plan" : "work";
  }, [hasPlan, rawTitle]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("work");
  const initialDuration = hasPlan ? initialPlanDuration : baseDurationSeconds;
  const [remainingSeconds, setRemainingSeconds] = useState(initialDuration);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(1);
  const phaseDurationRef = useRef(Math.max(initialDuration || 1, 1));
  const phaseStartTimeRef = useRef<number | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);
  const lastFeedbackAtRef = useRef<number>(0);
  const stepCountRef = useRef(0);

  const safeStepIndex = hasPlan
    ? Math.min(Math.max(currentStepIndex, 0), planStepsLength - 1)
    : 0;
  const currentPlanStep = hasPlan ? planSteps[safeStepIndex] : undefined;
  const nextPlanStep =
    hasPlan && safeStepIndex + 1 < planStepsLength
      ? planSteps[safeStepIndex + 1]
      : undefined;
  const durationSeconds = hasPlan
    ? currentPlanStep?.durationSeconds ?? 0
    : baseDurationSeconds;
  const intervalSeconds = hasPlan
    ? currentPlanStep?.pauseSeconds ?? 0
    : baseIntervalSeconds;

  const getNow = useCallback(() => {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
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
      timerStartTimeRef.current = null;
      setElapsedSeconds(0);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!hasPlan) {
      setCurrentStepIndex(0);

      return;
    }

    setCurrentStepIndex((index) =>
      Math.min(Math.max(index, 0), planStepsLength - 1)
    );
  }, [hasPlan, planStepsLength]);

  useEffect(() => {
    if (!isRunning) {
      setCurrentStepIndex(0);
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

  const start = useCallback(() => {
    const initialDurationSeconds = hasPlan ? initialPlanDuration : baseDurationSeconds;

    if (initialDurationSeconds <= 0) {
      return;
    }

    stepCountRef.current = 0;
    stopCurrentFeedback();
    playHappyChime();
    setPhase("work");
    setCurrentStepIndex(0);
    setRemainingSeconds(initialDurationSeconds);
    setProgress(1);
    timerStartTimeRef.current = getNow();
    setElapsedSeconds(0);
    phaseStartTimeRef.current = null;
    setIsRunning(true);
    void requestWakeLock();
  }, [
    baseDurationSeconds,
    getNow,
    hasPlan,
    initialPlanDuration,
    playHappyChime,
    requestWakeLock,
    stopCurrentFeedback,
  ]);

  const stop = useCallback(() => {
    const resetDuration = hasPlan ? initialPlanDuration : baseDurationSeconds;

    setIsRunning(false);
    setPhase("work");
    setCurrentStepIndex(0);
    setRemainingSeconds(resetDuration);
    setProgress(1);
    phaseStartTimeRef.current = null;
    stepCountRef.current = 0;
    stopCurrentFeedback();
    void releaseWakeLock();
  }, [
    baseDurationSeconds,
    hasPlan,
    initialPlanDuration,
    releaseWakeLock,
    stopCurrentFeedback,
  ]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    if (remainingSeconds === 0) {
      if (hasPlan) {
        const currentStep = currentPlanStep;

        if (!currentStep) {
          playHappyChime();
          stop();
          return;
        }

        if (phase === "work") {
          if (currentStep.pauseSeconds > 0) {
            playRestCue();
            setPhase("rest");
            setProgress(1);
            phaseStartTimeRef.current = null;
            setRemainingSeconds(currentStep.pauseSeconds);
            return;
          }

          const nextIndex = safeStepIndex + 1;

          if (nextIndex < planStepsLength) {
            playHappyChime();
            setCurrentStepIndex(nextIndex);
            setPhase("work");
            setProgress(1);
            phaseStartTimeRef.current = null;
            setRemainingSeconds(planSteps[nextIndex].durationSeconds);
            return;
          }

          playHappyChime();
          stop();
          return;
        }

        const nextIndex = safeStepIndex + 1;

        if (nextIndex < planStepsLength) {
          playHappyChime();
          setCurrentStepIndex(nextIndex);
          setPhase("work");
          setProgress(1);
          phaseStartTimeRef.current = null;
          setRemainingSeconds(planSteps[nextIndex].durationSeconds);
          return;
        }

        playHappyChime();
        stop();
        return;
      }

      if (phase === "work") {
        if (intervalSeconds > 0) {
          playRestCue();
          setPhase("rest");
          setRemainingSeconds(intervalSeconds);
          setProgress(1);
          phaseStartTimeRef.current = null;
          return;
        }

        playHappyChime();
        setRemainingSeconds(durationSeconds);
        setProgress(1);
        phaseStartTimeRef.current = null;
        return;
      }

      playHappyChime();
      setRemainingSeconds(durationSeconds);
      setProgress(1);
      phaseStartTimeRef.current = null;
      setPhase("work");

      return;
    }

    if (remainingSeconds > 0 && remainingSeconds <= 3) {
      playShortBeep();
    }
  }, [
    currentPlanStep,
    durationSeconds,
    hasPlan,
    intervalSeconds,
    isRunning,
    phase,
    planSteps,
    planStepsLength,
    playHappyChime,
    playRestCue,
    playShortBeep,
    remainingSeconds,
    safeStepIndex,
    stop,
  ]);

  const formattedRemaining = useMemo(
    () => formatTime(isRunning ? remainingSeconds : durationSeconds),
    [durationSeconds, isRunning, remainingSeconds]
  );

  const currentLabel = useMemo(() => {
    if (hasPlan) {
      if (phase === "rest") {
        return "rest";
      }

      return currentPlanStep?.title ?? title;
    }

    if (isRunning && phase === "rest") {
      return "rest";
    }

    return "go";
  }, [currentPlanStep?.title, hasPlan, isRunning, phase, title]);

  const nextLabel = useMemo(() => {
    if (!hasPlan) {
      return undefined;
    }

    if (phase !== "rest") {
      return undefined;
    }

    return nextPlanStep?.title;
  }, [hasPlan, nextPlanStep, phase]);

  const canStart = hasPlan
    ? initialPlanDuration > 0
    : baseDurationSeconds > 0;

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
  }, [activePhaseDuration, getNow, isRunning, playShortBeep, remainingSeconds, stepSeconds]);

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
    const totalElapsedSeconds = (() => {
      const timerStart = timerStartTimeRef.current;

      if (timerStart === null) {
        return 0;
      }

      const elapsedFromStart = Math.floor((now - timerStart) / 1000);

      return Number.isFinite(elapsedFromStart) ? Math.max(elapsedFromStart, 0) : 0;
    })();

    setProgress(ratio);
    setRemainingSeconds((value) => {
      if (!Number.isFinite(remainingSecondsEstimate)) {
        return value;
      }

      return value === remainingSecondsEstimate ? value : remainingSecondsEstimate;
    });
    setElapsedSeconds((value) =>
      value === totalElapsedSeconds ? value : totalElapsedSeconds
    );
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
    canStart,
    currentLabel,
    displayTitle: title,
    durationSeconds,
    formattedElapsed: formatChronograph(elapsedSeconds),
    formattedRemaining,
    intervalSeconds,
    isResting: phase === "rest",
    isRunning,
    nextLabel,
    progress,
    remainingSeconds: isRunning ? remainingSeconds : durationSeconds,
    start,
    stop,
  };
};
