import type { Tag } from './tag';

export type EventAttendeeStatus = 'confirmed' | 'waitlist' | 'cancelled';

export interface EventAttendee {
  attendeeId: string;
  displayName: string;
  status: EventAttendeeStatus;
  respondedAt?: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  hostName: string;
  capacity: number;
  /** Legacy tag labels maintained for backwards compatibility */
  tags: string[];
  /** Normalized tag identifiers */
  tagIds?: string[];
  /** Full tag metadata for richer dashboards */
  tagDetails?: Tag[];
  /** Legacy attendee list used by RSVP flows */
  attendees: string[];
  /** Normalized attendee identifiers */
  attendeeIds?: string[];
  /** Structured roster metadata */
  attendeeRoster?: EventAttendee[];
  bannerImage?: string;
  groupId: string;
  groupTitle: string;
  createdAt: string;
  createdById?: string;
  feeAmountCents: number | null;
  feeCurrency: string | null;
  feeDescription: string | null;
  feeDisclosure: string | null;
  isVisible: boolean;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
}

export interface EventFormValues {
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  hostName: string;
  capacity: number;
  tags: string[];
  attendees?: string[];
  bannerImage?: string;
  groupId: string;
  groupTitle: string;
  feeAmount: string;
  feeCurrency: string;
  feeDescription: string;
  feeDisclosure: string;
}
