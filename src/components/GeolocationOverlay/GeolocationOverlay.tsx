import { useEffect, useRef } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { requestGeolocation } from "@/utils/geolocation";

type GeolocationOverlayProps = {
  isOpen: boolean;
  onSuccess: (data: any) => void;
  onError: (error: Error) => void;
  onClose: () => void;
};

export const GeolocationOverlay: React.FC<GeolocationOverlayProps> = ({
  isOpen,
  onSuccess,
  onError,
  onClose,
}) => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const startGeolocation = async () => {
      try {
        abortControllerRef.current = new AbortController();
        const data = await requestGeolocation(
          abortControllerRef.current.signal
        );

        if (mountedRef.current) {
          onSuccess(data);
          onClose();
        }
      } catch (error) {
        if (mountedRef.current) {
          const err = error instanceof Error ? error : new Error(String(error));
          // Only call onError if it's not a cancellation
          if (err.message !== "Geolocation request cancelled.") {
            onError(err);
          }
          onClose();
        }
      }
    };

    startGeolocation();
  }, [isOpen, onSuccess, onError, onClose]);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <LoadingScreen
      text="Getting your location..."
      icon="map-pin"
      onCancel={handleCancel}
    />
  );
};
