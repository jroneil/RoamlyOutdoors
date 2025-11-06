import { format } from 'date-fns';
import type { HomeEvent } from '../../services/homeContentService';

type HomeEventCardProps = {
  event: HomeEvent;
};

const HomeEventCard = ({ event }: HomeEventCardProps) => {
  const start = format(new Date(event.startDate), 'eee, MMM d • h:mm a');

  return (
    <article className="home-event-card">
      <header>
        <span className="home-event-card__date">{start}</span>
        <h3>{event.title}</h3>
      </header>
      <p className="home-event-card__meta">{event.location}</p>
      <p className="home-event-card__group">Hosted by {event.groupName}</p>
      <footer>{event.attendance}</footer>
    </article>
  );
};

export default HomeEventCard;
