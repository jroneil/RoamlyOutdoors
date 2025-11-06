import { FormEvent, useMemo, useState } from 'react';
import { useNearbyGroups } from '../../hooks/useNearbyGroups';
import type { NearbyGroup } from '../../services/nearbyGroupsService';

const sortGroups = (groups: NearbyGroup[], sort: NearbyGroupsSort): NearbyGroup[] => {
  const sorted = [...groups];

  switch (sort) {
    case 'popularity':
      return sorted.sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0));
    case 'activity':
      return sorted.sort((a, b) => (b.activityScore ?? 0) - (a.activityScore ?? 0));
    case 'distance':
    default:
      return sorted.sort((a, b) => {
        const distanceA = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.POSITIVE_INFINITY;
        const distanceB = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.POSITIVE_INFINITY;
        return distanceA - distanceB;
      });
  }
};

type NearbyGroupsSort = 'distance' | 'popularity' | 'activity';

type SortOption = {
  label: string;
  value: NearbyGroupsSort;
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Closest', value: 'distance' },
  { label: 'Most popular', value: 'popularity' },
  { label: 'Most active', value: 'activity' }
];

const GroupsNearYouSection = () => {
  const { status, groups, error, locationSummary, geolocationDenied, requestPostalSearch, retryGeolocation } =
    useNearbyGroups();
  const [sort, setSort] = useState<NearbyGroupsSort>('distance');
  const [postalCode, setPostalCode] = useState('');

  const sortedGroups = useMemo(() => sortGroups(groups, sort), [groups, sort]);
  const canUseGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const handlePostalSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    requestPostalSearch(postalCode);
  };

  const shouldShowPostalForm = status === 'needsPostal' || geolocationDenied;
  const isLoading = status === 'locating' || status === 'loading';

  return (
    <div className="groups-near-you">
      {status === 'locating' ? (
        <p className="groups-near-you__status">Looking up your location…</p>
      ) : null}
      {shouldShowPostalForm ? (
        <form className="groups-near-you__postal" onSubmit={handlePostalSubmit}>
          <label htmlFor="nearby-postal">
            <span>ZIP or postal code</span>
            <input
              id="nearby-postal"
              type="text"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="e.g. 98101"
              inputMode="text"
              autoComplete="postal-code"
            />
          </label>
          <div className="groups-near-you__postal-actions">
            <button type="submit" className="button primary" disabled={!postalCode.trim() || isLoading}>
              Search nearby groups
            </button>
            {canUseGeolocation ? (
              <button type="button" className="button link-button" onClick={retryGeolocation} disabled={isLoading}>
                Use my location
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      {isLoading ? <p className="groups-near-you__status">Loading nearby groups…</p> : null}

      {error && status !== 'locating' ? <p className="groups-near-you__error">{error}</p> : null}

      {locationSummary ? (
        <div className="groups-near-you__summary-row">
          <p className="groups-near-you__summary">Showing groups near {locationSummary}.</p>
          {canUseGeolocation ? (
            <button type="button" className="button link-button" onClick={retryGeolocation} disabled={isLoading}>
              Update location
            </button>
          ) : null}
        </div>
      ) : null}

      {sortedGroups.length ? (
        <>
          <div className="groups-near-you__controls" role="group" aria-label="Sort nearby groups">
            <label htmlFor="nearby-sort">Sort by</label>
            <select
              id="nearby-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as NearbyGroupsSort)}
              disabled={isLoading}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="groups-near-you__grid">
            {sortedGroups.map((group) => (
              <article key={group.id} className="nearby-group-card">
                {group.coverImageUrl ? (
                  <div className="nearby-group-card__image" style={{ backgroundImage: `url(${group.coverImageUrl})` }} />
                ) : null}
                <div className="nearby-group-card__body">
                  <div className="nearby-group-card__header">
                    <h3>{group.name}</h3>
                    {typeof group.distanceMiles === 'number' ? (
                      <span className="nearby-group-card__distance">{group.distanceMiles} mi away</span>
                    ) : null}
                  </div>
                  <p className="nearby-group-card__location">
                    {group.city}, {group.state}
                  </p>
                  <p className="nearby-group-card__members">{group.memberCount.toLocaleString()} members</p>
                  {group.activities?.length ? (
                    <p className="nearby-group-card__activities">{group.activities.join(' • ')}</p>
                  ) : null}
                  <div className="nearby-group-card__stats">
                    <span>⭐ Popularity {group.popularityScore}</span>
                    <span>🔥 Activity {group.activityScore}</span>
                    <span>📅 {group.upcomingEventsCount} upcoming events</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {!isLoading && !sortedGroups.length && status === 'ready' ? (
        <p className="groups-near-you__status">No groups found near your location yet. Try another search.</p>
      ) : null}
    </div>
  );
};

export default GroupsNearYouSection;
