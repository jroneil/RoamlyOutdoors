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
  createdAt: string;
}

export type EventFormValues = Omit<Event, 'id' | 'attendees' | 'createdAt'> & {
  attendees?: string[];
};
