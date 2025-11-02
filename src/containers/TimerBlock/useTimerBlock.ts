import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Phases and props
type TimerPhase = "work" | "rest";
type HepticMode = "audio" | "vibration" | "both" | "none";
type TimerBlockProps = Record<string, unknown>;

// Plan steps
type TimerPlanStep = {
  title: string;
  durationSeconds: number; // work seconds
  pauseSeconds: number; // rest seconds between steps
};

// Public controller API consumed by TimerBlock.tsx
export type TimerBlockController = {
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
  nextLabel?: string;
  progress: number; // 1 -> full, 0 -> empty
  remainingSeconds: number;
  totalLoops: number;
  start: () => void;
  stop: () => void;
};

// ---------- Utilities ----------
const parseSeconds = (value: unknown): number => {
  if (value === undefined || value === null) return 0;
  if (typeof value === "number")
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (typeof value !== "string") return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
};

const formatTime = (value: number): string => {
  const v = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const mm = Math.floor(v / 60);
  const ss = v % 60;
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
};

const formatChronograph = (ms: number): string => {
  const safe = Number.isFinite(ms) ? Math.max(0, Math.floor(ms)) : 0;
  const totalSec = Math.floor(safe / 1000);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const mmm = Math.floor(safe % 1000);
  return `${hh.toString().padStart(2, "0")}:${mm
    .toString()
    .padStart(2, "0")}:${ss.toString().padStart(2, "0")}.${mmm
    .toString()
    .padStart(3, "0")}`;
};

type LoopConfig =
  | { mode: "none" }
  | { mode: "infinite" }
  | { mode: "finite"; total: number };
const parseLoop = (value: unknown): LoopConfig => {
  // New semantics:
  // - omitted/empty or `true` => infinite
  // - `false` or numeric 0 => none
  // - numeric N > 0 => finite with total N
  if (value === undefined || value === null) return { mode: "infinite" };
  const raw = typeof value === "string" ? value : String(value);
  const normalized = raw.trim().toLowerCase();

  if (normalized === "" || normalized === "true") return { mode: "infinite" };
  if (normalized === "false") return { mode: "none" };

  const n = Number(normalized);
  if (!Number.isFinite(n)) return { mode: "infinite" };
  const total = Math.floor(n);
  if (total <= 0) return { mode: "none" };
  return { mode: "finite", total };
};

const toStepTitle = (value: unknown, fallback: string): string => {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s : fallback;
};

const parsePlanSteps = (value: unknown): TimerPlanStep[] => {
  if (!Array.isArray(value)) return [];
  const steps: TimerPlanStep[] = [];
  value.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const rec = raw as Record<string, unknown>;
    const durationSeconds = parseSeconds(rec.duration ?? rec.time);
    if (durationSeconds <= 0) return;
    const pauseSeconds = parseSeconds(rec.pause ?? rec.rest ?? 0);
    const title = toStepTitle(rec.title ?? rec.name, `step ${idx + 1}`);
    steps.push({ title, durationSeconds, pauseSeconds });
  });
  return steps;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<ScreenWakeLockSentinel> };
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
  if (typeof window === "undefined") return undefined;
  const w = window as WindowWithAudioContext;
  return window.AudioContext ?? w.webkitAudioContext;
};

const shouldVibrate = (mode: HepticMode) =>
  mode === "vibration" || mode === "both";
const shouldPlayAudio = (mode: HepticMode) =>
  mode === "audio" || mode === "both";

const withAudioContext = (mode: HepticMode, run: (ctx: AudioContext) => void) => {
  if (!shouldPlayAudio(mode)) return;
  const Ctor = getAudioContextConstructor();
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    const schedule = () => {
      try {
        run(ctx);
      } catch {
        void ctx.close().catch(() => undefined);
      }
    };
    if (typeof ctx.resume === "function" && ctx.state === "suspended") {
      ctx
        .resume()
        .then(schedule)
        .catch(schedule);
    } else {
      schedule();
    }
  } catch {
    // ignore
  }
};

const triggerVibration = (pattern: number | number[], mode: HepticMode) => {
  if (!shouldVibrate(mode)) return;
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  )
    return;
  navigator.vibrate(pattern);
};

const triggerShortBeep = (mode: HepticMode) => {
  triggerVibration(180, mode);
  withAudioContext(mode, (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    const duration = 0.18;
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, start);
    gain.gain.setValueAtTime(0.18, start);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const stopAt = start + duration;
    osc.start(start);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.stop(stopAt);
    if (typeof osc.addEventListener === "function") {
      osc.addEventListener("ended", () =>
        ctx.close().catch(() => undefined)
      );
    } else {
      osc.onended = () => {
        void ctx.close().catch(() => undefined);
      };
    }
  });
};

