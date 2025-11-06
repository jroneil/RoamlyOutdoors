import { useEffect, useMemo, useState } from 'react';
import { fetchHomeContent, type HomeContentResponse } from '../services/homeContentService';

type HomeContentState = HomeContentResponse & {
  isLoading: boolean;
  error: string | null;
};

const defaultState: HomeContentState = {
  banner: {
    title: '',
    subtitle: '',
    ctaLabel: '',
    ctaHref: '',
    stats: []
  },
  userEvents: [],
  userGroups: [],
  localGroups: [],
  filters: {
    activities: [],
    distance: []
  },
  isLoading: true,
  error: null
};

export const useHomeContent = () => {
  const [state, setState] = useState<HomeContentState>(defaultState);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const content = await fetchHomeContent();

        if (!isMounted) {
          return;
        }

        setState({ ...content, isLoading: false, error: null });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to load home content'
        }));
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const memoizedState = useMemo(() => state, [state]);

  return memoizedState;
};
