import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { EventFormValues } from '../types/event';
import type { Group } from '../types/group';
import useAuth from '../hooks/useAuth';
import {
  InsufficientCreditsError,
  consumeCreditsForEventPublish
} from '../services/billing';
import {
  MissingGroupAssociationError,
  UnauthorizedEventCreatorError,
  createEvent
} from '../services/events';
import { isGroupSubscriptionActive, userCanManageGroup } from '../utils/eventRules';

const getDefaultValues = (): EventFormValues => ({
  title: '',
  description: '',
  location: '',
  startDate: '',
  endDate: '',
  hostName: '',
  capacity: 10,
  tags: [],
  bannerImage: undefined,
  groupId: '',
  groupTitle: '',
  feeAmount: '',
  feeCurrency: 'USD',
  feeDescription: '',
  feeDisclosure: 'Fee covers permits, supplies, and shared costs so the adventure runs smoothly.'
});

interface CreateEventFormProps {
  groups: Group[];
  isLoadingGroups: boolean;
  groupsError: string | null;
  canManageEvents: boolean;
}

const CreateEventForm = ({ groups, isLoadingGroups, groupsError, canManageEvents }: CreateEventFormProps) => {
  const [values, setValues] = useState<EventFormValues>(getDefaultValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [creditFeedback, setCreditFeedback] = useState<{ message: string; tone: 'success' | 'warning' | 'info' } | null>(null);
  const { profile } = useAuth();

  const manageableGroups = useMemo(
    () => groups.filter((group) => userCanManageGroup(group, profile?.uid)),
    [groups, profile?.uid]
  );

  useEffect(() => {
    if (!values.groupId && manageableGroups.length > 0) {
      const preferredGroup =
        manageableGroups.find((group) => isGroupSubscriptionActive(group)) ?? manageableGroups[0];

      setValues((prev) => ({
        ...prev,
        groupId: preferredGroup.id,
        groupTitle: preferredGroup.title
      }));
    }
  }, [manageableGroups, values.groupId]);

  const selectedGroup = useMemo(
    () => manageableGroups.find((group) => group.id === values.groupId) ?? null,
    [manageableGroups, values.groupId]
  );

  const selectedGroupIsActive = selectedGroup ? isGroupSubscriptionActive(selectedGroup) : false;

  const isValid = useMemo(() => {
    return (
      values.title.trim().length > 2 &&
      values.location.trim().length > 2 &&
      Boolean(values.startDate) &&
      Boolean(values.hostName) &&
      Boolean(values.groupId) &&
      manageableGroups.some((group) => group.id === values.groupId)
    );
  }, [manageableGroups, values]);

  const handleChange = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !isValid) return;
    setIsSubmitting(true);
    setFeedback(null);
    setCreditFeedback(null);
    try {
      if (!profile) {
        throw new Error('You must be signed in to publish events.');
      }

      const selectedGroup = manageableGroups.find((group) => group.id === values.groupId);
      if (!selectedGroup) {
        throw new MissingGroupAssociationError();
      }

      if (!isGroupSubscriptionActive(selectedGroup)) {
        throw new Error('The selected group needs an active subscription to publish events.');
      }

      const creditResult = await consumeCreditsForEventPublish(profile.uid);

      if (creditResult.autoPurchaseTriggered) {
        setCreditFeedback({
          tone: 'info',
          message:
            'Auto-purchase triggered — additional credits were added to keep publishing uninterrupted.'
        });
      } else if (creditResult.reminderTriggered) {
        setCreditFeedback({
          tone: 'warning',
          message:
            'Your credit balance is low. We emailed a reminder so you can top up before the next event.'
        });
      } else {
        setCreditFeedback({
          tone: 'success',
          message: `Event credit applied. Remaining balance: ${creditResult.balance} credits.`
        });
      }

      const result = await createEvent({ values, group: selectedGroup, creatorId: profile.uid });
      setValues((prev) => ({
        ...getDefaultValues(),
        groupId: selectedGroup.id,
        groupTitle: selectedGroup.title,
        feeCurrency: prev.feeCurrency
      }));
      setFeedback(
        result.isVisible
          ? 'Event created successfully! You can see it in the list above.'
          : 'Event saved but hidden until the subscription is reactivated.'
      );
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        setCreditFeedback({
          tone: 'warning',
          message:
            'You have run out of publishing credits. Visit the billing tab to purchase more before trying again.'
        });
        setFeedback(null);
      } else if (error instanceof MissingGroupAssociationError || error instanceof UnauthorizedEventCreatorError) {
        setFeedback(error.message);
      } else if (error instanceof Error) {
        console.error(error);
        setFeedback(error.message || 'Unable to create the event right now. Please try again.');
      } else {
        console.error(error);
        setFeedback('Unable to create the event right now. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return (
      <section id="create" className="card" style={{ marginTop: '3rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">Host a new adventure</h2>
          <p className="section-subtitle">Sign in to create and manage events.</p>
        </header>
      </section>
    );
  }

  if (!canManageEvents) {
    return (
      <section id="create" className="card" style={{ marginTop: '3rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title">Host a new adventure</h2>
          <p className="section-subtitle">You need organizer access for a group before publishing events.</p>
        </header>
        <p style={{ color: '#475569' }}>
          Ask the group owner to promote you to organizer from the group management panel above.
        </p>
      </section>
    );
  }

  return (
    <section id="create" className="card" style={{ marginTop: '3rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Host a new adventure</h2>
        <p className="section-subtitle">
          Share the next hike, climb or paddle with the Roamly community.
        </p>
        {groupsError && <p style={{ color: '#b91c1c' }}>Unable to load groups: {groupsError}</p>}
      </header>
      <form className="grid" style={{ gap: '1.25rem' }} onSubmit={handleSubmit}>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Group *</label>
          {isLoadingGroups ? (
            <span>Loading your groups...</span>
          ) : groups.length === 0 ? (
            <span style={{ color: '#b45309' }}>
              Create a group first so adventures have a home.
            </span>
          ) : manageableGroups.length === 0 ? (
            <span style={{ color: '#b45309' }}>
              You need to own or organize a group before publishing events.
            </span>
          ) : (
            <select
              value={values.groupId}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  groupId: event.target.value,
                  groupTitle:
                    manageableGroups.find((group) => group.id === event.target.value)?.title ??
                    prev.groupTitle
                }))
              }
              required
            >
              {manageableGroups.map((group) => {
                const inactive = !isGroupSubscriptionActive(group);
                return (
                  <option key={group.id} value={group.id}>
                    {group.title}
                    {inactive ? ' — inactive subscription' : ''}
                  </option>
                );
              })}
            </select>
          )}
        </div>
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
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Fee (optional)</label>
          <div className="grid three-columns" style={{ gap: '0.75rem' }}>
            <div className="grid" style={{ gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={values.feeAmount}
                placeholder="0.00"
                onChange={(event) => handleChange('feeAmount', event.target.value)}
              />
            </div>
            <div className="grid" style={{ gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>Currency</span>
              <select
                value={values.feeCurrency}
                onChange={(event) => handleChange('feeCurrency', event.target.value)}
              >
                {['USD', 'CAD', 'EUR', 'GBP', 'AUD'].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid" style={{ gap: '0.4rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#475569' }}>Short note</span>
              <input
                type="text"
                value={values.feeDescription}
                placeholder="e.g. Permit + shuttle"
                onChange={(event) => handleChange('feeDescription', event.target.value)}
              />
            </div>
          </div>
          <textarea
            rows={3}
            value={values.feeDisclosure}
            placeholder="Explain how the fee will be used so attendees know what to expect."
            onChange={(event) => handleChange('feeDisclosure', event.target.value)}
          />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Attendees see this disclosure before they RSVP. Leave the amount blank for free events.
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="primary"
            type="submit"
            disabled={!isValid || isSubmitting || !selectedGroupIsActive}
          >
            {isSubmitting ? 'Creating...' : 'Publish event'}
          </button>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Events are stored in your Firebase project under the <strong>events</strong> collection.
          </span>
          {selectedGroup && !selectedGroupIsActive && (
            <span style={{ color: '#b45309', fontSize: '0.9rem' }}>
              {selectedGroup.title} needs an active subscription before new events become visible.
            </span>
          )}
          {creditFeedback && (
            <span
              style={{
                color:
                  creditFeedback.tone === 'success'
                    ? '#047857'
                    : creditFeedback.tone === 'info'
                      ? '#1d4ed8'
                      : '#b45309',
                fontSize: '0.9rem'
              }}
            >
              {creditFeedback.message}
            </span>
          )}
          {groups.length === 0 && !isLoadingGroups && (
            <span style={{ fontSize: '0.85rem', color: '#b45309' }}>
              Add a group before creating an event — every adventure belongs to a crew.
            </span>
          )}
          {feedback && <span style={{ color: '#059669' }}>{feedback}</span>}
        </div>
      </form>
    </section>
  );
};

export default CreateEventForm;
