import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchNearbyGroups, type NearbyGroup } from '../services/nearbyGroupsService';

type NearbyGroupsStatus = 'idle' | 'locating' | 'needsPostal' | 'loading' | 'ready' | 'error';

type LocationRequest =
  | { type: 'geolocation'; latitude: number; longitude: number }
  | { type: 'postal'; postalCode: string };

type NearbyGroupsHook = {
  status: NearbyGroupsStatus;
  groups: NearbyGroup[];
  error: string | null;
  locationSummary: string | null;
  geolocationDenied: boolean;
  requestPostalSearch: (postalCode: string) => void;
  retryGeolocation: () => void;
};

const useIsMounted = () => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
};

const normalizePostalCode = (postalCode: string) => postalCode.trim().toUpperCase();
const canUseGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export const useNearbyGroups = (): NearbyGroupsHook => {
  const [status, setStatus] = useState<NearbyGroupsStatus>('idle');
  const [groups, setGroups] = useState<NearbyGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationSummary, setLocationSummary] = useState<string | null>(null);
  const [geolocationDenied, setGeolocationDenied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useIsMounted();

  const cancelInFlightRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const runRequest = useCallback(
    async (request: LocationRequest) => {
      const controller = new AbortController();
      cancelInFlightRequest();
      abortControllerRef.current = controller;

      if (isMountedRef.current) {
        setStatus('loading');
        setError(null);
      }

      const queryParams =
        request.type === 'geolocation'
          ? { latitude: request.latitude, longitude: request.longitude }
          : { postalCode: normalizePostalCode(request.postalCode) };

      const requestSummary =
        request.type === 'geolocation'
          ? 'your current location'
          : `postal code ${normalizePostalCode(request.postalCode)}`;

      try {
        const result = await fetchNearbyGroups({ ...queryParams, signal: controller.signal });

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        setGroups(result);
        setLocationSummary(result.length ? requestSummary : null);
        setStatus('ready');
      } catch (fetchError) {
        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        setGroups([]);
        setStatus('error');
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load nearby groups right now. Please try again.'
        );
      }
    },
    [cancelInFlightRequest, isMountedRef]
  );

  useEffect(() => {
    if (!canUseGeolocation()) {
      setStatus('needsPostal');
      return;
    }

    setStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocationDenied(false);
        runRequest({
          type: 'geolocation',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (geoError) => {
        if (!isMountedRef.current) {
          return;
        }

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setGeolocationDenied(true);
        } else {
          setError('We could not determine your location. Enter a ZIP or postal code instead.');
        }

        setStatus('needsPostal');
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 12000
      }
    );

    return () => {
      cancelInFlightRequest();
    };
  }, [cancelInFlightRequest, isMountedRef, runRequest]);

  const requestPostalSearch = useCallback(
    (postalCode: string) => {
      if (!postalCode.trim()) {
        setError('Enter a ZIP or postal code to search for nearby groups.');
        setStatus('needsPostal');
        return;
      }

      runRequest({ type: 'postal', postalCode });
    },
    [runRequest]
  );

  const retryGeolocation = useCallback(() => {
    if (!canUseGeolocation()) {
      setStatus('needsPostal');
      setGeolocationDenied(true);
      return;
    }

    setStatus('locating');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeolocationDenied(false);
        runRequest({
          type: 'geolocation',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setGeolocationDenied(true);
        } else {
          setError('We could not determine your location. Enter a ZIP or postal code instead.');
        }
        setStatus('needsPostal');
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 12000
      }
    );
  }, [runRequest]);

  const memoizedGroups = useMemo(() => groups, [groups]);

  return {
    status,
    groups: memoizedGroups,
    error,
    locationSummary,
    geolocationDenied,
    requestPostalSearch,
    retryGeolocation
  };
};
