import express from 'express';
import {
  demoteMemberFromOrganizer,
  promoteMemberToOrganizer,
  FirestoreUnavailableError,
  GroupMembershipError,
  GroupNotFoundError,
  MemberNotInGroupError,
  MemberNotOrganizerError,
  MemberProfileMissingError,
  UnauthorizedGroupActionError
} from '../services/groupMembership.js';
import { getNearbyGroups } from '../services/nearbyGroups.js';

const router = express.Router();

const mapErrorToStatus = (error) => {
  if (error instanceof FirestoreUnavailableError) {
    return 503;
  }
  if (error instanceof GroupNotFoundError || error instanceof MemberProfileMissingError) {
    return 404;
  }
  if (error instanceof UnauthorizedGroupActionError) {
    return 403;
  }
  if (error instanceof MemberNotInGroupError) {
    return 400;
  }
  if (error instanceof MemberNotOrganizerError) {
    return 409;
  }
  if (error instanceof GroupMembershipError) {
    return 400;
  }
  return 500;
};

const parseNumber = (value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

router.get('/nearby', (req, res) => {
  const { lat, lng, postalCode, limit, radiusMiles } = req.query;

  try {
    const groups = getNearbyGroups({
      latitude: parseNumber(lat),
      longitude: parseNumber(lng),
      postalCode,
      limit: parseNumber(limit),
      radiusMiles: parseNumber(radiusMiles)
    });

    res.json({ groups });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load nearby groups.';
    res.status(400).json({ error: message });
  }
});

router.post('/:groupId/organizers', async (req, res) => {
  const { groupId } = req.params;
  const { ownerId, memberId } = req.body ?? {};

  if (!ownerId || !memberId) {
    return res.status(400).json({ error: 'ownerId and memberId are required' });
  }

  try {
    const result = await promoteMemberToOrganizer({ groupId, ownerId, memberId });
    res.json(result);
  } catch (error) {
    console.error('Failed to promote organizer', error);
    const status = mapErrorToStatus(error);
    const message = error instanceof Error ? error.message : 'Unable to promote organizer.';
    res.status(status).json({ error: message });
  }
});

router.delete('/:groupId/organizers/:memberId', async (req, res) => {
  const { groupId, memberId } = req.params;
  const { ownerId } = req.body ?? {};

  if (!ownerId) {
    return res.status(400).json({ error: 'ownerId is required' });
  }

  try {
    const result = await demoteMemberFromOrganizer({ groupId, ownerId, memberId });
    res.json(result);
  } catch (error) {
    console.error('Failed to demote organizer', error);
    const status = mapErrorToStatus(error);
    const message = error instanceof Error ? error.message : 'Unable to demote organizer.';
    res.status(status).json({ error: message });
  }
});

export default router;
