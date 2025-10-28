import React, { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import "@/components/LoadingScreen/LoadingScreen.css";

type LoadingScreenProps = {
  text?: string;
  icon?: string;
  onCancel?: () => void;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  text = "Loading...",
  icon,
  onCancel,
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCancel) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  return (
    <div className="mondo-loading-screen">
      <div className="mondo-loading-screen__overlay" />
      <div className="mondo-loading-screen__content">
        {icon && (
          <div className="mondo-loading-screen__icon">
            <Icon name={icon} className="w-16 h-16" />
          </div>
        )}
        <p className="mondo-loading-screen__text">{text}</p>
        {onCancel && (
          <button
            className="mondo-loading-screen__cancel-button"
            onClick={onCancel}
            aria-label="Cancel"
          >
            Cancel (ESC)
          </button>
        )}
      </div>
    </div>
  );
};
