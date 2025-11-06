import { useEffect, useMemo, useState } from 'react';
import {
  fetchLocalDirectories,
  type LocalDirectoryEntry,
  type LocalDirectoryFilters
} from '../services/dashboardContentService';

interface LocalDirectoryState {
  entries: LocalDirectoryEntry[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LocalDirectoryState = {
  entries: [],
  isLoading: false,
  error: null
};

const serializeFilters = (filters: LocalDirectoryFilters | undefined) =>
  JSON.stringify(filters ?? {});

const useLocalDirectories = (filters?: LocalDirectoryFilters) => {
  const [state, setState] = useState<LocalDirectoryState>(initialState);
  const serializedFilters = useMemo(() => serializeFilters(filters), [filters]);
  const memoizedFilters = useMemo<LocalDirectoryFilters>(() => {
    if (!filters) {
      return {};
    }
    return { ...filters };
  }, [serializedFilters]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const entries = await fetchLocalDirectories(memoizedFilters);
        if (!cancelled) {
          setState({ entries, isLoading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            entries: [],
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load local directory resources. Please try again later.'
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [memoizedFilters, serializedFilters]);

  return state;
};

export default useLocalDirectories;

