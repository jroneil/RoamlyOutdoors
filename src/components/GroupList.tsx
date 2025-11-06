import { useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { demoteGroupOrganizer, promoteGroupOrganizer, GroupMembershipError } from '../services/groupMembership';
import type { Group } from '../types/group';

interface GroupListProps {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  eventCountByGroup: Record<string, number>;
}

const formatCurrency = (amountCents: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2
  }).format(amountCents / 100);

const GroupList = ({ groups, isLoading, error, eventCountByGroup }: GroupListProps) => {
  const { profile } = useAuth();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [statusByGroup, setStatusByGroup] = useState<Record<string, string | null>>({});
  const [errorByGroup, setErrorByGroup] = useState<Record<string, string | null>>({});

  const totalMembers = useMemo(() => groups.reduce((acc, group) => acc + group.members.length, 0), [groups]);
  const totalOrganizers = useMemo(
    () => groups.reduce((acc, group) => acc + group.organizers.length, 0),
    [groups]
  );

  const handleRoleChange = async (groupId: string, memberId: string, isOrganizer: boolean) => {
    if (!profile) {
      return;
    }

    const actionKey = `${groupId}:${memberId}`;
    setPendingAction(actionKey);
    setStatusByGroup((prev) => ({ ...prev, [groupId]: null }));
    setErrorByGroup((prev) => ({ ...prev, [groupId]: null }));

    try {
      if (isOrganizer) {
        await demoteGroupOrganizer({ groupId, memberId });
        setStatusByGroup((prev) => ({ ...prev, [groupId]: 'Organizer access removed.' }));
      } else {
        await promoteGroupOrganizer({ groupId, memberId });
        setStatusByGroup((prev) => ({ ...prev, [groupId]: 'Organizer access granted.' }));
      }
    } catch (err) {
      const message =
        err instanceof GroupMembershipError
          ? err.message
          : 'Unable to update organizer access. Please try again.';
      setErrorByGroup((prev) => ({ ...prev, [groupId]: message }));
    } finally {
      setPendingAction(null);
    }
  };

  if (isLoading) {
    return (
      <section className="card">
        <p>Loading groups...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <p>We ran into an issue loading groups: {error}</p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">No groups yet</h2>
        <p className="section-subtitle">Create a crew below to start planning adventures together.</p>
      </section>
    );
  }

  return (
    <section className="grid" style={{ gap: '1.5rem' }}>
      <header>
        <h2 className="section-title">Your crews</h2>
        <p className="section-subtitle">
          {groups.length} groups • {totalMembers} members • {totalOrganizers} organizers
        </p>
      </header>
      <div className="grid three-columns">
        {groups.map((group) => {
          const eventsForGroup = eventCountByGroup[group.id] ?? 0;
          const feeTag =
            group.monthlyFeeCents > 0
              ? `${formatCurrency(group.monthlyFeeCents)} / mo`
              : 'Free to join';
          const pendingRequests = group.membershipRequests.filter(
            (request) => request.status !== 'declined'
          ).length;
          return (
            <article
              key={group.id}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {group.bannerImage ? (
                <img
                  src={group.bannerImage}
                  alt={group.title}
                  style={{
                    width: '100%',
                    height: 140,
                    objectFit: 'cover',
                    borderRadius: '16px'
                  }}
                />
              ) : (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(132, 204, 22, 0.12))',
                    borderRadius: '16px',
                    height: 140,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#166534',
                    fontWeight: 700,
                    fontSize: '1.1rem'
                  }}
                >
                  {group.title}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {group.logoImage ? (
                  <img
                    src={group.logoImage}
                    alt={`${group.title} logo`}
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(15, 23, 42, 0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: '#0f172a'
                    }}
                  >
                    {group.title.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{group.title}</h3>
                  <span className="badge">Owned by {group.ownerName}</span>
                </div>
              </div>
              <p style={{ color: '#475569', minHeight: '3rem' }}>{group.description || 'No description provided yet.'}</p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="tag">{group.members.length} members</span>
                <span className="tag light">{eventsForGroup} events</span>
                <span className="tag light">{feeTag}</span>
                <span className="tag light">
                  Screening {group.membershipScreeningEnabled ? 'on' : 'off'}
                </span>
                {group.organizers.length > 0 && (
                  <span className="tag">{group.organizers.length} organizers</span>
                )}
                {pendingRequests > 0 && (
                  <span className="tag">{pendingRequests} pending requests</span>
                )}
              </div>
              {group.members.length > 0 && (
                <div className="grid" style={{ gap: '0.5rem' }}>
                  {group.members.map((member) => {
                    const isOrganizer = group.organizers.includes(member);
                    const actionKey = `${group.id}:${member}`;
                    const isPending = pendingAction === actionKey;
                    const canModify = profile?.uid === group.ownerId && member !== group.ownerId;
                    return (
                      <div
                        key={member}
                        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}
                      >
                        <span className="badge">{member}</span>
                        {isOrganizer ? <span className="tag light">Organizer</span> : null}
                        {canModify ? (
                          <button
                            type="button"
                            className="link-button"
                            onClick={() => void handleRoleChange(group.id, member, isOrganizer)}
                            disabled={isPending}
                          >
                            {isPending
                              ? 'Saving…'
                              : isOrganizer
                              ? 'Remove organizer'
                              : 'Make organizer'}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
              {statusByGroup[group.id] ? (
                <p className="success-text">{statusByGroup[group.id]}</p>
              ) : null}
              {errorByGroup[group.id] ? (
                <p className="error-text">{errorByGroup[group.id]}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default GroupList;
