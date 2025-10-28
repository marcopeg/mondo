import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Notice } from "obsidian";
import { useApp } from "@/hooks/use-app";
import NoteDictationController, {
  type DictationState,
} from "@/utils/NoteDictationController";
import VoiceTranscriptionService from "@/utils/VoiceTranscriptionService";
import getMondoPlugin from "@/utils/getMondoPlugin";
import type Mondo from "@/main";
import Button from "@/components/ui/Button";
import {
  MONDO_DICTATION_ICON_ID,
  registerDictationIcon,
} from "@/utils/registerDictationIcon";

registerDictationIcon();

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  );
  const setter = descriptor?.set;
  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const resolveIconName = (status: DictationState["status"]) => {
  if (status === "recording") {
    // Use a stable, always-available icon while recording
    return MONDO_DICTATION_ICON_ID;
  }
  if (status === "processing") {
    return "loader-2";
  }
  if (status === "success") {
    return "check";
  }
  if (status === "error") {
    return "alert-circle";
  }
  return MONDO_DICTATION_ICON_ID;
};

const deriveButtonLabel = (status: DictationState["status"]) => {
  if (status === "recording") {
    return "Stop voice capture";
  }
  if (status === "processing") {
    return "Processing voice capture";
  }
  if (status === "success") {
    return "Voice capture inserted";
  }
  if (status === "error") {
    return "Retry voice capture";
  }
  return "Start voice capture";
};

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  whisper?: boolean;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      className = "setting-input flex-1",
      whisper = true,
      disabled,
      readOnly,
      ...props
    },
    forwardedRef
  ) => {
    const app = useApp();
    const inputRef = useRef<HTMLInputElement | null>(null);
    const controllerRef = useRef<NoteDictationController | null>(null);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const pluginRef = useRef<Mondo | null>(null);
    const serviceRef = useRef<VoiceTranscriptionService | null>(null);
    const [dictationState, setDictationState] = useState<DictationState | null>(
      null
    );

    const assignRef = useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (
            forwardedRef as React.MutableRefObject<HTMLInputElement | null>
          ).current = node;
        }
      },
      [forwardedRef]
    );

    const ensureService = useCallback(() => {
      const plugin = getMondoPlugin(app);
      if (!plugin) {
        pluginRef.current = null;
        serviceRef.current = null;
        return null;
      }

      if (pluginRef.current !== plugin) {
        pluginRef.current = plugin;
        serviceRef.current = new VoiceTranscriptionService(plugin);
      }

      return serviceRef.current;
    }, [app]);

    const handleAbort = useCallback(() => {
      // No-op for now, but allows future custom behavior.
    }, []);

    const handleStart = useCallback(async () => {
      const service = ensureService();
      if (!service) {
        const message = "Mondo plugin is not ready yet.";
        new Notice(message);
        throw new Error(message);
      }

      if (!service.hasApiKey()) {
        const message = "Set your OpenAI API key in the Mondo settings.";
        new Notice(message);
        throw new Error(message);
      }
    }, [ensureService]);

    const handleSubmit = useCallback(
      async (audio: Blob) => {
        const service = ensureService();
        if (!service) {
          const message = "Mondo plugin is not ready yet.";
          new Notice(message);
          throw new Error(message);
        }

        const input = inputRef.current;
        if (!input) {
          const message = "Input field is not ready to receive transcription.";
          new Notice(message);
          throw new Error(message);
        }

        try {
          const transcript = await service.process(audio);
          const existing = input.value;
          const needsSpace = existing.length > 0 && !/[\s\n]$/.test(existing);
          const nextValue = `${existing}${needsSpace ? " " : ""}${transcript}`;

          setNativeInputValue(input, nextValue);

          requestAnimationFrame(() => {
            const caret = nextValue.length;
            try {
              input.setSelectionRange(caret, caret);
            } catch (error) {
              console.debug("Mondo: unable to set selection range", error);
            }
            input.focus({ preventScroll: true });
          });

          new Notice("Transcription inserted into the field.");
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to process voice note.";
          new Notice(`Voice capture failed: ${message}`);
          throw error instanceof Error ? error : new Error(message);
        }
      },
      [ensureService]
    );

    useEffect(() => {
      if (!whisper) {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        controllerRef.current?.reset();
        controllerRef.current = null;
        setDictationState(null);
        return;
      }

      const controller = new NoteDictationController({
        onStart: handleStart,
        onAbort: handleAbort,
        onSubmit: handleSubmit,
      });
      controllerRef.current = controller;

      const unsubscribe = controller.subscribe((state) => {
        setDictationState(state);
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        unsubscribe();
        controller.reset();
        controllerRef.current = null;
        unsubscribeRef.current = null;
      };
    }, [handleAbort, handleStart, handleSubmit, whisper]);

    const status = dictationState?.status ?? "idle";
    const isRecording = status === "recording";
    const isProcessing = status === "processing";
    const isError = status === "error";
    const isSuccess = status === "success";

    const plugin = getMondoPlugin(app);
    const hasApiKey = Boolean(plugin?.settings?.openAIWhisperApiKey?.trim?.());
    const micUnavailableReason = !plugin
      ? "Mondo plugin is not ready yet."
      : !hasApiKey
      ? "Set your OpenAI API key in the Mondo settings."
      : null;

    // No direct DOM icon mutation needed; Button will render dynamic icon from state.

    const buttonLabel = deriveButtonLabel(status);
    const tooltip =
      dictationState?.errorMessage ?? micUnavailableReason ?? buttonLabel;

    const handleMicClick = () => {
      if (!whisper) {
        return;
      }

      const controller = controllerRef.current;
      if (!controller) {
        const message = "Voice capture is not available right now.";
        new Notice(message);
        return;
      }

      const current = controller.getState();

      if (current.status === "recording") {
        controller.stop();
        return;
      }

      if (current.status === "processing") {
        return;
      }

      inputRef.current?.focus({ preventScroll: true });
      void controller.start();
    };

    const buttonDisabled =
      Boolean(disabled) || Boolean(readOnly) || !whisper || isProcessing;

    const wrapperClassName = whisper ? "mondo-textfield" : undefined;
    const inputClassName = whisper
      ? [className, "mondo-textfield__input"].filter(Boolean).join(" ")
      : className;

    if (!whisper) {
      return (
        <input
          ref={assignRef}
          type="text"
          className={inputClassName}
          disabled={disabled}
          readOnly={readOnly}
          {...props}
        />
      );
    }

    const buttonClasses = ["mondo-textfield__mic"];
    if (isRecording) {
      buttonClasses.push("mondo-textfield__mic--recording");
    }
    if (isProcessing) {
      buttonClasses.push("mondo-textfield__mic--processing");
    }
    if (isError) {
      buttonClasses.push("mondo-textfield__mic--error");
    }
    if (isSuccess) {
      buttonClasses.push("mondo-textfield__mic--success");
    }

    const iconName = resolveIconName(status);
    const iconClassName = [
      "mondo-textfield__mic-icon",
      isProcessing ? "mondo-voice-fab-icon--spin" : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClassName}>
        <input
          ref={assignRef}
          type="text"
          className={inputClassName}
          disabled={disabled}
          readOnly={readOnly}
          {...props}
        />
        <Button
          variant="link"
          className={buttonClasses.join(" ")}
          tone={isRecording ? "success" : "default"}
          type="button"
          onClick={handleMicClick}
          disabled={buttonDisabled}
          aria-label={buttonLabel}
          aria-pressed={isRecording}
          title={tooltip}
          // Override link defaults to remove underline and keep inherited color/background.
          style={{
            textDecorationLine: "none",
            textDecorationThickness: 0,
            background: "transparent",
            boxShadow: "none",
          }}
          icon={iconName}
          iconClassName={iconClassName}
        />
      </div>
    );
  }
);

TextField.displayName = "TextField";

export default TextField;
