import { format } from 'date-fns';
import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cancelRsvp, rsvpToEvent } from '../services/events';
import { useEvent } from '../hooks/useEvent';
import { useGroup } from '../hooks/useGroup';

const formatDate = (iso: string) => {
  if (!iso) return 'Date TBA';
  try {
    return format(new Date(iso), 'EEEE, MMMM d • h:mmaaa');
  } catch (error) {
    console.error(error);
    return 'Date TBA';
  }
};

const EventDetailsPage = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { event, isLoading, error } = useEvent(eventId);
  const { group, isLoading: isGroupLoading, error: groupError } = useGroup(event?.groupId);
  const [attendeeName, setAttendeeName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <section className="card">
        <p>Loading event details...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <p>We could not load this event: {error}</p>
        <button className="tag" type="button" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="card">
        <h2 className="section-title">Event not found</h2>
        <p className="section-subtitle">It may have been deleted or you followed an outdated link.</p>
        <Link className="tag" to="/">
          ← Return home
        </Link>
      </section>
    );
  }

  const availableSpots = Math.max(event.capacity - event.attendees.length, 0);
  const hiddenBecauseSubscription = event.hiddenReason === 'subscription_expired';
  const isHidden = !event.isVisible;

  const handleRsvp = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await rsvpToEvent(event.id, attendeeName);
      setAttendeeName('');
      setFeedback('RSVP saved! See you out there.');
    } catch (submissionError) {
      console.error(submissionError);
      setFeedback('We could not save your RSVP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (name: string) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await cancelRsvp(event.id, name);
      setFeedback(`${name} has been removed from the guest list.`);
    } catch (submissionError) {
      console.error(submissionError);
      setFeedback('Unable to update the guest list.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupTitle = (group?.title ?? event.groupTitle ?? '').trim() || 'this group';
  const groupOwner = (group?.ownerName ?? '').trim() || event.hostName;
  const groupMembers = group?.members ?? [];

  return (
    <section className="grid" style={{ gap: '2rem' }}>
      <div className="grid" style={{ gap: '1.5rem' }}>
        <div className="card" style={{ display: 'grid', gap: '1.5rem' }}>
          <button className="tag" type="button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          {isHidden && (
            <div
              className="tag"
              style={{
                background: hiddenBecauseSubscription ? 'rgba(180, 83, 9, 0.12)' : 'rgba(15, 23, 42, 0.1)',
                color: hiddenBecauseSubscription ? '#9a3412' : '#0f172a'
              }}
            >
              {hiddenBecauseSubscription
                ? 'This event is hidden until the organizer renews their subscription.'
                : 'This event is currently hidden from attendees.'}
            </div>
          )}
          {event.bannerImage && (
            <img
              src={event.bannerImage}
              alt={event.title}
              style={{ width: '100%', borderRadius: '18px', maxHeight: 360, objectFit: 'cover' }}
            />
          )}
          <div>
            <h1 className="section-title">{event.title}</h1>
            <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: 1.6 }}>{event.description}</p>
          </div>
          <div className="grid" style={{ gap: '0.85rem' }}>
            <div>
              <span className="badge">📍 {event.location}</span>
            </div>
            <div className="grid" style={{ gap: '0.35rem' }}>
              <span className="badge">Starts: {formatDate(event.startDate)}</span>
              {event.endDate && <span className="badge">Wraps: {formatDate(event.endDate)}</span>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="tag light">Hosted by {event.hostName}</span>
              <span className="tag">{availableSpots > 0 ? `${availableSpots} spots left` : 'Fully booked'}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {event.tags.map((tagLabel) => (
                <span key={tagLabel} className="badge">
                  #{tagLabel}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="card" style={{ display: 'grid', gap: '1.25rem' }}>
          <header>
            <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
              About {groupTitle}
            </h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              Events live inside groups so members can rally around upcoming adventures.
            </p>
          </header>
          {groupError && <span style={{ color: '#b91c1c' }}>Unable to load group: {groupError}</span>}
          {isGroupLoading ? (
            <span>Loading group details...</span>
          ) : (
            <div className="grid" style={{ gap: '1rem' }}>
              {group?.bannerImage && (
                <img
                  src={group.bannerImage}
                  alt={`${groupTitle} banner`}
                  style={{ width: '100%', borderRadius: '16px', maxHeight: 240, objectFit: 'cover' }}
                />
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {group?.logoImage ? (
                  <img
                    src={group.logoImage}
                    alt={`${groupTitle} logo`}
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {groupTitle.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <span className="badge">Owner: {groupOwner}</span>
                  {group?.description && (
                    <p style={{ color: '#475569', marginTop: '0.5rem' }}>{group.description}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="tag">{groupMembers.length} members</span>
                <span className="tag light">Group ID: {event.groupId}</span>
              </div>
              {groupMembers.length > 0 ? (
                <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: 0 }}>
                  {groupMembers.map((member) => (
                    <li key={member}>
                      <span className="badge">{member}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span style={{ color: '#64748b' }}>No members listed yet.</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ gap: '1.5rem' }}>
        <form className="card" style={{ display: 'grid', gap: '1rem' }} onSubmit={handleRsvp}>
          <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
            Join this adventure
          </h2>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Add your name to the guest list. We only store it in Firestore — no accounts needed.
          </p>
          <input
            type="text"
            placeholder="Your full name"
            value={attendeeName}
            onChange={(event) => setAttendeeName(event.target.value)}
            required
          />
          <button className="primary" type="submit" disabled={isSubmitting || !attendeeName.trim()}>
            {isSubmitting ? 'Saving RSVP...' : 'RSVP'}
          </button>
          {feedback && <span style={{ color: '#0f766e' }}>{feedback}</span>}
        </form>

        <div className="card" style={{ display: 'grid', gap: '1rem' }}>
          <h2 className="section-title" style={{ fontSize: '1.5rem' }}>
            Attendee list
          </h2>
          {event.attendees.length === 0 ? (
            <p className="section-subtitle" style={{ marginBottom: 0 }}>
              No RSVPs yet. Be the first to join!
            </p>
          ) : (
            <ul style={{ display: 'grid', gap: '0.65rem', listStyle: 'none' }}>
              {event.attendees.map((name) => (
                <li
                  key={name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(15, 23, 42, 0.04)',
                    padding: '0.65rem 1rem',
                    borderRadius: '12px'
                  }}
                >
                  <span>{name}</span>
                  <button
                    type="button"
                    className="tag light"
                    onClick={() => handleCancel(name)}
                    disabled={isSubmitting}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default EventDetailsPage;
