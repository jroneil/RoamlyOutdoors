import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { Event } from '../types/event';
import type { Group } from '../types/group';

interface EventCardProps {
  event: Event;
  group?: Group;
}

const formatDateRange = (startIso: string, endIso: string) => {
  if (!startIso) return 'Date TBA';
  const start = new Date(startIso);
  if (!endIso) {
    return format(start, 'EEE, MMM d • h:mmaaa');
  }
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${format(start, 'EEE, MMM d • h:mmaaa')} - ${format(end, 'h:mmaaa')}`;
  }
  return `${format(start, 'MMM d')} → ${format(end, 'MMM d')}`;
};

const formatCurrency = (amountCents: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2
  }).format(amountCents / 100);

const EventCard = ({ event, group }: EventCardProps) => {
  const availableSpots = Math.max(event.capacity - event.attendees.length, 0);
  const groupName = (group?.title ?? event.groupTitle ?? '').trim();
  const ownerName = group?.ownerName ?? event.hostName;
  const feeLabel =
    event.feeAmountCents && event.feeCurrency
      ? `Fee: ${formatCurrency(event.feeAmountCents, event.feeCurrency)}${
          event.feeDescription ? ` • ${event.feeDescription}` : ''
        }`
      : 'Free to attend';

  return (
    <article className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.3rem' }}>
      {groupName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {group?.logoImage ? (
            <img
              src={group.logoImage}
              alt={`${groupName} logo`}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#1d4ed8'
              }}
            >
              {groupName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <span className="badge">{groupName}</span>
            <div style={{ fontSize: '0.85rem', color: '#475569' }}>Owner: {ownerName}</div>
          </div>
        </div>
      )}
      {event.bannerImage ? (
        <img
          src={event.bannerImage}
          alt={event.title}
          style={{
            width: '100%',
            height: 180,
            objectFit: 'cover',
            borderRadius: '16px'
          }}
        />
      ) : (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(14, 165, 233, 0.12))',
            borderRadius: '16px',
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1d4ed8',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}
        >
          {event.location}
        </div>
      )}
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span className="badge">{formatDateRange(event.startDate, event.endDate)}</span>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{event.title}</h3>
        <p style={{ color: '#475569', minHeight: '3.5rem' }}>{event.description}</p>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="tag">{event.location}</span>
        <span className="tag light">Hosted by {event.hostName}</span>
        <span className="tag light">{feeLabel}</span>
        {event.tags.map((tag) => (
          <span className="badge" key={tag}>
            #{tag}
          </span>
        ))}
      </div>
      {event.feeDisclosure && (
        <p style={{ color: '#0f172a', fontSize: '0.85rem' }}>{event.feeDisclosure}</p>
      )}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#0f172a', fontWeight: 600 }}>
          {availableSpots > 0 ? `${availableSpots} spots left` : 'Fully booked'}
        </div>
        <Link to={`/events/${event.id}`} className="tag" style={{ cursor: 'pointer' }}>
          View details
        </Link>
      </footer>
    </article>
  );
};

export default EventCard;
