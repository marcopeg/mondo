import { useEffect, useState } from "react";

const hasResizeObserver = () => typeof ResizeObserver === "function";

const readWidth = (element: HTMLElement) => element.getBoundingClientRect().width;

export const useContainerBreakpoint = (
  container: HTMLElement | null,
  breakpoint: number
): boolean => {
  const [isBelowBreakpoint, setIsBelowBreakpoint] = useState<boolean>(false);

  useEffect(() => {
    if (!container) {
      return;
    }

    let animationFrame = 0;

    const update = (width: number) => {
      setIsBelowBreakpoint(width < breakpoint);
    };

    const measure = () => {
      update(readWidth(container));
    };

    measure();

    if (hasResizeObserver()) {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }

        animationFrame = requestAnimationFrame(() => {
          update(entry.contentRect.width);
        });
      });

      observer.observe(container);

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        observer.disconnect();
      };
    }

    const handleWindowResize = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(measure);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleWindowResize);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleWindowResize);
      }
    };
  }, [container, breakpoint]);

  return isBelowBreakpoint;
};

export default useContainerBreakpoint;
