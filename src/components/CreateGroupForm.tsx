import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { FormEvent, useMemo, useState } from 'react';
import { db } from '../firebase/firebaseConfig';
import type { GroupFormValues } from '../types/group';
import useAuth from '../hooks/useAuth';

const getDefaultValues = (): GroupFormValues => ({
  title: '',
  description: '',
  ownerName: '',
  members: [],
  bannerImage: undefined,
  logoImage: undefined
});

const CreateGroupForm = () => {
  const [values, setValues] = useState<GroupFormValues>(getDefaultValues());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { profile } = useAuth();

  const subscriptionStatus = profile?.billing.subscriptionStatus ?? 'none';
  const canCreateGroup = subscriptionStatus === 'active';

  const isValid = useMemo(() => {
    return values.title.trim().length > 2 && values.ownerName.trim().length > 1;
  }, [values.ownerName, values.title]);

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

      const payload = {
        ...values,
        members: values.members?.map((member) => member.trim()).filter(Boolean) ?? [],
        bannerImage: values.bannerImage?.trim() || null,
        logoImage: values.logoImage?.trim() || null,
        createdAt: serverTimestamp(),
        ownerId: profile.uid,
        subscriptionStatus,
        subscriptionExpiredAt: null,
        subscriptionRenewedAt: serverTimestamp(),
        subscriptionUpdatedAt: serverTimestamp(),
        subscriptionRenewalDate: profile.billing.renewalDate ?? null
      };

      await addDoc(collection(db, 'groups'), payload);
      setValues(getDefaultValues());
      setFeedback('Group created! Start planning adventures for your crew.');
    } catch (error) {
      console.error(error);
      setFeedback('We could not save the group. Please try again.');
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button className="primary" type="submit" disabled={!isValid || isSubmitting || !canCreateGroup}>
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
