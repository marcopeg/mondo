import {
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type MouseEvent,
} from "react";
import { Menu, Platform } from "obsidian";

import { Icon } from "../Icon";

type PlaceholderVariant = "dashed" | "solid";

type CoverSize = number | string;

export type CoverSelectHandler = (
  filePath: string,
  file: File
) => void | Promise<void>;

export type CoverProps = {
  src?: string | null;
  alt?: string;
  size?: CoverSize;
  strategy?: "cover" | "contain";
  placeholderIcon?: string;
  placeholderIconClassName?: string;
  imageClassName?: string;
  className?: string;
  placeholderClassName?: string;
  coverClassName?: string;
  placeholderVariant?: PlaceholderVariant;
  accept?: string;
  capture?: string;
  allowCameraCapture?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  selectLabel?: string;
  editLabel?: string;
  onSelectCover?: CoverSelectHandler;
  onEditCover?: () => void;
};

const DEFAULT_SIZE = 80;
const DEFAULT_PLACEHOLDER_ICON = "image";

const resolveSize = (size?: CoverSize) => {
  if (typeof size === "number") {
    return `${size}px`;
  }
  if (typeof size === "string" && size.trim().length > 0) {
    return size.trim();
  }
  return `${DEFAULT_SIZE}px`;
};

const getFilePath = (file: File): string => {
  const candidate = (file as unknown as { path?: string }).path;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return file.name;
};

export const Cover = ({
  src,
  alt = "Cover image",
  size,
  strategy = "contain",
  placeholderIcon = DEFAULT_PLACEHOLDER_ICON,
  placeholderIconClassName = "h-8 w-8",
  imageClassName = "h-full w-full transition-transform duration-200 group-hover:scale-[1.02]",
  className,
  placeholderClassName,
  coverClassName,
  placeholderVariant = "dashed",
  accept = "image/*",
  capture = "environment",
  allowCameraCapture = true,
  isLoading = false,
  disabled = false,
  selectLabel = "Select cover image",
  editLabel = "Open cover image",
  onSelectCover,
  onEditCover,
}: CoverProps) => {
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const resolvedSize = resolveSize(size);

  const containerStyle = useMemo(
    () => ({
      width: resolvedSize,
      height: resolvedSize,
    }),
    [resolvedSize]
  );

  const placeholderClasses = useMemo(() => {
    const base = [
      "group flex items-center justify-center rounded-md text-[var(--text-muted)] transition",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0",
      "disabled:cursor-not-allowed disabled:opacity-70",
    ];

    if (placeholderVariant === "solid") {
      base.push(
        "border border-[var(--background-modifier-border)] bg-[var(--background-primary)]",
        "hover:border-[var(--background-modifier-border-hover)] hover:text-[var(--text-normal)]"
      );
    } else {
      base.push(
        "border border-dashed border-[var(--background-modifier-border)] bg-[var(--background-primary)]",
        "hover:border-[var(--background-modifier-border-hover)] hover:text-[var(--text-normal)]"
      );
    }

    if (className) {
      base.push(className);
    }

    if (placeholderClassName) {
      base.push(placeholderClassName);
    }

    return base.join(" ");
  }, [className, placeholderClassName, placeholderVariant]);

  const coverClasses = useMemo(() => {
    const base = [
      "group relative flex items-center justify-center overflow-hidden rounded-md transition",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--interactive-accent)] focus-visible:ring-offset-0",
    ];

    if (placeholderVariant === "solid") {
      base.push(
        "border border-[var(--background-modifier-border)] bg-[var(--background-primary)]"
      );
    } else {
      base.push("border border-transparent");
    }

    if (className) {
      base.push(className);
    }

    if (coverClassName) {
      base.push(coverClassName);
    }

    return base.join(" ");
  }, [className, coverClassName, placeholderVariant]);

  const handlePlaceholderClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!onSelectCover || disabled || isLoading) {
        return;
      }

      if (Platform.isMobileApp) {
        event.preventDefault();

        const menu = new Menu();

        if (allowCameraCapture) {
          menu.addItem((item) => {
            item.setTitle("Take Photo");
            item.onClick(() => {
              if (cameraInputRef.current) {
                cameraInputRef.current.click();
              } else {
                libraryInputRef.current?.click();
              }
            });
          });
        }

        menu.addItem((item) => {
          item.setTitle("Choose from Library");
          item.onClick(() => {
            libraryInputRef.current?.click();
          });
        });

        menu.showAtMouseEvent(event.nativeEvent);
        return;
      }

      libraryInputRef.current?.click();
    },
    [allowCameraCapture, disabled, isLoading, onSelectCover]
  );

  const handleCoverClick = useCallback(() => {
    if (disabled) {
      return;
    }

    if (src && onEditCover) {
      onEditCover();
      return;
    }

    if (!src && onSelectCover) {
      libraryInputRef.current?.click();
    }
  }, [disabled, onEditCover, onSelectCover, src]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0] ?? null;
      input.value = "";

      if (!file || !onSelectCover) {
        return;
      }

      const filePath = getFilePath(file);
      void onSelectCover(filePath, file);
    },
    [onSelectCover]
  );

  const imageStyle = useMemo(() => ({ objectFit: strategy }), [strategy]);

  return (
    <div style={containerStyle} className="flex-shrink-0">
      {onSelectCover ? (
        <input
          ref={libraryInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}
      {onSelectCover && allowCameraCapture ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept={accept}
          capture={capture}
          className="hidden"
          onChange={handleFileChange}
        />
      ) : null}

      {src ? (
        <button
          type="button"
          onClick={handleCoverClick}
          className={coverClasses}
          style={containerStyle}
          aria-label={editLabel}
          disabled={disabled}
        >
          <img
            src={src}
            alt={alt}
            className={imageClassName}
            style={imageStyle}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePlaceholderClick}
          className={placeholderClasses}
          style={containerStyle}
          aria-label={selectLabel}
          disabled={disabled || isLoading || !onSelectCover}
        >
          <Icon
            name={isLoading ? "loader-2" : placeholderIcon}
            className={`${placeholderIconClassName} ${
              isLoading ? "animate-spin" : ""
            }`}
          />
        </button>
      )}
    </div>
  );
};
