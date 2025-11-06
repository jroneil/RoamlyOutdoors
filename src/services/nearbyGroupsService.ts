export type NearbyGroup = {
  id: string;
  name: string;
  city: string;
  state: string;
  memberCount: number;
  activities: string[];
  coverImageUrl?: string;
  distanceMiles?: number;
  popularityScore: number;
  activityScore: number;
  upcomingEventsCount: number;
};

export type NearbyGroupsResponse = {
  groups: NearbyGroup[];
};

export type FetchNearbyGroupsParams = {
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  limit?: number;
  radiusMiles?: number;
  signal?: AbortSignal;
};

const buildQueryString = (params: FetchNearbyGroupsParams) => {
  const searchParams = new URLSearchParams();

  if (typeof params.latitude === 'number') {
    searchParams.set('lat', params.latitude.toString());
  }
  if (typeof params.longitude === 'number') {
    searchParams.set('lng', params.longitude.toString());
  }
  if (params.postalCode) {
    searchParams.set('postalCode', params.postalCode);
  }
  if (typeof params.limit === 'number') {
    searchParams.set('limit', params.limit.toString());
  }
  if (typeof params.radiusMiles === 'number') {
    searchParams.set('radiusMiles', params.radiusMiles.toString());
  }

  return searchParams.toString();
};

export const fetchNearbyGroups = async (params: FetchNearbyGroupsParams): Promise<NearbyGroup[]> => {
  const queryString = buildQueryString(params);

  if (!queryString) {
    throw new Error('A location is required to look up nearby groups.');
  }

  const response = await fetch(`/api/groups/nearby?${queryString}`, {
    signal: params.signal
  });

  if (!response.ok) {
    let message = 'Unable to load nearby groups.';

    try {
      const payload: { error?: string } = await response.json();
      if (payload.error) {
        message = payload.error;
      }
    } catch (error) {
      // ignore JSON parsing issues and fall back to the default message
    }

    throw new Error(message);
  }

  const data: NearbyGroupsResponse = await response.json();
  return data.groups;
};
