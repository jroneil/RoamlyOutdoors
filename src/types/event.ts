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
