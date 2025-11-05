# Monetization Roadmap

This roadmap outlines the core workstreams required to evolve Roamly Outdoors into a scalable, monetized platform. Items retain the original numbering, with tasks 3 and 4 merged to reflect the combined subscription and credit-package workstream.

1. **Design scalable architecture and hosting**
   - Define traffic expectations and multi-tenant requirements.
   - Select a cloud platform (AWS/GCP/Azure) with auto-scaling, managed databases, caches, and object storage.
   - Establish infrastructure-as-code foundations plus observability and backup strategies.

2. **Implement account system with roles and billing hooks**
   - Add sign-up/login with email or social providers.
   - Expand user records to capture roles (admin, organizer, attendee) and billing identifiers.
   - Guard privileged routes via role-aware middleware and expose profile UIs that surface billing data.

3. **Unify subscription billing and event credit packages**
   - Configure Stripe products and prices for recurring plans and pay-as-you-go credit bundles.
   - Build checkout flows that handle both subscription sign-ups and one-time credit purchases from the billing UI.
   - Store subscription status, credit balance, and Stripe identifiers in the backend; synchronize via webhooks.
   - Deduct credits on event publication, block actions when balances are depleted, and notify organizers as thresholds are reached.
   - Support prorations, cancellations, and top-ups so customers can fluidly move between recurring plans and credit bundles.

4. **Event management enhancements**
   - Extend schemas to track plan entitlements and enforce quotas.
   - Provide tooling for event cloning, tagging, bulk updates, and audit logging.

5. **Analytics and usage dashboards**
   - Aggregate event and billing signals into analytics tables.
   - Deliver organizer/admin dashboards that chart usage versus limits, revenue, and credit consumption.

6. **Automated testing, deployment, and monitoring**
   - Expand CI/CD to cover tests, linting, builds, and infrastructure deployments.
   - Integrate security scans, observability, and incident response runbooks.

7. **Documentation and onboarding**
   - Produce internal architecture and billing integration guides.
   - Create customer-facing help content for managing subscriptions and credit packs.
   - Maintain support runbooks for refunds, plan changes, and SLA updates.

