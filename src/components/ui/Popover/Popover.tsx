import React, {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type VerticalAlignment = "top" | "center" | "bottom";
type HorizontalAlignment = "left" | "center" | "right";

type Origin = {
  vertical: VerticalAlignment;
  horizontal: HorizontalAlignment;
};

type Offset = {
  horizontal?: number;
  vertical?: number;
};

type ContainerResolver = Element | null | (() => Element | null);

type PopoverProps = {
  anchorEl: HTMLElement | null;
  open: boolean;
  children: React.ReactNode;
  className?: string;
  anchorOrigin?: Partial<Origin>;
  transformOrigin?: Partial<Origin>;
  onClose?: () => void;
  disablePortal?: boolean;
  keepMounted?: boolean;
  container?: ContainerResolver;
  offset?: Offset;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

const DEFAULT_ANCHOR_ORIGIN: Origin = {
  vertical: "bottom",
  horizontal: "center",
};

const DEFAULT_TRANSFORM_ORIGIN: Origin = {
  vertical: "top",
  horizontal: "center",
};

const resolveOrigin = (
  base: Origin,
  override?: Partial<Origin>
): Origin => ({
  vertical: override?.vertical ?? base.vertical,
  horizontal: override?.horizontal ?? base.horizontal,
});

const getOffsetFromOrigin = (
  rect: DOMRect,
  origin: Origin
): { top: number; left: number } => {
  let top = rect.top;
  if (origin.vertical === "center") {
    top = rect.top + rect.height / 2;
  } else if (origin.vertical === "bottom") {
    top = rect.bottom;
  }

  let left = rect.left;
  if (origin.horizontal === "center") {
    left = rect.left + rect.width / 2;
  } else if (origin.horizontal === "right") {
    left = rect.right;
  }

  return { top, left };
};

const getTransformOffset = (
  size: { width: number; height: number },
  origin: Origin
): { x: number; y: number } => {
  let x = 0;
  if (origin.horizontal === "center") {
    x = size.width / 2;
  } else if (origin.horizontal === "right") {
    x = size.width;
  }

  let y = 0;
  if (origin.vertical === "center") {
    y = size.height / 2;
  } else if (origin.vertical === "bottom") {
    y = size.height;
  }

  return { x, y };
};

const resolveContainer = (
  container: ContainerResolver | undefined,
  ownerDocument: Document | null
) => {
  if (typeof container === "function") {
    return container();
  }

  if (container != null) {
    return container;
  }

  if (!ownerDocument) {
    return null;
  }

  return ownerDocument.body;
};

export const Popover = forwardRef<HTMLDivElement, PopoverProps>(
  (
    {
      anchorEl,
      open,
      children,
      className,
      anchorOrigin: anchorOriginProp,
      transformOrigin: transformOriginProp,
      onClose,
      disablePortal = false,
      keepMounted = false,
      container,
      offset,
      style,
      id,
      ...rest
    },
    forwardedRef
  ) => {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(
      null
    );
    const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);

    const ownerDocument = anchorEl?.ownerDocument ??
      (typeof document !== "undefined" ? document : null);
    const ownerWindow = ownerDocument?.defaultView ??
      (typeof window !== "undefined" ? window : undefined);

    const resolvedAnchorOrigin = useMemo(
      () => resolveOrigin(DEFAULT_ANCHOR_ORIGIN, anchorOriginProp),
      [anchorOriginProp]
    );

    const resolvedTransformOrigin = useMemo(
      () => resolveOrigin(DEFAULT_TRANSFORM_ORIGIN, transformOriginProp),
      [transformOriginProp]
    );

    const horizontalOffset = offset?.horizontal ?? 0;
    const verticalOffset = offset?.vertical ?? 0;

    const updatePosition = useCallback(() => {
      if (!anchorEl || !contentNode || !ownerWindow) {
        return;
      }

      const anchorRect = anchorEl.getBoundingClientRect();
      const anchorPoint = getOffsetFromOrigin(anchorRect, resolvedAnchorOrigin);
      const transformPoint = getTransformOffset(
        {
          width: contentNode.offsetWidth,
          height: contentNode.offsetHeight,
        },
        resolvedTransformOrigin
      );

      const scrollX = ownerWindow.scrollX ?? ownerWindow.pageXOffset ?? 0;
      const scrollY = ownerWindow.scrollY ?? ownerWindow.pageYOffset ?? 0;

      setPosition({
        left: anchorPoint.left + scrollX - transformPoint.x + horizontalOffset,
        top: anchorPoint.top + scrollY - transformPoint.y + verticalOffset,
      });
    }, [
      anchorEl,
      contentNode,
      ownerWindow,
      resolvedAnchorOrigin,
      resolvedTransformOrigin,
      horizontalOffset,
      verticalOffset,
    ]);

    useEffect(() => {
      if (!open) {
        return;
      }

      updatePosition();
    }, [open, updatePosition, anchorEl]);

    useEffect(() => {
      if (!open || !onClose || !ownerDocument) {
        return undefined;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      ownerDocument.addEventListener("keydown", handleKeyDown);

      return () => {
        ownerDocument.removeEventListener("keydown", handleKeyDown);
      };
    }, [open, onClose, ownerDocument]);

    useEffect(() => {
      if (!open || !onClose || !ownerDocument) {
        return undefined;
      }

      const handlePointer = (event: MouseEvent | TouchEvent) => {
        const target = event.target as Node | null;
        if (!target) {
          return;
        }

        if (contentNode?.contains(target)) {
          return;
        }

        if (anchorEl?.contains(target)) {
          return;
        }

        onClose();
      };

      ownerDocument.addEventListener("mousedown", handlePointer);
      ownerDocument.addEventListener("touchstart", handlePointer);

      return () => {
        ownerDocument.removeEventListener("mousedown", handlePointer);
        ownerDocument.removeEventListener("touchstart", handlePointer);
      };
    }, [open, onClose, ownerDocument, anchorEl, contentNode]);

    useEffect(() => {
      if (!open || !onClose) {
        return;
      }

      if (!anchorEl) {
        onClose();
      }
    }, [open, anchorEl, onClose]);

    useEffect(() => {
      if (!open || !ownerWindow) {
        return undefined;
      }

      const handleChange = () => {
        updatePosition();
      };

      ownerWindow.addEventListener("resize", handleChange);
      ownerWindow.addEventListener("scroll", handleChange, true);

      return () => {
        ownerWindow.removeEventListener("resize", handleChange);
        ownerWindow.removeEventListener("scroll", handleChange, true);
      };
    }, [open, ownerWindow, updatePosition]);

    useEffect(() => {
      if (!open || !contentNode || typeof ResizeObserver === "undefined") {
        return undefined;
      }

      const observer = new ResizeObserver(() => {
        updatePosition();
      });

      observer.observe(contentNode);

      return () => {
        observer.disconnect();
      };
    }, [open, contentNode, updatePosition]);

    useEffect(() => {
      if (!open || !anchorEl || typeof ResizeObserver === "undefined") {
        return undefined;
      }

      const observer = new ResizeObserver(() => {
        updatePosition();
      });

      observer.observe(anchorEl);

      return () => {
        observer.disconnect();
      };
    }, [open, anchorEl, updatePosition]);

    useEffect(() => {
      if (!keepMounted && !open) {
        setPosition(null);
      }
    }, [keepMounted, open]);

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        setContentNode(node);
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
        if (node && open) {
          updatePosition();
        }
      },
      [forwardedRef, open, updatePosition]
    );

    const resolvedContainer = useMemo(
      () =>
        disablePortal ? null : resolveContainer(container, ownerDocument),
      [disablePortal, container, ownerDocument]
    );

    if (!keepMounted && (!open || !anchorEl)) {
      return null;
    }

    const transformOriginStyle = `${resolvedTransformOrigin.horizontal} ${resolvedTransformOrigin.vertical}`;

    const combinedStyle: React.CSSProperties = {
      position: "absolute",
      top: position ? position.top : -9999,
      left: position ? position.left : -9999,
      visibility: open ? "visible" : "hidden",
      pointerEvents: open ? style?.pointerEvents : "none",
      transformOrigin: transformOriginStyle,
      ...style,
    };

    const content = (
      <div
        {...rest}
        id={id}
        ref={setRefs}
        className={className}
        style={combinedStyle}
      >
        {children}
      </div>
    );

    if (disablePortal || !resolvedContainer) {
      return content;
    }

    return createPortal(content, resolvedContainer);
  }
);

Popover.displayName = "Popover";

