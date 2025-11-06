import { useEffect, useMemo, useState } from 'react';
import HomeBanner from '../components/home/HomeBanner';
import HomeEventCard from '../components/home/HomeEventCard';
import HomeGroupCard from '../components/home/HomeGroupCard';
import HomeSection from '../components/home/HomeSection';
import { useHomeContent } from '../hooks/useHomeContent';

const HomePage = () => {
  const { banner, userEvents, userGroups, localGroups, filters, isLoading, error } = useHomeContent();
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState('any');
  const [distance, setDistance] = useState('25');

  useEffect(() => {
    if (filters.activities.length && !filters.activities.some((option) => option.value === activity)) {
      setActivity(filters.activities[0].value);
    }
  }, [filters.activities, activity]);

  useEffect(() => {
    if (filters.distance.length && !filters.distance.some((option) => option.value === distance)) {
      setDistance(filters.distance[0].value);
    }
  }, [filters.distance, distance]);

  const filteredLocalGroups = useMemo(() => {
    const maxDistance = distance === 'state' ? Infinity : Number(distance);

    return localGroups.filter((group) => {
      const matchesSearch = search
        ? group.name.toLowerCase().includes(search.toLowerCase()) ||
          [group.city, group.state].join(', ').toLowerCase().includes(search.toLowerCase())
        : true;

      const matchesActivity =
        activity === 'any' || !group.activities?.length
          ? true
          : group.activities?.some((item) => item === activity);

      const matchesDistance =
        Number.isFinite(maxDistance) && typeof group.distanceMiles === 'number'
          ? group.distanceMiles <= maxDistance
          : true;

      return matchesSearch && matchesActivity && matchesDistance;
    });
  }, [activity, distance, localGroups, search]);

  return (
    <div className="home-page container">
      {banner.title ? <HomeBanner banner={banner} /> : null}

      <div className="home-page__sections">
        <HomeSection
          title="Upcoming adventures"
          description="Keep tabs on the events your crews are organizing and jump in when you have space."
          action={<a href="/events" className="home-section__link">See all events</a>}
        >
          {isLoading ? (
            <p className="home-loading">Loading upcoming events…</p>
          ) : error ? (
            <p className="home-error">{error}</p>
          ) : userEvents.length ? (
            <div className="home-grid home-grid--events">
              {userEvents.map((event) => (
                <HomeEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="home-empty">No upcoming adventures yet. Start planning your next outing!</p>
          )}
        </HomeSection>

        <HomeSection
          title="Your groups"
          description="Shortcuts to the communities you help manage."
          action={<a href="/organizer" className="home-section__link">Manage groups</a>}
        >
          {isLoading ? (
            <p className="home-loading">Loading your groups…</p>
          ) : error ? (
            <p className="home-error">{error}</p>
          ) : userGroups.length ? (
            <div className="home-grid">
              {userGroups.map((group) => (
                <HomeGroupCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <p className="home-empty">
              You&apos;re not linked to any groups yet. Create one or ask an organizer to add you.
            </p>
          )}
        </HomeSection>

        <HomeSection
          title="Find something nearby"
          description="Search local groups to join or collaborate with when you have extra capacity."
        >
          <form className="home-filters" onSubmit={(event) => event.preventDefault()}>
            <label className="home-filters__field">
              <span>Search</span>
              <input
                type="search"
                placeholder="Search by name or city"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="home-filters__field">
              <span>Activity</span>
              <select value={activity} onChange={(event) => setActivity(event.target.value)}>
                {filters.activities.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="home-filters__field">
              <span>Within</span>
              <select value={distance} onChange={(event) => setDistance(event.target.value)}>
                {filters.distance.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </form>

          {isLoading ? (
            <p className="home-loading">Loading local groups…</p>
          ) : error ? (
            <p className="home-error">{error}</p>
          ) : filteredLocalGroups.length ? (
            <div className="home-grid">
              {filteredLocalGroups.map((group) => (
                <HomeGroupCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <p className="home-empty">No groups match your filters yet. Try broadening your search.</p>
          )}
        </HomeSection>
      </div>
    </div>
  );
};

export default HomePage;
