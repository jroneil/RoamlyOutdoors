# Make event publishing credit charges atomic

## Background
- The event creation flow in the client currently invokes [`consumeCreditsForEventPublish`](../../src/services/billing.ts) and immediately follows it with [`createEvent`](../../src/services/events.ts).
- Both functions are called from the [`CreateEventForm` submit handler](../../src/components/CreateEventForm.tsx) without any shared transaction boundary, so credit consumption succeeds even if the Firestore write later fails.
- Network hiccups, Firestore permission errors, or validation mistakes can therefore charge a credit without producing an event, leaving organizers with an inconsistent experience.

## Problem statement
We need to guarantee that charging a publication credit and creating the event either both succeed or both fail. Doing so protects a scarce, billable resource and avoids manual support interventions to refund credits when Firestore rejects the write.

## Desired outcomes
- The organizer never loses a credit unless the corresponding event document is successfully created.
- Any failure in the event creation process leaves the user's credit balance untouched.
- The implementation fits into the roadmap to move sensitive writes behind trusted services.

## Proposed direction
1. Shift the responsibility for consuming credits and creating the event into a trusted backend surface (Cloud Function, Express route, or similar) that can execute both operations within a single transaction.
2. The backend entry point should:
   - Verify the caller's identity and entitlement to publish events for the specified group.
   - Consume one credit from the billing service within a transaction or via a compensating update if the subsequent Firestore write fails.
   - Write the event document to Firestore using the same validation rules currently present in `createEvent`.
   - Roll back the credit consumption if the Firestore write throws or times out.
3. Expose a single client callable (e.g., `publishEventWithCredit`) that replaces the current two-step sequence in `CreateEventForm`.
4. Update UI messaging to reflect the single step (progress indicator, error handling, and success states).

## Implementation notes
- Audit the existing billing API to confirm whether it already offers transactional semantics. If not, introduce an endpoint that charges credits and returns a transaction token that can be rolled back if needed.
- Consider leveraging Firestore transactions to wrap the credit balance document update and event creation when both resources live in Firestore.
- Ensure retries on idempotent operations so intermittent failures do not double-charge credits.
- Expand automated tests to cover the new backend pathway and update any affected frontend mocks.

## Acceptance criteria
- Attempting to publish an event when Firestore rejects the write (e.g., simulated permission error) leaves the user's credit balance unchanged.
- Successful publishes decrement the credit balance exactly once and persist the event document.
- The old direct `consumeCreditsForEventPublish` + `createEvent` pairing is no longer used by the UI.
- Unit and/or integration tests cover both success and failure cases of the transactional flow.
