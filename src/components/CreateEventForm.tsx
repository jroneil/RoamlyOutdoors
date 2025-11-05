import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FormEvent, useMemo, useState } from 'react';
import { db } from '../firebase/firebaseConfig';
import type { EventFormValues } from '../types/event';

const getDefaultValues = (): EventFormValues => ({
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  hostName: '',
  capacity: 10,
  tags: [],
  bannerImage: undefined
});

const CreateEventForm = () => {
  const [values, setValues] = useState<EventFormValues>(getDefaultValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isValid = useMemo(() => {
    return (
      values.title.trim().length > 2 &&
      values.location.trim().length > 2 &&
      Boolean(values.startDate) &&
      Boolean(values.hostName)
    );
  }, [values]);

  const handleChange = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !isValid) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        ...values,
        capacity: Number(values.capacity) || 0,
        tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
        startDate: new Date(values.startDate),
        endDate: values.endDate ? new Date(values.endDate) : null,
        attendees: [],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'events'), payload);
      setValues(getDefaultValues());
      setFeedback('Event created successfully! You can see it in the list above.');
    } catch (error) {
      console.error(error);
      setFeedback('Unable to create the event right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="create" className="card" style={{ marginTop: '3rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Host a new adventure</h2>
        <p className="section-subtitle">
          Share the next hike, climb or paddle with the Roamly community.
        </p>
      </header>
      <form className="grid" style={{ gap: '1.25rem' }} onSubmit={handleSubmit}>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Event title *</label>
          <input
            type="text"
            value={values.title}
            placeholder="Sunrise summit at Mount Elbert"
            onChange={(event) => handleChange('title', event.target.value)}
            required
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Description *</label>
          <textarea
            rows={4}
            value={values.description}
            placeholder="Tell people what to expect, gear to bring and the vibe of the event."
            onChange={(event) => handleChange('description', event.target.value)}
            required
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Location *</label>
          <input
            type="text"
            value={values.location}
            placeholder="Trailhead, park or meeting spot"
            onChange={(event) => handleChange('location', event.target.value)}
            required
          />
        </div>
        <div className="grid three-columns">
          <div className="grid" style={{ gap: '0.5rem' }}>
            <label style={{ fontWeight: 600 }}>Starts *</label>
            <input
              type="datetime-local"
              value={values.startDate}
              onChange={(event) => handleChange('startDate', event.target.value)}
              required
            />
          </div>
          <div className="grid" style={{ gap: '0.5rem' }}>
            <label style={{ fontWeight: 600 }}>Ends</label>
            <input
              type="datetime-local"
              value={values.endDate}
              onChange={(event) => handleChange('endDate', event.target.value)}
            />
          </div>
          <div className="grid" style={{ gap: '0.5rem' }}>
            <label style={{ fontWeight: 600 }}>Capacity</label>
            <input
              type="number"
              min={1}
              value={values.capacity}
              onChange={(event) => handleChange('capacity', Number(event.target.value))}
            />
          </div>
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Tags (comma separated)</label>
          <input
            type="text"
            value={values.tags.join(', ')}
            placeholder="backpacking, trail-running"
            onChange={(event) =>
              handleChange(
                'tags',
                event.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Cover image URL</label>
          <input
            type="url"
            value={values.bannerImage ?? ''}
            placeholder="https://images.unsplash.com/..."
            onChange={(event) => handleChange('bannerImage', event.target.value || undefined)}
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Host name *</label>
          <input
            type="text"
            value={values.hostName}
            placeholder="Your name or crew"
            onChange={(event) => handleChange('hostName', event.target.value)}
            required
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="primary" type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Publish event'}
          </button>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Events are stored in your Firebase project under the <strong>events</strong> collection.
          </span>
          {feedback && <span style={{ color: '#059669' }}>{feedback}</span>}
        </div>
      </form>
    </section>
  );
};

export default CreateEventForm;
