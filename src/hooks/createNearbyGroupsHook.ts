import type {
  NearbyGroup,
  FetchNearbyGroupsParams,
  NearbyGroupsApiResponse
} from '../services/nearbyGroupsService.js';
import { fetchNearbyGroups } from '../services/nearbyGroupsService.js';

export type NearbyGroupsStatus = 'idle' | 'locating' | 'needsPostal' | 'loading' | 'ready' | 'error';

type LocationRequest =
  | { type: 'geolocation'; latitude: number; longitude: number }
  | { type: 'postal'; postalCode: string };

export type NearbyGroupsHook = {
  status: NearbyGroupsStatus;
  groups: NearbyGroup[];
  error: string | null;
  locationSummary: string | null;
  geolocationDenied: boolean;
  requestPostalSearch: (postalCode: string) => void;
  retryGeolocation: () => void;
};

const normalizePostalCode = (postalCode: string) => postalCode.trim().toUpperCase();
const canUseGeolocation = () => typeof navigator !== 'undefined' && 'geolocation' in navigator;

export type ReactHookDeps = {
  useState: <S>(initial: S | (() => S)) => [S, (value: S | ((prev: S) => S)) => void];
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  useMemo: <T>(factory: () => T, deps?: unknown[]) => T;
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps?: unknown[]) => T;
  useRef: <T>(initial: T) => { current: T };
};

export const createNearbyGroupsHook = ({
  useState: useStateImpl,
  useEffect: useEffectImpl,
  useMemo: useMemoImpl,
  useCallback: useCallbackImpl,
  useRef: useRefImpl,
  fetchNearbyGroupsImpl = fetchNearbyGroups
}: ReactHookDeps & {
  fetchNearbyGroupsImpl?: (params: FetchNearbyGroupsParams) => Promise<NearbyGroupsApiResponse>;
}) => (): NearbyGroupsHook => {
  const [status, setStatus] = useStateImpl<NearbyGroupsStatus>('idle');
  const [groups, setGroups] = useStateImpl<NearbyGroup[]>([]);
  const [error, setError] = useStateImpl<string | null>(null);
  const [locationSummary, setLocationSummary] = useStateImpl<string | null>(null);
  const [geolocationDenied, setGeolocationDenied] = useStateImpl(false);
  const abortControllerRef = useRefImpl<AbortController | null>(null);
  const isMountedRef = useIsMounted(useRefImpl, useEffectImpl);

  const cancelInFlightRequest = useCallbackImpl<() => void>(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const runRequest = useCallbackImpl<
    (request: LocationRequest) => Promise<void>
  >(
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
        const response = await fetchNearbyGroupsImpl({ ...queryParams, signal: controller.signal });
        const resultGroups = Array.isArray(response.groups) ? response.groups : [];

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        setGroups(resultGroups);
        setLocationSummary(resultGroups.length ? requestSummary : null);
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

  useEffectImpl(() => {
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

  const requestPostalSearch = useCallbackImpl<
    (postalCode: string) => void
  >(
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

  const retryGeolocation = useCallbackImpl<() => void>(() => {
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

  const memoizedGroups = useMemoImpl(() => groups, [groups]);

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

const useIsMounted = (
  useRefImpl: ReactHookDeps['useRef'],
  useEffectImpl: ReactHookDeps['useEffect']
) => {
  const isMountedRef = useRefImpl(true);

  useEffectImpl(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
};
