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
import { requireAuthentication } from '../lib/authentication.js';
import {
  getNearbyGroups,
  InvalidLocationInputError,
  LocationServiceUnavailableError,
  PostalCodeValidationError,
  PostalCodeNotFoundError,
  GeocodingServiceError
} from '../services/nearbyGroups.js';

const router = express.Router();

const RATE_LIMIT_MAX_REQUESTS = (() => {
  const parsed = Number.parseInt(process.env.SEARCH_RATE_LIMIT_MAX_REQUESTS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

const RATE_LIMIT_WINDOW_MS = (() => {
  const parsed = Number.parseInt(process.env.SEARCH_RATE_LIMIT_WINDOW_SECONDS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : 5 * 60 * 1000;
})();

const rateLimitBuckets = new Map();

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

const consumeRateLimit = (key) => {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.expiresAt <= now) {
    rateLimitBuckets.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  existing.count += 1;
  return false;
};

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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

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

const parseBoolean = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

router.get('/nearby', async (req, res) => {
  const clientIp = getClientIp(req);

  if (consumeRateLimit(clientIp)) {
    res.status(429).json({ error: 'Too many location searches. Please wait and try again.' });
    return;
  }

  const {
    lat,
    lng,
    postalCode,
    limit,
    radiusMiles,
    radius,
    units,
    country,
    page,
    pageSize,
    exactPostalCode
  } = req.query;

  try {
    const result = await getNearbyGroups({
      latitude: parseNumber(lat ?? req.query.latitude),
      longitude: parseNumber(lng ?? req.query.longitude),
      postalCode,
      country: typeof country === 'string' ? country : undefined,
      limit: parseNumber(limit),
      radiusMiles: parseNumber(radiusMiles),
      radius: parseNumber(radius),
      units: typeof units === 'string' ? units : undefined,
      page: parseNumber(page),
      pageSize: parseNumber(pageSize),
      exactPostalCode: parseBoolean(String(exactPostalCode ?? ''))
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load nearby groups.';

    if (error instanceof LocationServiceUnavailableError) {
      res.status(503).json({ error: message });
      return;
    }

    if (error instanceof InvalidLocationInputError || error instanceof PostalCodeValidationError) {
      res.status(400).json({ error: message });
      return;
    }

    if (error instanceof PostalCodeNotFoundError) {
      res.status(404).json({ error: message });
      return;
    }

    if (error instanceof GeocodingServiceError) {
      res.status(502).json({ error: message });
      return;
    }

    res.status(500).json({ error: message });
  }
});

router.post('/:groupId/organizers', requireAuthentication, async (req, res) => {
  const { groupId } = req.params;
  const { memberId } = req.body ?? {};
  const ownerId = req.user?.uid;

  if (!ownerId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!memberId) {
    return res.status(400).json({ error: 'memberId is required' });
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

router.delete('/:groupId/organizers/:memberId', requireAuthentication, async (req, res) => {
  const { groupId, memberId } = req.params;
  const ownerId = req.user?.uid;

  if (!ownerId) {
    return res.status(401).json({ error: 'Authentication required.' });
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
