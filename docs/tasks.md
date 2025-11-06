# Task Backlog

## Vital

- [ ] Make event publishing credit charges atomic. Currently the UI calls `consumeCreditsForEventPublish` and immediately subtracts a credit before attempting `createEvent`. If the Firestore write fails or the browser loses connectivity, the user still loses the credit because there is no rollback path. Wrap the credit debit and event creation in a backend transaction (or add a compensating API) so either both steps succeed or both fail.
- [ ] Move event creation behind a trusted service that enforces credits and subscriptions. The client can call `createEvent` directly against Firestore, so anyone with console access could bypass the billing flow by skipping the `consumeCreditsForEventPublish` call. Shift the write to a callable Cloud Function or authenticated API that checks the user’s entitlements server-side to close that hole.
- [ ] Lock down organizer promotion and demotion endpoints. The Express routes accept an `ownerId` supplied in the request body and rely on it for authorization, so a malicious client could claim to be the owner and elevate accounts. Require Firebase auth/ID tokens (or similar) and derive the acting user from the verified token before invoking the membership service.

## Optional

- [ ] Replace the hard-coded home dashboard content with live data. `fetchHomeContent` only returns mocked banner stats, events, and groups, so the page never reflects the user’s real Firestore state. Hook it into the actual collections (or your API) and reuse the existing loading/error plumbing in `useHomeContent`.
- [ ] Swap the static “nearby groups” dataset for a geospatial source. The API currently filters a fixed array in `getNearbyGroups`, so results never change. Integrate a Firestore/Algolia/Maps query (and caching) to align the experience with production expectations.
- [ ] Add focused tests around the location lookup hook. `useNearbyGroups` juggles geolocation fallbacks, postal-code searches, and abort handling with several mutable refs. Add React Testing Library coverage (mocking `navigator.geolocation` and the fetch layer) to guard against regressions in those flows.
