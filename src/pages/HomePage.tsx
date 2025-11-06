import { useMemo, useState } from 'react';
import HomeBanner from '../components/home/HomeBanner';
import HomeEventCard from '../components/home/HomeEventCard';
import HomeGroupCard from '../components/home/HomeGroupCard';
import HomeSection from '../components/home/HomeSection';
import GroupsNearYouSection from '../components/home/GroupsNearYouSection';
import HomeSearchFilters from '../components/home/HomeSearchFilters';
import { useHomeContent } from '../hooks/useHomeContent';

const HomePage = () => {
  const { banner, userEvents, userGroups, localGroups, isLoading, error } = useHomeContent();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasActiveFilters = Boolean(normalizedQuery) || selectedTags.length > 0;

  const matchesSearch = useMemo(
    () =>
      (fields: Array<string | undefined>) =>
        !normalizedQuery ||
        fields
          .filter((field): field is string => typeof field === 'string')
          .some((field) => field.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery]
  );

  const matchesTagFilter = useMemo(
    () =>
      (tags: string[]) =>
        selectedTags.length === 0 || tags.some((tag) => selectedTags.includes(tag)),
    [selectedTags]
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>(['hiking', 'climbing', 'paddling', 'mountaineering', 'trail-running', 'stewardship', 'campfire']);

    userGroups.forEach((group) => {
      group.activities?.forEach((activity) => tags.add(activity.toLowerCase()));
    });

    localGroups.forEach((group) => {
      group.activities?.forEach((activity) => tags.add(activity.toLowerCase()));
    });

    userEvents.forEach((event) => {
      event.tags?.forEach((tag) => tags.add(tag.toLowerCase()));
    });

    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [localGroups, userEvents, userGroups]);

  const filteredUserEvents = useMemo(
    () =>
      userEvents.filter((event) => {
        const tags = (event.tags ?? []).map((tag) => tag.toLowerCase());
        return matchesSearch([event.title, event.location, event.groupName, ...tags]) && matchesTagFilter(tags);
      }),
    [matchesSearch, matchesTagFilter, userEvents]
  );

  const filterGroups = useMemo(
    () =>
      <T extends { name: string; city: string; state: string; activities?: string[] }>(groups: T[]) =>
        groups.filter((group) => {
          const activityTags = (group.activities ?? []).map((activity) => activity.toLowerCase());
          return matchesSearch([group.name, group.city, group.state, ...activityTags]) && matchesTagFilter(activityTags);
        }),
    [matchesSearch, matchesTagFilter]
  );

  const filteredUserGroups = useMemo(() => filterGroups(userGroups), [filterGroups, userGroups]);
  const filteredLocalGroups = useMemo(() => filterGroups(localGroups), [filterGroups, localGroups]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((current) => current !== tag) : [...prev, tag]));
  };

  return (
    <div className="home-page container">
      {banner.title ? <HomeBanner banner={banner} /> : null}

      <HomeSearchFilters
        query={searchQuery}
        tags={availableTags}
        selectedTags={selectedTags}
        onQueryChange={setSearchQuery}
        onTagToggle={handleTagToggle}
      />

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
          ) : filteredUserEvents.length ? (
            <div className="home-grid home-grid--events">
              {filteredUserEvents.map((event) => (
                <HomeEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="home-empty">
              {hasActiveFilters
                ? 'No upcoming adventures match your filters. Try adjusting your search.'
                : 'No upcoming adventures yet. Start planning your next outing!'}
            </p>
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
          ) : filteredUserGroups.length ? (
            <div className="home-grid">
              {filteredUserGroups.map((group) => (
                <HomeGroupCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <p className="home-empty">
              {hasActiveFilters
                ? 'No groups match your filters. Try broadening your search to see more of your crews.'
                : "You&apos;re not linked to any groups yet. Create one or ask an organizer to add you."}
            </p>
          )}
        </HomeSection>

        <HomeSection
          title="Local crews to check out"
          description="Discover nearby communities organizing adventures that match your interests."
        >
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
            <p className="home-empty">
              {hasActiveFilters
                ? 'No local groups match your filters. Try different tags or search terms.'
                : 'We do not have local group recommendations just yet. Check back soon!'}
            </p>
          )}
        </HomeSection>

        <HomeSection
          title="Groups Near You"
          description="Share your location or search by postal code to discover crews organizing adventures nearby."
        >
          <GroupsNearYouSection />
        </HomeSection>
      </div>
    </div>
  );
};

export default HomePage;
