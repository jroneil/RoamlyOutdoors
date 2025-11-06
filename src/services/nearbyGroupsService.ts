export type NearbyGroup = {
  id: string;
  name: string;
  city: string;
  state: string;
  memberCount: number;
  activities: string[];
  coverImageUrl?: string;
  distanceMiles?: number;
  distanceMeters?: number;
  popularityScore: number;
  activityScore: number;
  upcomingEventsCount: number;
  postalCode?: string;
  country?: string;
};

export type NearbyGroupsApiResponse = {
  groups: NearbyGroup[];
  center?: { lat: number; lng: number };
  radius?: number;
  units?: 'mi' | 'km';
  page?: number;
  pageSize?: number;
  totalResults?: number;
  radiusMeters?: number;
};

export type FetchNearbyGroupsParams = {
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  limit?: number;
  radiusMiles?: number;
  radius?: number;
  units?: 'mi' | 'km';
  country?: string;
  page?: number;
  pageSize?: number;
  exactPostalCode?: boolean;
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
  if (typeof params.radius === 'number') {
    searchParams.set('radius', params.radius.toString());
  }
  if (params.units) {
    searchParams.set('units', params.units);
  }
  if (params.country) {
    searchParams.set('country', params.country);
  }
  if (typeof params.page === 'number') {
    searchParams.set('page', params.page.toString());
  }
  if (typeof params.pageSize === 'number') {
    searchParams.set('pageSize', params.pageSize.toString());
  }
  if (typeof params.exactPostalCode === 'boolean') {
    searchParams.set('exactPostalCode', params.exactPostalCode ? 'true' : 'false');
  }

  return searchParams.toString();
};

export const fetchNearbyGroups = async (
  params: FetchNearbyGroupsParams
): Promise<NearbyGroupsApiResponse> => {
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

  const data: NearbyGroupsApiResponse = await response.json();
  return {
    groups: data.groups ?? [],
    center: data.center,
    radius: data.radius,
    units: data.units,
    page: data.page,
    pageSize: data.pageSize,
    totalResults: data.totalResults,
    radiusMeters: data.radiusMeters
  };
};
