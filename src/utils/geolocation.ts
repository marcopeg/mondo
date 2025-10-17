export type GeolocationData = {
  lat: number;
  lon: number;
};

const roundTo = (value: number, precision: number) => {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
};

const ensureNavigator = () => {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not available in this environment.");
  }

  return navigator.geolocation;
};

// Cache for storing geolocation with timestamp
let cachedGeolocation: {
  lat: number;
  lon: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const getCachedGeolocation = (): GeolocationData | null => {
  if (!cachedGeolocation) {
    return null;
  }

  const now = Date.now();
  const age = now - cachedGeolocation.timestamp;

  if (age > CACHE_DURATION_MS) {
    // Cache expired
    cachedGeolocation = null;
    return null;
  }

  return {
    lat: cachedGeolocation.lat,
    lon: cachedGeolocation.lon,
  };
};

const setCachedGeolocation = (lat: number, lon: number): void => {
  cachedGeolocation = {
    lat,
    lon,
    timestamp: Date.now(),
  };
};

const requestPosition = async (
  signal?: AbortSignal
): Promise<GeolocationPosition> => {
  const geolocation = ensureNavigator();

  return new Promise((resolve, reject) => {
    let aborted = false;

    if (signal) {
      if (signal.aborted) {
        reject(new Error("Geolocation request cancelled."));
        return;
      }

      signal.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("Geolocation request cancelled."));
      });
    }

    geolocation.getCurrentPosition(
      (position) => {
        if (!aborted) {
          resolve(position);
        }
      },
      (error) => {
        if (!aborted) {
          reject(new Error(error.message || "Unable to retrieve geolocation."));
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000,
      }
    );
  });
};

const positionToGeolocation = (
  position: GeolocationPosition
): GeolocationData => {
  const { coords } = position;

  return {
    lat: roundTo(coords.latitude, 6),
    lon: roundTo(coords.longitude, 6),
  };
};

type IPGeolocationPayload = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  accuracy_radius?: number;
};

const FALLBACK_ENDPOINT = "https://ipapi.co/json/";

const requestFallbackGeolocation = async (): Promise<GeolocationData> => {
  if (typeof fetch === "undefined") {
    throw new Error(
      "Fallback geolocation is not available in this environment."
    );
  }

  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : undefined;
  const timeoutId =
    typeof window !== "undefined" && controller
      ? window.setTimeout(() => {
          controller.abort();
        }, 10000)
      : undefined;

  try {
    const response = await fetch(FALLBACK_ENDPOINT, {
      signal: controller?.signal,
    });

    if (!response.ok) {
      throw new Error("Fallback geolocation service returned an error.");
    }

    const payload = (await response.json()) as IPGeolocationPayload;

    if (
      typeof payload.latitude !== "number" ||
      typeof payload.longitude !== "number"
    ) {
      throw new Error("Fallback geolocation service returned invalid data.");
    }

    return {
      lat: roundTo(payload.latitude, 6),
      lon: roundTo(payload.longitude, 6),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Fallback geolocation request timed out.");
    }

    throw error instanceof Error
      ? error
      : new Error("Fallback geolocation request failed.");
  } finally {
    if (typeof timeoutId === "number") {
      window.clearTimeout(timeoutId);
    }
  }
};

export const requestGeolocation = async (
  signal?: AbortSignal
): Promise<GeolocationData> => {
  // Check cache first
  const cached = getCachedGeolocation();
  if (cached) {
    return cached;
  }

  try {
    const position = await requestPosition(signal);
    const geoloc = positionToGeolocation(position);
    setCachedGeolocation(geoloc.lat, geoloc.lon);
    return geoloc;
  } catch (primaryError) {
    try {
      const geoloc = await requestFallbackGeolocation();
      setCachedGeolocation(geoloc.lat, geoloc.lon);
      return geoloc;
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : "Fallback geolocation failed.";
      const primaryMessage =
        primaryError instanceof Error
          ? primaryError.message
          : "Unable to retrieve geolocation.";

      throw new Error(
        `${primaryMessage} (fallback failed: ${fallbackMessage})`
      );
    }
  }
};
