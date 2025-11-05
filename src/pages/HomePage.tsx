import { useMemo, useState } from 'react';
import CreateEventForm from '../components/CreateEventForm';
import EventFilters from '../components/EventFilters';
import EventList from '../components/EventList';
import { useEvents } from '../hooks/useEvents';

const HomePage = () => {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const { events, isLoading, error, total, tags: availableTags } = useEvents({
    search,
    tag,
    filter
  });

  const highlightedTags = useMemo(() => availableTags.slice(0, 6), [availableTags]);

  return (
    <div className="grid" style={{ gap: '2.5rem' }}>
      <section className="hero">
        <div className="grid" style={{ gap: '1.75rem' }}>
          <div>
            <h1>Plan unforgettable outdoor meetups</h1>
            <p>
              Roamly Outdoors helps you rally hikers, climbers and paddlers. Organize routes,
              manage RSVPs and keep your crew in the loop — all powered by Firebase.
            </p>
          </div>
          <div className="hero-actions">
            <a className="tag" href="#create">
              + Host an adventure
            </a>
            <a
              className="tag light"
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Open Firebase console
            </a>
          </div>
        </div>
      </section>

      <EventFilters
        search={search}
        tag={tag}
        filter={filter}
        availableTags={highlightedTags}
        onSearchChange={setSearch}
        onTagChange={setTag}
        onFilterChange={setFilter}
      />

      <EventList events={events} isLoading={isLoading} error={error} total={total} />

      <CreateEventForm />
    </div>
  );
};

export default HomePage;
