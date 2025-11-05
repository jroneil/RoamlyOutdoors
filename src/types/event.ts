export interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
  hostName: string;
  capacity: number;
  tags: string[];
  attendees: string[];
  bannerImage?: string;
  groupId: string;
  groupTitle: string;
  createdAt: string;
  isVisible: boolean;
  hiddenReason?: string | null;
  hiddenAt?: string | null;
}

export type EventFormValues = Omit<
  Event,
  'id' | 'attendees' | 'createdAt' | 'isVisible' | 'hiddenReason' | 'hiddenAt'
> & {
  attendees?: string[];
};
