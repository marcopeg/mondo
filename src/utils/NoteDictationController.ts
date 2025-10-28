const VISUALIZER_BARS = 12;
const SUCCESS_DISPLAY_MS = 1200;
const DEFAULT_AUDIO_TYPE = "audio/webm";

const createInitialLevels = () => new Array(VISUALIZER_BARS).fill(0);

export type DictationStatus =
  | "idle"
  | "recording"
  | "processing"
  | "error"
  | "success";

export type DictationState = {
  status: DictationStatus;
  levels: number[];
  errorMessage: string | null;
};

export type DictationControllerOptions = {
  onStart: () => Promise<void>;
  onAbort: () => void;
  onSubmit: (audio: Blob) => Promise<void>;
};

export class NoteDictationController {
  private readonly options: DictationControllerOptions;
  private readonly listeners = new Set<(state: DictationState) => void>();

  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrame: number | null = null;
  private successTimeout: number | null = null;
  private chunks: Blob[] = [];

  private state: DictationState = {
    status: "idle",
    levels: createInitialLevels(),
    errorMessage: null,
  };

  constructor(options: DictationControllerOptions) {
    this.options = options;
  }

  getState = (): DictationState => ({
    status: this.state.status,
    levels: [...this.state.levels],
    errorMessage: this.state.errorMessage,
  });

  subscribe = (listener: (state: DictationState) => void) => {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  };

  start = async () => {
    if (
      this.state.status === "recording" ||
      this.state.status === "processing"
    ) {
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      this.setState({
        status: "error",
        errorMessage: "Microphone access is not supported in this environment.",
      });
      return;
    }

    try {
      await this.options.onStart();
    } catch (error) {
      this.setState({
        status: "error",
        errorMessage:
          error instanceof Error ? error.message : "Unable to start recording",
      });
      return;
    }

    try {
      this.setState({ status: "idle", errorMessage: null });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : DEFAULT_AUDIO_TYPE;
      const recorder = new MediaRecorder(stream, { mimeType });

      this.mediaRecorder = recorder;
      this.mediaStream = stream;
      this.chunks = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      });

      recorder.addEventListener(
        "stop",
        () => {
          void this.handleRecordingStop();
        },
        { once: true }
      );

      this.startVisualizer(stream);
      recorder.start();
      this.setState({ status: "recording", errorMessage: null });
    } catch (error) {
      this.options.onAbort();
      this.cleanupRecording();
      this.setState({
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Microphone permission denied",
      });
    }
  };

  stop = () => {
    if (!this.mediaRecorder) {
      return;
    }

    try {
      this.mediaRecorder.stop();
    } catch (error) {
      console.error("Mondo: failed to stop recorder", error);
      this.cleanupRecording();
      this.setState({
        status: "error",
        errorMessage: "Unable to stop recording",
      });
    }
  };

  reset = () => {
    if (this.state.status === "recording") {
      try {
        this.mediaRecorder?.stop();
      } catch (error) {
        console.error("Mondo: failed to stop recorder during reset", error);
      }
    }
    this.cleanupRecording();
    this.setState({
      status: "idle",
      levels: createInitialLevels(),
      errorMessage: null,
    });
    this.options.onAbort();
  };

  private setState = (partial: Partial<DictationState>) => {
    this.state = {
      status: partial.status ?? this.state.status,
      levels: partial.levels ? [...partial.levels] : this.state.levels,
      errorMessage:
        partial.errorMessage !== undefined
          ? partial.errorMessage
          : this.state.errorMessage,
    };
    this.emit();
  };

  private emit = () => {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Mondo: dictation listener failed", error);
      }
    });
  };

  private stopAnimation = () => {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  };

  private resetVisualizer = () => {
    this.stopAnimation();
    this.setState({ levels: createInitialLevels() });
  };

  private cleanupRecording = () => {
    this.stopAnimation();

    const recorder = this.mediaRecorder;
    if (recorder) {
      try {
        recorder.stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Mondo: failed to stop recorder tracks", error);
      }
    }

    const stream = this.mediaStream;
    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.error("Mondo: failed to stop media stream", error);
      }
    }

    this.mediaRecorder = null;
    this.mediaStream = null;
    this.chunks = [];

    const analyser = this.analyser;
    if (analyser) {
      try {
        analyser.disconnect();
      } catch (error) {
        console.error("Mondo: failed to disconnect analyser", error);
      }
    }
    this.analyser = null;

    const audioContext = this.audioContext;
    if (audioContext) {
      try {
        void audioContext.close();
      } catch (error) {
        console.error("Mondo: failed to close audio context", error);
      }
    }
    this.audioContext = null;

    if (this.successTimeout !== null) {
      window.clearTimeout(this.successTimeout);
      this.successTimeout = null;
    }
  };

  private updateLevels = () => {
    const analyser = this.analyser;
    if (!analyser) {
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const bucketSize = Math.max(1, Math.floor(bufferLength / VISUALIZER_BARS));
    const levels = new Array(VISUALIZER_BARS).fill(0).map((_, index) => {
      const start = index * bucketSize;
      const end = Math.min(start + bucketSize, bufferLength);
      let sum = 0;
      for (let i = start; i < end; i += 1) {
        sum += dataArray[i];
      }
      const average = sum / Math.max(1, end - start);
      return Math.max(0, Math.min(1, average / 255));
    });

    this.setState({ levels });
    this.animationFrame = requestAnimationFrame(this.updateLevels);
  };

  private startVisualizer = (stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      this.audioContext = audioContext;
      this.analyser = analyser;

      this.updateLevels();
    } catch (error) {
      console.error("Mondo: failed to initialize visualizer", error);
      this.resetVisualizer();
    }
  };

  private handleRecordingStop = async () => {
    const blob = new Blob(this.chunks, {
      type: this.mediaRecorder?.mimeType || DEFAULT_AUDIO_TYPE,
    });

    this.cleanupRecording();

    if (blob.size === 0) {
      this.setState({
        status: "idle",
        errorMessage: "No audio captured. Try again.",
      });
      this.options.onAbort();
      return;
    }

    try {
      this.setState({ status: "processing", errorMessage: null });
      await this.options.onSubmit(blob);
      this.setState({ status: "success", errorMessage: null });
      this.successTimeout = window.setTimeout(() => {
        this.resetVisualizer();
        this.setState({ status: "idle", errorMessage: null });
      }, SUCCESS_DISPLAY_MS);
    } catch (error) {
      // Gracefully handle user-initiated cancellations
      const isAbort =
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError") ||
        (error instanceof Error && /abort|cancel/i.test(error.message));

      if (isAbort) {
        // Return to idle without logging an error
        this.resetVisualizer();
        this.setState({ status: "idle", errorMessage: null });
        return;
      }

      console.error("Mondo: voice submission failed", error);
      this.setState({
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to process recording",
      });
      this.resetVisualizer();
    }
  };
}

export default NoteDictationController;
