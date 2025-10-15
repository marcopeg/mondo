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

export const requestGeolocation = async (): Promise<GeolocationFrontmatter> => {
  const position = await requestPosition();
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
