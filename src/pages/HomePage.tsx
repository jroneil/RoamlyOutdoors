import { useMemo, useState } from 'react';
import CreateEventForm from '../components/CreateEventForm';
import CreateGroupForm from '../components/CreateGroupForm';
import EventFilters from '../components/EventFilters';
import EventList from '../components/EventList';
import GroupList from '../components/GroupList';
import { useEvents } from '../hooks/useEvents';
import { useGroups } from '../hooks/useGroups';

const HomePage = () => {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  const { events, isLoading, error, total, tags: availableTags, allEvents } = useEvents({
    search,
    tag,
    filter
  });
  const {
    groups,
    isLoading: isLoadingGroups,
    error: groupsError
  } = useGroups();

  const highlightedTags = useMemo(() => availableTags.slice(0, 6), [availableTags]);
  const groupMap = useMemo(
    () => Object.fromEntries(groups.map((group) => [group.id, group])),
    [groups]
  );
  const eventCountByGroup = useMemo(() => {
    return allEvents.reduce<Record<string, number>>((acc, event) => {
      if (!event.groupId) return acc;
      acc[event.groupId] = (acc[event.groupId] ?? 0) + 1;
      return acc;
    }, {});
  }, [allEvents]);

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

      <GroupList
        groups={groups}
        isLoading={isLoadingGroups}
        error={groupsError}
        eventCountByGroup={eventCountByGroup}
      />

      <CreateGroupForm />

      <EventFilters
        search={search}
        tag={tag}
        filter={filter}
        availableTags={highlightedTags}
        onSearchChange={setSearch}
        onTagChange={setTag}
        onFilterChange={setFilter}
      />

      <EventList
        events={events}
        isLoading={isLoading}
        error={error}
        total={total}
        groupsById={groupMap}
      />

      <CreateEventForm
        groups={groups}
        isLoadingGroups={isLoadingGroups}
        groupsError={groupsError}
      />
    </div>
  );
};

export default HomePage;
