import React, { useEffect, useMemo, useState } from "react";
import { setIcon } from "obsidian";
import type NoteDictationController from "@/utils/NoteDictationController";
import type { DictationState } from "@/utils/NoteDictationController";

type VoiceFabButtonProps = {
  controller: NoteDictationController;
  visible: boolean;
  disabled: boolean;
  tooltip?: string;
};

const deriveAriaLabel = (state: DictationState, visible: boolean) => {
  if (!visible) {
    return "";
  }

  if (state.status === "recording") {
    return "Stop voice capture";
  }

  if (state.status === "processing") {
    return "Processing voice capture";
  }

  if (state.status === "success") {
    return "Voice capture inserted";
  }

  if (state.status === "error") {
    return "Retry voice capture";
  }

  return "Start voice capture";
};

const deriveStatusLabel = (state: DictationState) => {
  if (state.status === "recording") {
    return "Recording…";
  }
  if (state.status === "processing") {
    return "Processing…";
  }
  if (state.status === "success") {
    return "Inserted";
  }
  if (state.status === "error") {
    return "Retry";
  }
  return "Record";
};

const resolveIcon = (state: DictationState) => {
  if (state.status === "recording") {
    return "waveform";
  }
  if (state.status === "processing") {
    return "loader-2";
  }
  if (state.status === "success") {
    return "check";
  }
  if (state.status === "error") {
    return "alert-circle";
  }
  return "mic";
};

export const VoiceFabButton: React.FC<VoiceFabButtonProps> = ({
  controller,
  visible,
  disabled,
  tooltip,
}) => {
  const [state, setState] = useState<DictationState>(() => controller.getState());
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [iconEl, setIconEl] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    return controller.subscribe((nextState) => {
      setState(nextState);
      if (nextState.status !== "error") {
        setLocalMessage(null);
      }
    });
  }, [controller]);

  useEffect(() => {
    if (!visible) {
      controller.reset();
    }
  }, [controller, visible]);

  useEffect(() => {
    if (!iconEl) {
      return;
    }

    const iconName = resolveIcon(state);
    setIcon(iconEl, iconName);

    if (state.status === "processing") {
      iconEl.classList.add("crm-voice-fab-icon--spin");
    } else {
      iconEl.classList.remove("crm-voice-fab-icon--spin");
    }
  }, [iconEl, state]);

  const ariaLabel = useMemo(() => deriveAriaLabel(state, visible), [state, visible]);
  const statusLabel = useMemo(() => deriveStatusLabel(state), [state]);

  const message = state.errorMessage ?? localMessage;

  const isProcessing = state.status === "processing";
  const isRecording = state.status === "recording";
  const isInteractive = visible && !disabled && !isProcessing;

  const handleClick = () => {
    if (!visible) {
      return;
    }

    if (isRecording) {
      controller.stop();
      return;
    }

    if (!isInteractive) {
      if (tooltip) {
        setLocalMessage(tooltip);
      }
      return;
    }

    setLocalMessage(null);
    void controller.start();
  };

  return (
    <div className={`crm-voice-fab ${visible ? "crm-voice-fab--visible" : ""}`.trim()}>
      <button
        className={`crm-voice-fab__button crm-voice-fab__button--${state.status}`}
        type="button"
        aria-label={ariaLabel}
        aria-pressed={isRecording}
        disabled={!visible || isProcessing}
        onClick={handleClick}
        title={tooltip ?? "Record voice note"}
      >
        <span className="crm-voice-fab__visualizer" aria-hidden>
          {state.levels.map((level, index) => (
            <span
              key={index}
              className="crm-voice-fab__bar"
              style={{ transform: `scaleY(${0.2 + level * 0.8})` }}
            />
          ))}
        </span>
        <span
          className="crm-voice-fab__icon"
          aria-hidden
          ref={setIconEl}
        />
      </button>
      {visible ? (
        <div className="crm-voice-fab__status" aria-live="polite">
          {statusLabel}
        </div>
      ) : null}
      {message && visible ? (
        <div className="crm-voice-fab__message" role="status">
          {message}
        </div>
      ) : null}
    </div>
  );
};

export default VoiceFabButton;
