import { addDoc, arrayRemove, arrayUnion, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { EventFormValues } from '../types/event';
import type { Group } from '../types/group';
import {
  deriveInitialEventVisibility,
  normalizeEventFee,
  userCanManageGroup
} from '../utils/eventRules';

const EVENTS_COLLECTION = 'events';

export class MissingGroupAssociationError extends Error {
  constructor(message = 'A valid group is required to create an event.') {
    super(message);
    this.name = 'MissingGroupAssociationError';
  }
}

export class UnauthorizedEventCreatorError extends Error {
  constructor(message = 'You must be an owner or organizer of this group to publish events.') {
    super(message);
    this.name = 'UnauthorizedEventCreatorError';
  }
}

interface CreateEventInput {
  values: EventFormValues;
  group: Group;
  creatorId: string;
  now?: Date;
}

export interface CreateEventResult {
  id: string;
  isVisible: boolean;
  hiddenReason: string | null;
}

export const createEvent = async ({
  values,
  group,
  creatorId,
  now = new Date()
}: CreateEventInput): Promise<CreateEventResult> => {
  if (!values.groupId || values.groupId !== group.id) {
    throw new MissingGroupAssociationError();
  }

  if (!userCanManageGroup(group, creatorId)) {
    throw new UnauthorizedEventCreatorError();
  }

  if (!values.startDate) {
    throw new Error('A start date is required to publish an event.');
  }

  const visibility = deriveInitialEventVisibility({ group, now });
  const fee = normalizeEventFee({
    amount: values.feeAmount,
    currency: values.feeCurrency,
    description: values.feeDescription,
    disclosure: values.feeDisclosure
  });

  const payload = {
    title: values.title.trim(),
    description: values.description.trim(),
    location: values.location.trim(),
    startDate: values.startDate ? new Date(values.startDate) : null,
    endDate: values.endDate ? new Date(values.endDate) : null,
    hostName: values.hostName.trim(),
    capacity: Number(values.capacity) || 0,
    tags: values.tags.map((tag) => tag.trim()).filter(Boolean),
    attendees: [],
    bannerImage: values.bannerImage?.trim() || null,
    groupId: group.id,
    groupTitle: group.title,
    createdAt: serverTimestamp(),
    createdById: creatorId,
    feeAmountCents: fee.amountCents,
    feeCurrency: fee.currency,
    feeDescription: fee.description,
    feeDisclosure: fee.disclosure,
    isVisible: visibility.isVisible,
    hiddenReason: visibility.hiddenReason,
    hiddenAt: visibility.hiddenAt
  };

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), payload);

  return {
    id: docRef.id,
    isVisible: visibility.isVisible,
    hiddenReason: visibility.hiddenReason
  };
};

export const rsvpToEvent = async (eventId: string, attendeeName: string) => {
  const name = attendeeName.trim();
  if (!name) throw new Error('Attendee name is required');
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(ref, {
    attendees: arrayUnion(name)
  });
};

export const cancelRsvp = async (eventId: string, attendeeName: string) => {
  const name = attendeeName.trim();
  if (!name) throw new Error('Attendee name is required');
  const ref = doc(db, EVENTS_COLLECTION, eventId);
  await updateDoc(ref, {
    attendees: arrayRemove(name)
  });
};
