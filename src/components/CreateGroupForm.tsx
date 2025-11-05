import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { GroupFormValues } from '../types/group';
import useAuth from '../hooks/useAuth';
import {
  DuplicateGroupNameError,
  GroupCapacityExceededError,
  InactiveSubscriptionError,
  createGroupForOwner,
  getOwnedGroupCount
} from '../services/groups';
import { hasAvailableGroupCapacity } from '../utils/groupRules';

const getDefaultValues = (): GroupFormValues => ({
  title: '',
  description: '',
  ownerName: '',
  members: [],
  bannerImage: undefined,
  logoImage: undefined,
  monthlyFeeCents: 0,
  membershipScreeningEnabled: false
});

const CreateGroupForm = () => {
  const [values, setValues] = useState<GroupFormValues>(getDefaultValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [ownedGroupCount, setOwnedGroupCount] = useState<number>(0);
  const [isCountingGroups, setIsCountingGroups] = useState(false);
  const { profile } = useAuth();

  const subscriptionStatus = profile?.billing.subscriptionStatus ?? 'none';
  const canCreateGroup = subscriptionStatus === 'active';
  const groupQuota = profile?.billing.entitlements?.groupQuota ?? 0;
  const hasGroupCapacity = hasAvailableGroupCapacity(groupQuota, ownedGroupCount);

  const isValid = useMemo(() => {
    return values.title.trim().length > 2 && values.ownerName.trim().length > 1;
  }, [values.ownerName, values.title]);

  useEffect(() => {
    let isMounted = true;
    const ownerId = profile?.uid;
    if (!ownerId) {
      setOwnedGroupCount(0);
      return () => {
        isMounted = false;
      };
    }

    setIsCountingGroups(true);
    getOwnedGroupCount(ownerId)
      .then((count) => {
        if (isMounted) {
          setOwnedGroupCount(count);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOwnedGroupCount(0);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCountingGroups(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [profile?.uid]);

  const handleChange = <K extends keyof GroupFormValues>(field: K, value: GroupFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !isValid) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      if (!profile) {
        throw new Error('You must be signed in to create a group.');
      }

      if (!canCreateGroup) {
        throw new Error('An active subscription is required to create new groups.');
      }

      if (!hasGroupCapacity) {
        throw new GroupCapacityExceededError();
      }

      await createGroupForOwner(profile, {
        ...values,
        ownerName: values.ownerName.trim(),
        members: values.members?.map((member) => member.trim()).filter(Boolean) ?? []
      });

      setOwnedGroupCount((count) => count + 1);
      setValues(getDefaultValues());
      setFeedback('Group created! Start planning adventures for your crew.');
    } catch (error) {
      console.error(error);
      if (error instanceof DuplicateGroupNameError) {
        setFeedback('That group name is already taken. Try something more distinct.');
      } else if (error instanceof GroupCapacityExceededError) {
        setFeedback('You have reached your group quota. Purchase additional capacity to continue.');
      } else if (error instanceof InactiveSubscriptionError) {
        setFeedback('An active subscription is required before creating a group.');
      } else {
        setFeedback('We could not save the group. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card" style={{ marginTop: '2.5rem' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 className="section-title">Create a crew</h2>
        <p className="section-subtitle">
          Groups organize explorers. Add members now so they can RSVP to your upcoming events.
        </p>
      </header>
      <form className="grid" style={{ gap: '1.25rem' }} onSubmit={handleSubmit}>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Group name *</label>
          <input
            type="text"
            value={values.title}
            placeholder="Front Range Trail Crew"
            onChange={(event) => handleChange('title', event.target.value)}
            required
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Description</label>
          <textarea
            rows={3}
            value={values.description}
            placeholder="Tell members about your crew, preferred activities and vibe."
            onChange={(event) => handleChange('description', event.target.value)}
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Owner *</label>
          <input
            type="text"
            value={values.ownerName}
            placeholder="Your name"
            onChange={(event) => handleChange('ownerName', event.target.value)}
            required
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Monthly group fee (USD)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={
              values.monthlyFeeCents > 0
                ? (values.monthlyFeeCents / 100).toFixed(2).replace(/\.00$/, '')
                : ''
            }
            placeholder="25"
            onChange={(event) => {
              const rawValue = Number(event.target.value);
              if (Number.isNaN(rawValue) || rawValue < 0) {
                handleChange('monthlyFeeCents', 0);
              } else {
                handleChange('monthlyFeeCents', Math.round(rawValue * 100));
              }
            }}
          />
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Members will see this fee when they join your group.
          </span>
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Members (comma separated)</label>
          <textarea
            rows={3}
            value={values.members?.join(', ') ?? ''}
            placeholder="Casey, Devon, Ari"
            onChange={(event) =>
              handleChange(
                'members',
                event.target.value
                  .split(',')
                  .map((member) => member.trim())
                  .filter(Boolean)
              )
            }
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Banner image URL</label>
          <input
            type="url"
            value={values.bannerImage ?? ''}
            placeholder="https://images.unsplash.com/..."
            onChange={(event) => handleChange('bannerImage', event.target.value || undefined)}
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Logo image URL</label>
          <input
            type="url"
            value={values.logoImage ?? ''}
            placeholder="https://images.unsplash.com/..."
            onChange={(event) => handleChange('logoImage', event.target.value || undefined)}
          />
        </div>
        <div className="grid" style={{ gap: '0.75rem' }}>
          <label style={{ fontWeight: 600 }}>Membership screening</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
            <input
              type="checkbox"
              checked={values.membershipScreeningEnabled}
              onChange={(event) => handleChange('membershipScreeningEnabled', event.target.checked)}
            />
            Require owners to review join requests before members are added.
          </label>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            className="primary"
            type="submit"
            disabled={!isValid || isSubmitting || !canCreateGroup || !hasGroupCapacity || isCountingGroups}
          >
            {isSubmitting ? 'Creating...' : 'Create group'}
          </button>
          {!profile && (
            <span style={{ color: '#b91c1c', fontSize: '0.9rem' }}>
              Sign in to start organizing adventures with your crew.
            </span>
          )}
          {profile && !canCreateGroup && (
            <span style={{ color: '#b45309', fontSize: '0.9rem' }}>
              Activate your subscription to create new groups for your community.
            </span>
          )}
          {profile && groupQuota > 0 && (
            <span style={{ color: hasGroupCapacity ? '#0f766e' : '#b91c1c', fontSize: '0.9rem' }}>
              {isCountingGroups
                ? 'Checking your available group slots…'
                : `You are using ${ownedGroupCount} of ${groupQuota} included groups.`}
            </span>
          )}
          {profile && !hasGroupCapacity && (
            <span style={{ color: '#b91c1c', fontSize: '0.9rem' }}>
              Purchase additional capacity from the billing portal to create more groups.
            </span>
          )}
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Groups live in the <strong>groups</strong> collection inside your Firebase project.
          </span>
          {feedback && <span style={{ color: feedback.includes('could not') ? '#b91c1c' : '#059669' }}>{feedback}</span>}
        </div>
      </form>
    </section>
  );
};

export default CreateGroupForm;
