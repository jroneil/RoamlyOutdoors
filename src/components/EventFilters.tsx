import type { ChangeEvent } from 'react';

type FilterValue = 'upcoming' | 'past' | 'all';

interface EventFiltersProps {
  search: string;
  tag: string;
  filter: FilterValue;
  availableTags: string[];
  onSearchChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onFilterChange: (value: FilterValue) => void;
}

const FilterButton = ({
  label,
  value,
  current,
  onClick
}: {
  label: string;
  value: FilterValue;
  current: FilterValue;
  onClick: (value: FilterValue) => void;
}) => {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className="badge"
      style={{
        background: isActive ? 'rgba(59, 130, 246, 0.18)' : undefined,
        color: isActive ? '#1d4ed8' : undefined
      }}
    >
      {label}
    </button>
  );
};

const EventFilters = ({
  search,
  tag,
  filter,
  availableTags,
  onSearchChange,
  onTagChange,
  onFilterChange
}: EventFiltersProps) => {
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleTagClick = (value: string) => {
    onTagChange(tag === value ? '' : value);
  };

  return (
    <section className="card" style={{ marginTop: '2.5rem' }}>
      <div className="grid" style={{ gap: '1.2rem' }}>
        <div>
          <label htmlFor="search" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Search adventures
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search by title, location or host"
            value={search}
            onChange={handleSearch}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <FilterButton label="Upcoming" value="upcoming" current={filter} onClick={onFilterChange} />
            <FilterButton label="All" value="all" current={filter} onClick={onFilterChange} />
            <FilterButton label="Past" value="past" current={filter} onClick={onFilterChange} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#475569' }}>Popular tags:</span>
            {availableTags.length === 0 && <span>No tags yet</span>}
            {availableTags.map((availableTag) => {
              const isActive = tag === availableTag;
              return (
                <button
                  key={availableTag}
                  type="button"
                  className="tag light"
                  style={{
                    background: isActive ? 'rgba(14, 165, 233, 0.28)' : undefined,
                    color: isActive ? '#0e7490' : undefined
                  }}
                  onClick={() => handleTagClick(availableTag)}
                >
                  #{availableTag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EventFilters;
