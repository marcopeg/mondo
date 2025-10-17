import { useState, useRef } from "react";
import { requestGeolocation } from "@/utils/geolocation";

type UseGeolocationOptions = {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
};

export const useGeolocation = (options?: UseGeolocationOptions) => {
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const requestGeoLocation = async () => {
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    try {
      const data = await requestGeolocation(abortControllerRef.current.signal);
      setIsLoading(false);
      options?.onSuccess?.(data);
      return data;
    } catch (error) {
      setIsLoading(false);
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onError?.(err);
      throw err;
    }
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    requestGeoLocation,
    cancel,
  };
};
