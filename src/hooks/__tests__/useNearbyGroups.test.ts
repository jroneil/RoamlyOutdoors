import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ReactHookDeps } from '../createNearbyGroupsHook';
import type {
  NearbyGroup,
  FetchNearbyGroupsParams
} from '../../services/nearbyGroupsService';

type StateUpdater<T> = (value: T | ((prev: T) => T)) => void;

const depsChanged = (prev?: unknown[], next?: unknown[]): boolean => {
  if (!prev || !next) {
    return true;
  }
  if (prev.length !== next.length) {
    return true;
  }
  return prev.some((value, index) => !Object.is(value, next[index]));
};

const createReactTestRuntime = () => {
  const states: unknown[] = [];
  const refs: Array<{ current: unknown }> = [];
  const memos: Array<{ deps?: unknown[]; value: unknown }> = [];
  const callbacks: Array<{ deps?: unknown[]; value: unknown }> = [];
  const effects: Array<{ deps?: unknown[]; effect: () => void; cleanup?: () => void }> = [];

  let stateCursor = 0;
  let refCursor = 0;
  let memoCursor = 0;
  let callbackCursor = 0;
  let effectCursor = 0;
  let renderCallback: (() => void) | null = null;
  let isRendering = false;
  let hasRendered = false;
  let renderScheduled = false;
  let pendingEffects: number[] = [];

  const resetCursors = () => {
    stateCursor = 0;
    refCursor = 0;
    memoCursor = 0;
    callbackCursor = 0;
    effectCursor = 0;
  };

  const flushEffects = async () => {
    const indices = pendingEffects.splice(0);
    for (const index of indices) {
      const record = effects[index];
      if (!record) {
        continue;
      }

      if (typeof record.cleanup === 'function') {
        try {
          record.cleanup();
        } catch (error) {
          console.warn('Effect cleanup threw an error', error);
        }
      }

      record.cleanup = record.effect() ?? undefined;
    }
  };

  const runRender = async () => {
    if (!renderCallback) {
      throw new Error('No render callback registered');
    }

    resetCursors();
    isRendering = true;
    renderCallback();
    isRendering = false;
    hasRendered = true;
    await flushEffects();
  };

  const scheduleRender = () => {
    if (renderScheduled) {
      return;
    }
    renderScheduled = true;
    queueMicrotask(async () => {
      renderScheduled = false;
      await runRender();
    });
  };

  const useStateImpl = <T,>(initial: T | (() => T)): [T, StateUpdater<T>] => {
    if (!isRendering) {
      throw new Error('useState must be called during render');
    }

    const index = stateCursor++;

    if (!hasRendered || !(index in states)) {
      states[index] = typeof initial === 'function' ? (initial as () => T)() : initial;
    }

    const setState: StateUpdater<T> = (value) => {
      const current = states[index] as T;
      const next = typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
      if (Object.is(current, next)) {
        return;
      }
      states[index] = next;
      scheduleRender();
    };

    return [states[index] as T, setState];
  };

  const useRefImpl = <T,>(initial: T) => {
    if (!isRendering) {
      throw new Error('useRef must be called during render');
    }

    const index = refCursor++;
    if (!refs[index]) {
      refs[index] = { current: initial };
    }
    return refs[index] as { current: T };
  };

  const useMemoImpl = <T,>(factory: () => T, deps?: unknown[]) => {
    if (!isRendering) {
      throw new Error('useMemo must be called during render');
    }

    const index = memoCursor++;
    const record = memos[index];
    if (!record || depsChanged(record.deps, deps)) {
      memos[index] = { value: factory(), deps: deps ? [...deps] : undefined };
    }
    return memos[index].value as T;
  };

  const useCallbackImpl = <T extends (...args: unknown[]) => unknown>(
    callback: T,
    deps?: unknown[]
  ) => {
    if (!isRendering) {
      throw new Error('useCallback must be called during render');
    }

    const index = callbackCursor++;
    const record = callbacks[index];
    if (!record || depsChanged(record.deps, deps)) {
      callbacks[index] = { value: callback, deps: deps ? [...deps] : undefined };
    }
    return callbacks[index].value as T;
  };

  const useEffectImpl = (effect: () => void | (() => void), deps?: unknown[]) => {
    if (!isRendering) {
      throw new Error('useEffect must be called during render');
    }

    const index = effectCursor++;
    const record = effects[index];
    if (!record) {
      effects[index] = { effect: effect as () => void, deps: deps ? [...deps] : undefined };
      pendingEffects.push(index);
      return;
    }

    effects[index] = { ...record, effect: effect as () => void, deps: deps ? [...deps] : undefined };
    if (depsChanged(record.deps, deps)) {
      pendingEffects.push(index);
    }
  };

  const waitFor = async (predicate: () => boolean, timeoutMs = 2000) => {
    const start = Date.now();

    while (true) {
      await flushPending();
      if (predicate()) {
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        throw new Error('waitFor timed out');
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  const flushPending = async () => {
    if (renderScheduled) {
      renderScheduled = false;
      await runRender();
    }
    if (pendingEffects.length) {
      await flushEffects();
    }
  };

  const act = async (callback: () => void | Promise<void>) => {
    await callback();
    await flushPending();
  };

  const render = async (callback: () => void) => {
    renderCallback = callback;
    await runRender();
  };

  const cleanup = () => {
    effects.forEach((record) => {
      if (record?.cleanup) {
        try {
          record.cleanup();
        } catch (error) {
          console.warn('Effect cleanup threw an error during teardown', error);
        }
      }
    });
  };

  return {
    react: {
      useState: useStateImpl,
      useEffect: useEffectImpl,
      useMemo: useMemoImpl,
      useCallback: useCallbackImpl,
      useRef: useRefImpl
    } satisfies ReactHookDeps,
    render,
    waitFor,
    act,
    cleanup
  };
};

type StubFetch = (params: FetchNearbyGroupsParams) => Promise<NearbyGroup[]>;

let nearbyGroupsModulePromise: Promise<typeof import('../createNearbyGroupsHook.js')> | null = null;

const loadNearbyGroupsModule = async () => {
  if (!nearbyGroupsModulePromise) {
    const nodeTestModule: unknown = await import('node:test');
    const mockModule = (nodeTestModule as { mock?: { module?: (specifier: string, factory: () => unknown) => void } }).mock;
    mockModule?.module?.('react', () => ({
      useState: () => {
        throw new Error('react hook stubs should not be invoked in tests.');
      },
      useEffect: () => {
        throw new Error('react hook stubs should not be invoked in tests.');
      },
      useMemo: () => {
        throw new Error('react hook stubs should not be invoked in tests.');
      },
      useCallback: () => {
        throw new Error('react hook stubs should not be invoked in tests.');
      },
      useRef: () => {
        throw new Error('react hook stubs should not be invoked in tests.');
      }
    }));

    const serviceModuleUrl = new URL('../services/nearbyGroupsService.js', import.meta.url).href;
    const serviceModuleBareUrl = new URL('../services/nearbyGroupsService', import.meta.url).href;

    const nearbyGroupsStub = () => ({
      fetchNearbyGroups: () => {
        throw new Error('fetchNearbyGroups should be provided via fetchNearbyGroupsImpl in tests.');
      }
    });

    mockModule?.module?.('../services/nearbyGroupsService', nearbyGroupsStub);
    mockModule?.module?.('../services/nearbyGroupsService.js', nearbyGroupsStub);
    mockModule?.module?.(serviceModuleUrl, nearbyGroupsStub);
    mockModule?.module?.(serviceModuleBareUrl, nearbyGroupsStub);

    nearbyGroupsModulePromise = import('../createNearbyGroupsHook.js');
  }

  return nearbyGroupsModulePromise;
};

const createHookHarness = async ({ fetchNearbyGroupsImpl }: { fetchNearbyGroupsImpl: StubFetch }) => {
  const { createNearbyGroupsHook } = await loadNearbyGroupsModule();
  const runtime = createReactTestRuntime();
  const useHook = createNearbyGroupsHook({
    ...runtime.react,
    fetchNearbyGroupsImpl
  });

  let latest: ReturnType<typeof useHook> | null = null;

  const render = async () => {
    await runtime.render(() => {
      latest = useHook();
    });
  };

  const getResult = () => {
    if (!latest) {
      throw new Error('Hook has not been rendered yet');
    }
    return latest;
  };

  return {
    render,
    getResult,
    waitFor: runtime.waitFor,
    act: runtime.act,
    cleanup: runtime.cleanup
  };
};

const setNavigator = (value: Partial<Navigator>) => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  });
};

