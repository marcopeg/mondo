export type GeolocationFrontmatter = {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: string;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
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

const requestPosition = async (): Promise<GeolocationPosition> => {
  const geolocation = ensureNavigator();

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        reject(new Error(error.message || "Unable to retrieve geolocation."));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  });
};

const positionToFrontmatter = (
  position: GeolocationPosition
): GeolocationFrontmatter => {
  const { coords, timestamp } = position;

  const geoloc: GeolocationFrontmatter = {
    lat: roundTo(coords.latitude, 6),
    lon: roundTo(coords.longitude, 6),
    accuracy: roundTo(coords.accuracy, 1),
    timestamp: new Date(timestamp || Date.now()).toISOString(),
  };

  if (typeof coords.altitude === "number") {
    geoloc.altitude = roundTo(coords.altitude, 1);
  }

  if (typeof coords.altitudeAccuracy === "number") {
    geoloc.altitudeAccuracy = roundTo(coords.altitudeAccuracy, 1);
  }

  if (typeof coords.heading === "number" && !Number.isNaN(coords.heading)) {
    geoloc.heading = roundTo(coords.heading, 1);
  }

  if (typeof coords.speed === "number" && !Number.isNaN(coords.speed)) {
    geoloc.speed = roundTo(coords.speed, 2);
  }

  return geoloc;
};

type IPGeolocationPayload = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  accuracy_radius?: number;
};

const FALLBACK_ENDPOINT = "https://ipapi.co/json/";

const requestFallbackGeolocation = async (): Promise<GeolocationFrontmatter> => {
  if (typeof fetch === "undefined") {
    throw new Error("Fallback geolocation is not available in this environment.");
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

    if (typeof payload.latitude !== "number" || typeof payload.longitude !== "number") {
      throw new Error("Fallback geolocation service returned invalid data.");
    }

    const accuracyCandidate = (() => {
      if (typeof payload.accuracy === "number") {
        return payload.accuracy;
      }

      if (typeof payload.accuracy_radius === "number") {
        return payload.accuracy_radius * 1000;
      }

      return 50000;
    })();

    return {
      lat: roundTo(payload.latitude, 6),
      lon: roundTo(payload.longitude, 6),
      accuracy: roundTo(accuracyCandidate, 1),
      timestamp: new Date().toISOString(),
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

export const requestGeolocation = async (): Promise<GeolocationFrontmatter> => {
  try {
    const position = await requestPosition();
    return positionToFrontmatter(position);
  } catch (primaryError) {
    try {
      return await requestFallbackGeolocation();
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error
          ? fallbackError.message
          : "Fallback geolocation failed.";
      const primaryMessage =
        primaryError instanceof Error
          ? primaryError.message
          : "Unable to retrieve geolocation.";

      throw new Error(`${primaryMessage} (fallback failed: ${fallbackMessage})`);
    }
  }
};
