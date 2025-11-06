import type { ChangeEvent } from 'react';

type HomeSearchFiltersProps = {
  query: string;
  tags: string[];
  selectedTags: string[];
  onQueryChange: (value: string) => void;
  onTagToggle: (tag: string) => void;
};

const formatTagLabel = (tag: string) => {
  return tag
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
};

const HomeSearchFilters = ({ query, tags, selectedTags, onQueryChange, onTagToggle }: HomeSearchFiltersProps) => {
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onQueryChange(event.target.value);
  };

  return (
    <section className="home-search" aria-label="Filter groups and events">
      <div className="home-search__field">
        <label htmlFor="home-search-input">Search groups & events</label>
        <input
          id="home-search-input"
          type="search"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by name, activity, or tag"
          autoComplete="off"
        />
      </div>

      {tags.length ? (
        <div className="home-search__chips" role="group" aria-label="Filter by popular tags">
          <span className="home-search__chips-label">Popular tags:</span>
          <div className="home-search__chips-grid">
            {tags.map((tag) => {
              const isActive = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className="tag home-search__chip"
                  data-active={isActive}
                  onClick={() => onTagToggle(tag)}
                  aria-pressed={isActive}
                >
                  #{formatTagLabel(tag)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HomeSearchFilters;