const restoreNavigator = (original: Navigator | undefined) => {
  if (typeof original === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { navigator?: Navigator }).navigator;
    return;
  }

  setNavigator(original);
};

describe('useNearbyGroups', () => {
  it('loads groups with geolocation when permission is granted', async () => {
    const groups: NearbyGroup[] = [
      {
        id: 'group-1',
        name: 'Summit Crew',
        city: 'Seattle',
        state: 'WA',
        memberCount: 42,
        activities: ['hiking'],
        popularityScore: 10,
        activityScore: 8,
        upcomingEventsCount: 2,
        distanceMiles: 4
      }
    ];

    let fetchParams: FetchNearbyGroupsParams | null = null;
    const harness = await createHookHarness({
      fetchNearbyGroupsImpl: async (params) => {
        fetchParams = params;
        return groups;
      }
    });

    const originalNavigator = (globalThis as { navigator?: Navigator }).navigator;
    const geolocation: Geolocation = {
      getCurrentPosition: (success) => {
        success({
          coords: { latitude: 47.6, longitude: -122.3 } as GeolocationCoordinates,
          timestamp: Date.now()
        } as GeolocationPosition);
      },
      watchPosition: () => 0,
      clearWatch: () => undefined
    };
    setNavigator({ geolocation } as Navigator);

    await harness.render();

    await harness.waitFor(() => harness.getResult().status === 'ready');

    const result = harness.getResult();
    assert.equal(result.error, null);
    assert.equal(result.locationSummary, 'your current location');
    assert.deepEqual(result.groups, groups);
    if (!fetchParams) {
      throw new Error('fetch params missing');
    }
    const geoParams = fetchParams as Required<Pick<FetchNearbyGroupsParams, 'latitude' | 'longitude'>> & {
      signal?: AbortSignal;
    };
    assert.equal(geoParams.latitude, 47.6);
    assert.equal(geoParams.longitude, -122.3);
    assert.equal(typeof geoParams.signal, 'object');

    harness.cleanup();
    restoreNavigator(originalNavigator);
  });

  it('surfaces postal mode when geolocation is denied', async () => {
    const harness = await createHookHarness({
      fetchNearbyGroupsImpl: async () => []
    });

    const originalNavigator = (globalThis as { navigator?: Navigator }).navigator;
    const geolocation: Geolocation = {
      getCurrentPosition: (_success, failure) => {
        if (failure) {
          failure({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
            message: 'denied'
          } as GeolocationPositionError);
        }
      },
      watchPosition: () => 0,
      clearWatch: () => undefined
    };
    setNavigator({ geolocation } as Navigator);

    await harness.render();
    await harness.waitFor(() => harness.getResult().status === 'needsPostal');

    const result = harness.getResult();
    assert.equal(result.geolocationDenied, true);
    assert.equal(result.error, null);

    harness.cleanup();
    restoreNavigator(originalNavigator);
  });

  it('executes a postal lookup on demand', async () => {
    const groups: NearbyGroup[] = [
      {
        id: 'group-2',
        name: 'River Guides',
        city: 'Tacoma',
        state: 'WA',
        memberCount: 30,
        activities: ['paddling'],
        popularityScore: 8,
        activityScore: 7,
        upcomingEventsCount: 1,
        distanceMiles: 12
      }
    ];

    let fetchParams: FetchNearbyGroupsParams | null = null;
    const harness = await createHookHarness({
      fetchNearbyGroupsImpl: async (params) => {
        fetchParams = params;
        return groups;
      }
    });

    const originalNavigator = (globalThis as { navigator?: Navigator }).navigator;
    setNavigator({} as Navigator);

    await harness.render();

    assert.equal(harness.getResult().status, 'needsPostal');

    await harness.act(async () => {
      harness.getResult().requestPostalSearch(' 98101 ');
    });

    await harness.waitFor(() => harness.getResult().status === 'ready');

    const result = harness.getResult();
    assert.equal(result.locationSummary, 'postal code 98101');
    assert.deepEqual(result.groups, groups);
    if (!fetchParams) {
      throw new Error('postal fetch params missing');
    }
    const postalParams = fetchParams as Required<Pick<FetchNearbyGroupsParams, 'postalCode'>> & {
      signal?: AbortSignal;
    };
    assert.equal(postalParams.postalCode, '98101');
    assert.equal(typeof postalParams.signal, 'object');

    harness.cleanup();
    restoreNavigator(originalNavigator);
  });

  it('cancels an in-flight request when a new lookup starts', async () => {
    let firstAbort: AbortSignal | null = null;
    let callCount = 0;

    const harness = await createHookHarness({
      fetchNearbyGroupsImpl: (params) => {
        callCount += 1;
        if (!firstAbort) {
          firstAbort = params.signal as AbortSignal;
          return new Promise<NearbyGroup[]>((_, reject) => {
            firstAbort?.addEventListener('abort', () => {
              reject(new Error('aborted'));
            });
          });
        }
        return Promise.resolve([]);
      }
    });

    const originalNavigator = (globalThis as { navigator?: Navigator }).navigator;
    const geolocation: Geolocation = {
      getCurrentPosition: (success) => {
        success({
          coords: { latitude: 47.61, longitude: -122.33 } as GeolocationCoordinates,
          timestamp: Date.now()
        } as GeolocationPosition);
      },
      watchPosition: () => 0,
      clearWatch: () => undefined
    };
    setNavigator({ geolocation } as Navigator);

    await harness.render();
    await harness.waitFor(() => harness.getResult().status === 'loading');

    await harness.act(async () => {
      harness.getResult().requestPostalSearch('98101');
    });

    if (!firstAbort) {
      throw new Error('expected abort signal');
    }
    const abortSignal = firstAbort as AbortSignal;
    assert.equal(abortSignal.aborted, true);

    await harness.waitFor(() => harness.getResult().status === 'ready');
    assert.equal(callCount, 2);

    harness.cleanup();
    restoreNavigator(originalNavigator);
  });
});
