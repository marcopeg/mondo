import { useCallback, useEffect, useState } from "react";

export const useMediaQuery = (query: string): boolean => {
  const getMatches = useCallback(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(() => getMatches());

  useEffect(() => {
    setMatches(getMatches());

    if (typeof window === "undefined") {
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", listener);
      return () => {
        mediaQueryList.removeEventListener("change", listener);
      };
    }

    mediaQueryList.addListener(listener);
    return () => {
      mediaQueryList.removeListener(listener);
    };
  }, [getMatches, query]);

  return matches;
};
