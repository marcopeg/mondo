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
    <div className="crm-loading-screen">
      <div className="crm-loading-screen__overlay" />
      <div className="crm-loading-screen__content">
        {icon && (
          <div className="crm-loading-screen__icon">
            <Icon name={icon} className="w-16 h-16" />
          </div>
        )}
        <p className="crm-loading-screen__text">{text}</p>
        {onCancel && (
          <button
            className="crm-loading-screen__cancel-button"
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
