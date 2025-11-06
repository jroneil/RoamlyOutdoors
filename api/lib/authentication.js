import { getFirebaseAdmin } from '../firebaseAdmin.js';

const extractBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') {
    return null;
  }

  const parts = authorizationHeader.split(' ');
  if (parts.length < 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme) || !token) {
    return null;
  }

  return token.trim();
};

export const requireAuthentication = async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers?.authorization);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const admin = getFirebaseAdmin();

    if (!admin?.auth) {
      console.error('Firebase admin not configured.');
      return res.status(503).json({ error: 'Authentication service unavailable.' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (error) {
      console.warn('Failed to verify authentication token.', error);
      return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }

    req.user = {
      uid: decoded?.uid ?? null,
      token: decoded
    };
    res.locals.user = req.user;

    if (!req.user.uid) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    return next();
  } catch (error) {
    console.error('Unexpected authentication error.', error);
    return res.status(500).json({ error: 'Authentication failed unexpectedly.' });
  }
};

export default requireAuthentication;
