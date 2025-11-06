import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useDashboardActivity from '../../hooks/useDashboardActivity';
import type {
  DashboardEventSummary,
  DashboardGroupSummary,
  DashboardGroupRole,
  DashboardEventStatus
} from '../../services/dashboardContentService';
import useAuth from '../../hooks/useAuth';

const VIEW_STORAGE_KEY = 'roamly:dashboard-activity-view';

type ViewMode = 'cards' | 'list';

const roleCopy: Record<DashboardGroupRole, string> = {
  owner: 'You own this group',
  organizer: 'Organizer access',
  member: 'Member'
};

const statusCopy: Record<DashboardEventStatus, string> = {
  open: 'Open for RSVPs',
  waitlist: 'Waitlist only',
  draft: 'Draft not published'
};

const toDate = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const formatDate = (iso: string, options?: Intl.DateTimeFormatOptions) => {
  const date = toDate(iso);
  if (!date) {
    return 'Date to be announced';
  }
  return date.toLocaleString(undefined, options ?? { dateStyle: 'medium', timeStyle: 'short' });
};

const useStoredViewMode = (): [ViewMode, (mode: ViewMode) => void] => {
  const [mode, setMode] = useState<ViewMode>('cards');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return;
    }

    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'cards' || stored === 'list') {
      setMode(stored);
    }
  }, []);

  const update = (next: ViewMode) => {
    setMode(next);
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  };

  return [mode, update];
};

const sortGroups = (groups: DashboardGroupSummary[]): DashboardGroupSummary[] => {
  const roleWeight: Record<DashboardGroupRole, number> = {
    owner: 0,
    organizer: 1,
    member: 2
  };

  return [...groups].sort((a, b) => {
    const roleDiff = roleWeight[a.role] - roleWeight[b.role];
    if (roleDiff !== 0) {
      return roleDiff;
    }
    return a.name.localeCompare(b.name);
  });
};

