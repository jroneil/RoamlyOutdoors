import type { Group } from '../types/group';

interface GroupMembershipRequestsProps {
  groups: Group[];
}

const formatDate = (iso: string) => {
  if (!iso) return 'Unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const GroupMembershipRequests = ({ groups }: GroupMembershipRequestsProps) => {
  const groupsWithRequests = groups.filter((group) => group.membershipRequests.length > 0);

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="card" style={{ display: 'grid', gap: '1.25rem' }}>
      <header>
        <h2 className="section-title">Membership requests</h2>
        <p className="section-subtitle">
          Review join requests and toggle screening to keep your community welcoming.
        </p>
      </header>

      {groupsWithRequests.length === 0 ? (
        <p style={{ color: '#475569' }}>
          No pending requests right now. {groups.some((group) => group.membershipScreeningEnabled)
            ? 'Screening is enabled for at least one group — new joiners will appear here.'
            : 'Turn on screening for a group to manually approve join requests.'}
        </p>
      ) : (
        <div className="grid" style={{ gap: '1rem' }}>
          {groupsWithRequests.map((group) => (
            <article key={group.id} className="card" style={{ padding: '1.25rem', gap: '0.75rem' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>{group.title}</h3>
                  <span className="badge">Screening {group.membershipScreeningEnabled ? 'on' : 'off'}</span>
                </div>
                <span className="tag">{group.membershipRequests.length} requests</span>
              </header>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
                {group.membershipRequests
                  .slice()
                  .sort((a, b) => (a.submittedAt > b.submittedAt ? -1 : 1))
                  .map((request) => (
                  <li
                    key={request.id}
                    style={{
                      border: '1px solid rgba(15, 23, 42, 0.08)',
                      borderRadius: '12px',
                      padding: '0.75rem',
                      background: 'rgba(15, 23, 42, 0.015)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <strong>{request.memberName}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatDate(request.submittedAt)}</span>
                    </div>
                    {request.message ? (
                      <p style={{ marginTop: '0.5rem', color: '#475569' }}>{request.message}</p>
                    ) : null}
                    <span className="badge light">Status: {request.status ?? 'pending'}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default GroupMembershipRequests;