const triggerHappyChime = (mode: HepticMode) => {
  triggerVibration([140, 80, 200], mode);
  withAudioContext(mode, (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.18, now);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const duration = 0.5;
    const stopAt = now + duration;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.stop(stopAt);
    if (typeof osc.addEventListener === "function") {
      osc.addEventListener("ended", () =>
        ctx.close().catch(() => undefined)
      );
    } else {
      osc.onended = () => {
        void ctx.close().catch(() => undefined);
      };
    }
  });
};

const triggerRestCue = (mode: HepticMode) => {
  triggerVibration([250, 100, 250], mode);
  withAudioContext(mode, (ctx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.2, now);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const duration = 0.5;
    const stopAt = now + duration;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    osc.stop(stopAt);
    if (typeof osc.addEventListener === "function") {
      osc.addEventListener("ended", () =>
        ctx.close().catch(() => undefined)
      );
    } else {
      osc.onended = () => {
        void ctx.close().catch(() => undefined);
      };
    }
  });
};

const stopFeedback = (mode: HepticMode) => {
  if (!shouldVibrate(mode)) return;
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  )
    return;
  navigator.vibrate(0);
};

// ---------- Hook ----------
export const useTimerBlock = (props: TimerBlockProps): TimerBlockController => {
  // Base durations from props
  const baseDurationSeconds = useMemo(
    () => parseSeconds(props.duration),
    [props.duration]
  );
  const baseIntervalSeconds = useMemo(
    () => parseSeconds(props.interval),
    [props.interval]
  );

  // Loop config
  const loopConfig = useMemo(() => parseLoop(props.loop), [props.loop]);

  // Heptic/audio mode
  const hepticMode: HepticMode = useMemo(() => {
    const rawValue =
      typeof props.heptic === "string" ? props.heptic.trim().toLowerCase() : "";
    if (rawValue === "sound") return "audio";
    if (rawValue === "none") return "none";
    if (
      rawValue === "audio" ||
      rawValue === "vibration" ||
      rawValue === "both"
    ) {
      return rawValue;
    }
    // Default to no haptic/audio feedback unless explicitly requested
    return "none";
  }, [props.heptic]);

  // Optional step beep every N seconds while in work phase
  const stepSeconds = useMemo(() => {
    const raw = props.step;
    if (raw === undefined || raw === null) {
      return 0;
    }
    if (typeof raw === "string" && raw.trim() === "") {
      return 0;
    }
    const parsed = parseSeconds(raw);
    if (parsed > 0) {
      return parsed;
    }
    if (
      (typeof raw === "string" && raw.trim() === "0") ||
      (typeof raw === "number" && raw === 0)
    ) {
      return 0;
    }
    return 0;
  }, [props.step]);

  // Optional plan steps
  const planSteps = useMemo(() => parsePlanSteps(props.steps), [props.steps]);
  const hasPlan = planSteps.length > 0;
  const initialPlanDuration = hasPlan ? planSteps[0].durationSeconds : 0;

  // If no timer options are provided (duration/interval/steps/loop),
  // default to a single work phase of 25 minutes and a 5 minute rest.
  const noTimerOptions =
    props.duration == null &&
    props.interval == null &&
    props.steps == null &&
    props.loop == null;

  const effectiveBaseDurationSeconds = useMemo(() => {
    if (hasPlan) return initialPlanDuration;
    if (noTimerOptions) return 25 * 60; // 25 minutes
    return baseDurationSeconds;
  }, [hasPlan, initialPlanDuration, noTimerOptions, baseDurationSeconds]);

  const effectiveBaseIntervalSeconds = useMemo(() => {
    if (hasPlan) return 0;
    if (noTimerOptions) return 5 * 60; // 5 minutes
    return baseIntervalSeconds;
  }, [hasPlan, noTimerOptions, baseIntervalSeconds]);

  const effectiveLoopConfig = useMemo(() => {
    if (noTimerOptions) return { mode: "none" } as const;
    return loopConfig;
  }, [noTimerOptions, loopConfig]);

  const hasFiniteLoops = effectiveLoopConfig.mode === "finite";
  const totalLoops = hasFiniteLoops
    ? (effectiveLoopConfig as Extract<LoopConfig, { mode: "finite" }>).total
    : 0;

  // Title
  const title = useMemo(() => {
    const raw = typeof props.title === "string" ? props.title.trim() : "";
    if (raw) return raw;
    return hasPlan ? "time plan" : "work";
  }, [props.title, hasPlan]);

  // State
  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<TimerPhase>("work");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(
    hasPlan ? initialPlanDuration : effectiveBaseDurationSeconds
  );
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [progress, setProgress] = useState(1);

  // Refs for timing and feedback
  const phaseDurationRef = useRef(
    Math.max((hasPlan ? initialPlanDuration : effectiveBaseDurationSeconds) || 1, 1)
  );
  const phaseStartTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<ScreenWakeLockSentinel | null>(null);
  const stepCountRef = useRef(0);
  const lastFeedbackAtRef = useRef(0);
  const workAccumulatedRef = useRef(0); // ms of completed work phases

  // Derived current step & effective durations for this phase
  const safeStepIndex = hasPlan
    ? Math.min(Math.max(currentStepIndex, 0), planSteps.length - 1)
    : 0;
  const currentPlanStep = hasPlan ? planSteps[safeStepIndex] : undefined;
  const nextPlanStep =
    hasPlan && safeStepIndex + 1 < planSteps.length
      ? planSteps[safeStepIndex + 1]
      : undefined;

  const durationSeconds = hasPlan
    ? currentPlanStep?.durationSeconds ?? 0
    : effectiveBaseDurationSeconds;
  const intervalSeconds = hasPlan
    ? currentPlanStep?.pauseSeconds ?? 0
    : effectiveBaseIntervalSeconds;

  const getNow = useCallback(() => {
    if (
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
    )
      return performance.now();
    return Date.now();
  }, []);

  const markFeedback = useCallback(() => {
    lastFeedbackAtRef.current = getNow();
  }, [getNow]);

  const playShort = useCallback(() => {
    triggerShortBeep(hepticMode);
    markFeedback();
  }, [hepticMode, markFeedback]);

  const playChime = useCallback(() => {
    triggerHappyChime(hepticMode);
    markFeedback();
  }, [hepticMode, markFeedback]);

  const playRest = useCallback(() => {
    triggerRestCue(hepticMode);
    markFeedback();
  }, [hepticMode, markFeedback]);

  const stopCurrentFeedback = useCallback(
    () => stopFeedback(hepticMode),
    [hepticMode]
  );

  // Keep indices in range when plan changes
  useEffect(() => {
    if (!hasPlan) {
      setCurrentStepIndex(0);
      return;
    }
    setCurrentStepIndex((i) => Math.min(Math.max(i, 0), planSteps.length - 1));
  }, [hasPlan, planSteps.length]);

  // Reset some counters when stopped
  useEffect(() => {
    if (!isRunning) {
      workAccumulatedRef.current = 0;
      setElapsedMilliseconds(0);
      setCurrentLoop(0);
    }
  }, [isRunning]);

  // When duration changes and we're not running, reset remaining
  useEffect(() => {
    if (!isRunning) {
      setPhase("work");
      setRemainingSeconds(durationSeconds);
      setProgress(1);
      phaseStartTimeRef.current = null;
    }
  }, [durationSeconds, isRunning]);

  // Wake lock helpers
  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) return;
    try {
      const s = wakeLockRef.current;
      wakeLockRef.current = null;
      await s.release();
    } catch {
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined") return;
    const n = navigator as NavigatorWithWakeLock;
    if (!n.wakeLock?.request) return;
    if (wakeLockRef.current) return;
    try {
      const s = await n.wakeLock.request("screen");
      const onRelease = () => {
        wakeLockRef.current = null;
        if (s.removeEventListener) s.removeEventListener("release", onRelease);
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "visible"
        ) {
          if (isRunning) void requestWakeLock();
        }
      };
      wakeLockRef.current = s;
      if (s.addEventListener) s.addEventListener("release", onRelease);
    } catch {
      wakeLockRef.current = null;
    }
  }, [isRunning]);

  // Start/Stop
  const canStart = hasPlan ? initialPlanDuration > 0 : effectiveBaseDurationSeconds > 0;

  const start = useCallback(() => {
    const initial = hasPlan ? initialPlanDuration : effectiveBaseDurationSeconds;
    if (initial <= 0) return;
    stepCountRef.current = 0;
    stopCurrentFeedback();
    playChime();
    setPhase("work");
    setCurrentStepIndex(0);
    setRemainingSeconds(initial);
    setProgress(1);
    workAccumulatedRef.current = 0;
    setElapsedMilliseconds(0);
    setCurrentLoop(1);
    phaseStartTimeRef.current = null;
    setIsRunning(true);
    void requestWakeLock();
  }, [
    baseDurationSeconds,
    hasPlan,
    initialPlanDuration,
    playChime,
    requestWakeLock,
    stopCurrentFeedback,
  ]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setPhase("work");
    setCurrentStepIndex(0);
    setRemainingSeconds(hasPlan ? initialPlanDuration : effectiveBaseDurationSeconds);
    setProgress(1);
    phaseStartTimeRef.current = null;
    stepCountRef.current = 0;
    stopCurrentFeedback();
    void releaseWakeLock();
  }, [
    effectiveBaseDurationSeconds,
    hasPlan,
    initialPlanDuration,
    releaseWakeLock,
    stopCurrentFeedback,
  ]);

  // Phase transitions (on countdown reaching 0)
  useEffect(() => {
    if (!isRunning) return;

    if (remainingSeconds === 0) {
      // Add completed work to accumulated elapsed
      if (phase === "work") {
        workAccumulatedRef.current += Math.max(durationSeconds, 0) * 1000;
        setElapsedMilliseconds(workAccumulatedRef.current);
      }

      if (hasPlan) {
        // Plan mode: handle work/rest per step
        if (phase === "work") {
          if ((currentPlanStep?.pauseSeconds ?? 0) > 0) {
            playRest();
            setPhase("rest");
            setProgress(1);
            phaseStartTimeRef.current = null;
            setRemainingSeconds(currentPlanStep!.pauseSeconds);
            return;
          }

          // No rest for this step -> move to next step or loop/end
          const nextIdx = safeStepIndex + 1;
          if (nextIdx < planSteps.length) {
            playChime();
            setCurrentStepIndex(nextIdx);
            setPhase("work");
            setProgress(1);
            phaseStartTimeRef.current = null;
            setRemainingSeconds(planSteps[nextIdx].durationSeconds);
            return;
          }

          // End of plan: loop or stop
          const shouldContinue =
            loopConfig.mode !== "none" &&
            (!hasFiniteLoops || currentLoop < totalLoops);
          if (!shouldContinue) {
            playChime();
            stop();
            return;
          }
          playChime();
          setCurrentStepIndex(0);
          setPhase("work");
          setProgress(1);
          phaseStartTimeRef.current = null;
          setRemainingSeconds(planSteps[0].durationSeconds);
          setCurrentLoop((v) =>
            hasFiniteLoops ? Math.min(v + 1, totalLoops) : v + 1
          );
          return;
        }

        // phase === 'rest'
        const nextIdx = safeStepIndex + 1;
        if (nextIdx < planSteps.length) {
          playChime();
          setCurrentStepIndex(nextIdx);
          setPhase("work");
          setProgress(1);
          phaseStartTimeRef.current = null;
          setRemainingSeconds(planSteps[nextIdx].durationSeconds);
          return;
        }

        // End of plan rest -> loop or stop
        const shouldContinue =
          loopConfig.mode !== "none" &&
          (!hasFiniteLoops || currentLoop < totalLoops);
        if (!shouldContinue) {
          playChime();
          stop();
          return;
        }
        playChime();
        setCurrentStepIndex(0);
        setPhase("work");
        setProgress(1);
        phaseStartTimeRef.current = null;
        setRemainingSeconds(planSteps[0].durationSeconds);
        setCurrentLoop((v) =>
          hasFiniteLoops ? Math.min(v + 1, totalLoops) : v + 1
        );
        return;
      }

      // Simple mode (no plan)
      if (phase === "work") {
        if (intervalSeconds > 0) {
          playRest();
          setPhase("rest");
          setRemainingSeconds(intervalSeconds);
          setProgress(1);
          phaseStartTimeRef.current = null;
          return;
        }

        // No rest: either continue next work (loop) or stop
        const shouldContinue =
          loopConfig.mode !== "none" &&
          (!hasFiniteLoops || currentLoop < totalLoops);
        if (!shouldContinue) {
          playChime();
          stop();
          return;
        }
        playChime();
        setPhase("work");
        setRemainingSeconds(durationSeconds);
        setProgress(1);
        phaseStartTimeRef.current = null;
        setCurrentLoop((v) =>
          hasFiniteLoops ? Math.min(v + 1, totalLoops) : v + 1
        );
        return;
      }

      // Rest finished -> next work or stop based on loops
      const shouldContinue =
        loopConfig.mode !== "none" &&
        (!hasFiniteLoops || currentLoop < totalLoops);
      if (!shouldContinue) {
        playChime();
        stop();
        return;
      }
      playChime();
      setPhase("work");
      setRemainingSeconds(durationSeconds);
      setProgress(1);
      phaseStartTimeRef.current = null;
      setCurrentLoop((v) =>
        hasFiniteLoops ? Math.min(v + 1, totalLoops) : v + 1
      );
      return;
    }

    // Final 3 seconds countdown cue
    if (remainingSeconds > 0 && remainingSeconds <= 3) {
      playShort();
    }
  }, [
    isRunning,
    remainingSeconds,
    phase,
    durationSeconds,
    intervalSeconds,
    hasPlan,
    currentPlanStep?.pauseSeconds,
    planSteps,
    safeStepIndex,
    loopConfig,
    hasFiniteLoops,
    currentLoop,
    totalLoops,
    playChime,
    playRest,
    playShort,
    stop,
  ]);

  // Active phase duration used by timer computation
  const activePhaseDuration = useMemo(() => {
    if (phase === "rest")
      return intervalSeconds > 0 ? intervalSeconds : durationSeconds || 1;
    return durationSeconds || 1;
  }, [durationSeconds, intervalSeconds, phase]);

  // Reinitialize timing on phase or duration change
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

  // Reset step beep counter when duration/phase changes
  useEffect(() => {
    stepCountRef.current = 0;
  }, [activePhaseDuration, phase, stepSeconds]);

  // Per-step beep feedback while in work phase (excluding last 3 seconds)
  useEffect(() => {
    if (!isRunning) return;
    if (stepSeconds <= 0) return;
    if (remainingSeconds <= 0) return;
    if (remainingSeconds <= 3) return;
    const duration = Math.max(activePhaseDuration, 1);
    const elapsed = duration - remainingSeconds;
    if (elapsed <= 0) return;
    const completedSteps = Math.floor(elapsed / stepSeconds);
    if (completedSteps <= 0) return;
    if (completedSteps > stepCountRef.current) {
      const since = getNow() - lastFeedbackAtRef.current;
      stepCountRef.current = completedSteps;
      if (since > 400) playShort();
    }
  }, [
    activePhaseDuration,
    getNow,
    isRunning,
    playShort,
    remainingSeconds,
    stepSeconds,
  ]);

  // Recompute countdown continuously via RAF + 1s interval backup
  const recomputeTiming = useCallback(() => {
    if (!isRunning) return;
    const durationMs = Math.max(phaseDurationRef.current * 1000, 1);
    const now = getNow();
    const start = phaseStartTimeRef.current ?? now;
    if (phaseStartTimeRef.current === null) phaseStartTimeRef.current = start;
    const elapsed = now - start;
    const remaining = Math.max(durationMs - elapsed, 0);
    const ratio = Math.max(0, Math.min(1, remaining / durationMs));
    const remainingEstimate = Math.ceil(remaining / 1000);
    const totalElapsedMs = Math.floor(
      workAccumulatedRef.current +
        (phase === "work" ? Math.min(elapsed, durationMs) : 0)
    );
    setProgress(ratio);
    setRemainingSeconds((prev) =>
      Number.isFinite(remainingEstimate) ? remainingEstimate : prev
    );
    setElapsedMilliseconds((prev) =>
      prev === totalElapsedMs ? prev : totalElapsedMs
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
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      recomputeTiming();
      animationFrameRef.current = window.requestAnimationFrame(tick);
    };
    animationFrameRef.current = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning, recomputeTiming]);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => recomputeTiming(), 1000);
    return () => window.clearInterval(id);
  }, [isRunning, recomputeTiming]);

  // Wake lock lifecycle
  useEffect(() => {
    if (!isRunning) {
      void releaseWakeLock();
      return;
    }
    void requestWakeLock();
    if (typeof document === "undefined") return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        recomputeTiming();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isRunning, recomputeTiming, releaseWakeLock, requestWakeLock]);

  useEffect(() => {
    return () => {
      void releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // Labels and formatted values
  const formattedRemaining = useMemo(
    () => formatTime(isRunning ? remainingSeconds : durationSeconds),
    [durationSeconds, isRunning, remainingSeconds]
  );

  const currentLabel = useMemo(() => {
    if (hasPlan)
      return phase === "rest" ? "rest" : currentPlanStep?.title ?? title;
    if (isRunning && phase === "rest") return "rest";
    return "go";
  }, [currentPlanStep?.title, hasPlan, isRunning, phase, title]);

  const nextLabel = useMemo(() => {
    if (!hasPlan) return undefined;
    if (phase !== "rest") return undefined;
    return nextPlanStep?.title;
  }, [hasPlan, nextPlanStep, phase]);

  return {
    canStart,
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
    nextLabel,
    progress,
    remainingSeconds: isRunning ? remainingSeconds : durationSeconds,
    totalLoops,
    start,
    stop,
  };
};
