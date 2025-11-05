import type { Group } from '../types/group';

interface GroupListProps {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  eventCountByGroup: Record<string, number>;
}

const GroupList = ({ groups, isLoading, error, eventCountByGroup }: GroupListProps) => {
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
          {groups.length} groups • {groups.reduce((acc, group) => acc + group.members.length, 0)} members
        </p>
      </header>
      <div className="grid three-columns">
        {groups.map((group) => {
          const eventsForGroup = eventCountByGroup[group.id] ?? 0;
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
              </div>
              {group.members.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {group.members.map((member) => (
                    <span key={member} className="badge">
                      {member}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default GroupList;
