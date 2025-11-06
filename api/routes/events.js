import express from 'express';
import {
  FirestoreUnavailableError,
  InsufficientCreditsError,
  InvalidEventInputError,
  MissingGroupAssociationError,
  SubscriptionInactiveError,
  UnauthorizedEventCreatorError,
  publishEventWithCredit
} from '../services/eventPublishing.js';

const router = express.Router();

const mapErrorToStatus = (error) => {
  if (error instanceof FirestoreUnavailableError) {
    return 503;
  }
  if (error instanceof MissingGroupAssociationError) {
    return 400;
  }
  if (error instanceof InvalidEventInputError) {
    return 400;
  }
  if (error instanceof UnauthorizedEventCreatorError) {
    return 403;
  }
  if (error instanceof InsufficientCreditsError) {
    return 409;
  }
  if (error instanceof SubscriptionInactiveError) {
    return 409;
  }
  return 500;
};

const mapErrorToCode = (error) => {
  if (error instanceof FirestoreUnavailableError) {
    return 'firestore_unavailable';
  }
  if (error instanceof MissingGroupAssociationError) {
    return 'missing_group_association';
  }
  if (error instanceof InvalidEventInputError) {
    return 'invalid_event_input';
  }
  if (error instanceof UnauthorizedEventCreatorError) {
    return 'unauthorized_event_creator';
  }
  if (error instanceof InsufficientCreditsError) {
    return 'insufficient_credits';
  }
  if (error instanceof SubscriptionInactiveError) {
    return 'subscription_inactive';
  }
  return 'unknown_error';
};

router.post('/publish', async (req, res) => {
  const { userId, values, groupId } = req.body ?? {};

  try {
    const result = await publishEventWithCredit({ userId, values, groupId });
    res.json(result);
  } catch (error) {
    console.error('Failed to publish event with credits', error);
    const status = mapErrorToStatus(error);
    const code = mapErrorToCode(error);
    const message = error instanceof Error ? error.message : 'Unable to publish event.';
    res.status(status).json({ error: message, code });
  }
});

export default router;
