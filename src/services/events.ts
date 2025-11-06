import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import type { EventFormValues } from '../types/event';
import type { Group } from '../types/group';
import type { CreditConsumptionResult } from '../types/billing';
import { InsufficientCreditsError as BillingInsufficientCreditsError } from './billing';
import { AuthenticationError, getCurrentUserToken } from './authToken';

export { BillingInsufficientCreditsError as InsufficientCreditsError };

const EVENTS_COLLECTION = 'events';
const EVENTS_API_BASE = '/api/events';

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
}

export interface CreateEventResult {
  id: string;
  isVisible: boolean;
  hiddenReason: string | null;
}

interface PublishEventResponsePayload {
  event?: Partial<CreateEventResult> & { id?: string };
  credits?: Partial<CreditConsumptionResult>;
  error?: string;
  code?: string;
}

export interface CreateEventWithCreditsResult {
  event: CreateEventResult;
  credits: CreditConsumptionResult;
}

const normalizeCreditResult = (payload: Partial<CreditConsumptionResult> | undefined): CreditConsumptionResult => ({
  balance: payload?.balance ?? 0,
  consumed: payload?.consumed ?? 0,
  autoPurchaseTriggered: Boolean(payload?.autoPurchaseTriggered),
  autoPurchaseBundleId: payload?.autoPurchaseBundleId ?? null,
  autoPurchaseCredits: payload?.autoPurchaseCredits ?? null,
  reminderTriggered: Boolean(payload?.reminderTriggered),
  reminderSentAt: payload?.reminderSentAt ?? null
});

export const createEvent = async ({
  values,
  group
}: CreateEventInput): Promise<CreateEventWithCreditsResult> => {
  if (!values.groupId || values.groupId !== group.id) {
    throw new MissingGroupAssociationError();
  }

  let token: string;

  try {
    token = await getCurrentUserToken();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw new Error(error.message);
    }
    throw error instanceof Error ? error : new Error('Authentication required to publish events.');
  }

  const response = await fetch(`${EVENTS_API_BASE}/publish`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      groupId: group.id,
      values
    })
  });

  const body = (await response.json().catch(() => ({}))) as PublishEventResponsePayload;

  if (!response.ok) {
    const message = body.error ?? 'Unable to publish event.';
    if (response.status === 400 && body.code === 'missing_group_association') {
      throw new MissingGroupAssociationError(message);
    }
    if (response.status === 403 && body.code === 'unauthorized_event_creator') {
      throw new UnauthorizedEventCreatorError(message);
    }
    if (response.status === 409 && body.code === 'insufficient_credits') {
      throw new BillingInsufficientCreditsError(message);
    }

    throw new Error(message);
  }

  const eventPayload = body.event ?? {};
  const eventId = typeof eventPayload.id === 'string' ? eventPayload.id : '';

  if (!eventId) {
    throw new Error('Event creation response was malformed.');
  }

  const eventResult: CreateEventResult = {
    id: eventId,
    isVisible: Boolean(eventPayload.isVisible),
    hiddenReason: eventPayload.hiddenReason ?? null
  };

  const credits = normalizeCreditResult(body.credits);

  return { event: eventResult, credits };
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
