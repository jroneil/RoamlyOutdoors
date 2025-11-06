import { useMemo } from 'react';
import HomeBanner from '../components/home/HomeBanner';
import HomeEventCard from '../components/home/HomeEventCard';
import HomeGroupCard from '../components/home/HomeGroupCard';
import HomeSection from '../components/home/HomeSection';
import GroupsNearYouSection from '../components/home/GroupsNearYouSection';
import { useHomeContent } from '../hooks/useHomeContent';

const HomePage = () => {
  const { banner, userEvents, userGroups, isLoading, error } = useHomeContent();
  const memoizedUserGroups = useMemo(() => userGroups, [userGroups]);
  const memoizedUserEvents = useMemo(() => userEvents, [userEvents]);

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
          ) : memoizedUserEvents.length ? (
            <div className="home-grid home-grid--events">
              {memoizedUserEvents.map((event) => (
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
          ) : memoizedUserGroups.length ? (
            <div className="home-grid">
              {memoizedUserGroups.map((group) => (
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
