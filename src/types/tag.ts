export interface Tag {
  /** Unique identifier for the tag so it can be shared across resources */
  id: string;
  /** Human friendly label presented in the UI */
  label: string;
  /** Lowercase label that allows case-insensitive comparisons */
  normalizedLabel: string;
  /** Optional grouping or facet information for the tag */
  category?: string;
}

export const normalizeTagLabel = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

