const createNotImplemented = (name: string) => () => {
  throw new Error(`react test stub: ${name} is not implemented.`);
};

export function useState<S>(initial: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void] {
  return [
    typeof initial === 'function' ? (initial as () => S)() : initial,
    createNotImplemented('useState setter')
  ];
}

export function useEffect(effect: () => void | (() => void), _deps?: unknown[]): void {
  const cleanup = effect();
  if (typeof cleanup === 'function') {
    cleanup();
  }
}

export function useMemo<T>(factory: () => T, _deps?: unknown[]): T {
  return factory();
}

export function useCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  _deps?: unknown[]
): T {
  return callback;
}

export function useRef<T>(initialValue: T): { current: T } {
  return { current: initialValue };
}
