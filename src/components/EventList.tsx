import type { Event } from '../types/event';
import type { Group } from '../types/group';
import EventCard from './EventCard';

interface EventListProps {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  total: number;
  groupsById: Record<string, Group>;
}

const EventList = ({ events, isLoading, error, total, groupsById }: EventListProps) => {
  if (isLoading) {
    return (
      <section className="card" style={{ marginTop: '2rem' }}>
        <p>Loading events from your Firebase project...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card" style={{ marginTop: '2rem' }}>
        <p>We ran into an issue loading events: {error}</p>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="card" style={{ marginTop: '2rem' }}>
        <h3 className="section-title">No events yet</h3>
        <p className="section-subtitle">
          Be the first to host an adventure. Use the form below to publish your meetup.
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginTop: '2.5rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">{events.length} adventures</h2>
        <p className="section-subtitle">Showing {events.length} of {total} events</p>
      </header>
      <div className="grid three-columns">
        {events.map((event) => (
          <EventCard key={event.id} event={event} group={groupsById[event.groupId]} />
        ))}
      </div>
    </section>
  );
};

export default EventList;
