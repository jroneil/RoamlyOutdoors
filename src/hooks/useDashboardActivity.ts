import { useEffect, useState } from 'react';
import {
  fetchDashboardActivity,
  type DashboardEventSummary,
  type DashboardGroupSummary
} from '../services/dashboardContentService';

interface DashboardActivityState {
  groups: DashboardGroupSummary[];
  events: DashboardEventSummary[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DashboardActivityState = {
  groups: [],
  events: [],
  isLoading: false,
  error: null
};

const useDashboardActivity = (userId: string | null | undefined) => {
  const [state, setState] = useState<DashboardActivityState>(initialState);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetchDashboardActivity(userId);
        if (!cancelled) {
          setState({ ...response, isLoading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            groups: [],
            events: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unexpected error loading activity'
          });
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return state;
};

export default useDashboardActivity;