const ViewToggle = ({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) => (
  <div className="dashboard-view-toggle" role="group" aria-label="Change layout">
    <button
      type="button"
      className={mode === 'cards' ? 'active' : undefined}
      onClick={() => onChange('cards')}
    >
      Cards
    </button>
    <button
      type="button"
      className={mode === 'list' ? 'active' : undefined}
      onClick={() => onChange('list')}
    >
      List
    </button>
  </div>
);

const GroupQuickActions = ({
  group,
  align = 'flex-start'
}: {
  group: DashboardGroupSummary;
  align?: 'flex-start' | 'flex-end';
}) => {
  const canCreateEvent = group.role === 'owner' || group.role === 'organizer';
  const canEditGroup = group.role === 'owner';

  if (!canCreateEvent && !canEditGroup) {
    return null;
  }

  return (
    <div className="dashboard-activity-actions" style={{ justifyContent: align }}>
      {canCreateEvent ? (
        <Link to={`/groups/${group.id}/events/create`} className="primary-link dashboard-activity-action">
          Create event
        </Link>
      ) : null}
      {canEditGroup ? (
        <Link to={`/groups/${group.id}/edit`} className="secondary-link dashboard-activity-action">
          Edit group
        </Link>
      ) : null}
    </div>
  );
};

const GroupCards = ({ groups }: { groups: DashboardGroupSummary[] }) => (
  <div className="dashboard-activity-grid">
    {groups.map((group) => (
      <article key={group.id} className="dashboard-activity-card">
        {group.coverImageUrl && (
          <div className="dashboard-activity-card__media">
            <img src={group.coverImageUrl} alt={group.name} loading="lazy" />
          </div>
        )}
        <div className="dashboard-activity-card__body">
          <header>
            <p className="dashboard-activity-eyebrow">{roleCopy[group.role]}</p>
            <h3>{group.name}</h3>
            <p className="dashboard-activity-subtitle">
              {group.city}, {group.state}
            </p>
          </header>
          <dl className="dashboard-activity-meta">
            <div>
              <dt>Members</dt>
              <dd>{group.memberCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Next event</dt>
              <dd>{group.nextEvent ? formatDate(group.nextEvent.startDate, { dateStyle: 'medium' }) : 'Not scheduled'}</dd>
            </div>
          </dl>
          <GroupQuickActions group={group} />
        </div>
      </article>
    ))}
  </div>
);

const GroupList = ({ groups }: { groups: DashboardGroupSummary[] }) => (
  <div className="dashboard-activity-list">
    {groups.map((group) => (
      <article key={group.id} className="dashboard-activity-row">
        <div className="dashboard-activity-row__primary">
          <h3>{group.name}</h3>
          <p>{roleCopy[group.role]}</p>
          <p className="dashboard-activity-subtitle">
            {group.city}, {group.state}
          </p>
        </div>
        <div className="dashboard-activity-row__meta">
          <span>{group.memberCount.toLocaleString()} members</span>
          <span>{group.nextEvent ? `Next: ${formatDate(group.nextEvent.startDate, { dateStyle: 'medium' })}` : 'No upcoming events'}</span>
        </div>
        <GroupQuickActions group={group} align="flex-end" />
      </article>
    ))}
  </div>
);

const EventCards = ({ events }: { events: DashboardEventSummary[] }) => (
  <div className="dashboard-activity-grid">
    {events.map((event) => (
      <article key={event.id} className="dashboard-activity-card dashboard-activity-card--event">
        <div className="dashboard-activity-card__body">
          <header>
            <p className="dashboard-activity-eyebrow">{event.groupName}</p>
            <h3>{event.title}</h3>
          </header>
          <p className="dashboard-activity-subtitle">{formatDate(event.startDate)}</p>
          <p className="dashboard-activity-location">{event.location}</p>
          <div className="dashboard-activity-row__meta">
            <span>{event.attendeeSummary}</span>
            <span className={`dashboard-activity-status status-${event.status}`}>{statusCopy[event.status]}</span>
          </div>
        </div>
      </article>
    ))}
  </div>
);

const EventList = ({ events }: { events: DashboardEventSummary[] }) => (
  <div className="dashboard-activity-list">
    {events.map((event) => (
      <article key={event.id} className="dashboard-activity-row">
        <div className="dashboard-activity-row__primary">
          <h3>{event.title}</h3>
          <p>{event.groupName}</p>
          <p className="dashboard-activity-subtitle">{event.location}</p>
        </div>
        <div className="dashboard-activity-row__meta">
          <span>{formatDate(event.startDate)}</span>
          <span className={`dashboard-activity-status status-${event.status}`}>{statusCopy[event.status]}</span>
          <span>{event.attendeeSummary}</span>
        </div>
      </article>
    ))}
  </div>
);

const EmptyState = ({
  title,
  description,
  actionLabel
}: {
  title: string;
  description: string;
  actionLabel?: string;
}) => (
  <div className="dashboard-activity-empty">
    <h3>{title}</h3>
    <p>{description}</p>
    {actionLabel && <p className="dashboard-activity-empty__action">{actionLabel}</p>}
  </div>
);

const YourGroupsAndEvents = ({ userId }: { userId: string | null | undefined }) => {
  const { groups, events, isLoading, error } = useDashboardActivity(userId);
  const [viewMode, setViewMode] = useStoredViewMode();
  const { profile } = useAuth();

  const sortedGroups = useMemo(() => sortGroups(groups), [groups]);
  const hasGroups = sortedGroups.length > 0;
  const hasEvents = events.length > 0;

  let content: JSX.Element;

  if (isLoading) {
    content = <EmptyState title="Loading your activity" description="Fetching your groups and upcoming events..." />;
  } else if (error) {
    content = (
      <EmptyState
        title="We couldn't load your activity"
        description="Please refresh the page or try again in a few moments."
        actionLabel={error}
      />
    );
  } else {
    content = (
      <div className="dashboard-activity-sections">
        <section>
          <header className="dashboard-activity-section-header">
            <div>
              <h3>Group memberships</h3>
              <p className="dashboard-activity-subtitle">
                Stay on top of roster growth and upcoming plans for the groups you help lead.
              </p>
            </div>
            <span className="dashboard-activity-count">{sortedGroups.length} total</span>
          </header>
          {hasGroups ? (
            viewMode === 'cards' ? <GroupCards groups={sortedGroups} /> : <GroupList groups={sortedGroups} />
          ) : (
            <EmptyState
              title="You don't have any groups yet"
              description="Create a group to start organizing adventures and inviting members."
              actionLabel="Use the organizer tools to publish your first group."
            />
          )}
        </section>

        <section>
          <header className="dashboard-activity-section-header">
            <div>
              <h3>Upcoming events</h3>
              <p className="dashboard-activity-subtitle">RSVPs update in real time once you publish events.</p>
            </div>
            <span className="dashboard-activity-count">{events.length} scheduled</span>
          </header>
          {hasEvents ? (
            viewMode === 'cards' ? <EventCards events={events} /> : <EventList events={events} />
          ) : (
            <EmptyState
              title="No upcoming events"
              description="Draft an itinerary to give your members something to look forward to."
              actionLabel="Start with a quick meetup or skills workshop."
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <section className="card dashboard-card dashboard-groups-events">
      <header className="dashboard-section-header">
        <div>
          <h2>Your Groups &amp; Events</h2>
          <p className="dashboard-activity-subtitle">
            Keep a pulse on membership growth and the adventures your community has lined up next.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {profile ? (
            <Link to="/groups/create" className="primary-link">
              Create group
            </Link>
          ) : null}
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </header>
      {content}
    </section>
  );
};

export default YourGroupsAndEvents;
