# Group and Event Subscription Requirements

## Subscription Tiers
- **Basic user**: Must register to use the site. May join groups and, once a member, may participate in events that the group hosts. No subscription fee required.
- **Premium user**: Has all access granted to a basic user plus any premium benefits the product team defines.
- **Owner**: Holds all permissions of a basic or premium user and additionally manages groups subject to subscription status.

## Subscription Gating Rules
- No user may create a group or event without an active subscription.
- If a subscription expires, new event creation is blocked. Events created after the expiration are hidden until the subscription is renewed.
- If a subscription remains expired for 30 days, delete the group and event history associated with that subscription.

## Group Management
- Owners can create and edit groups; every group name must be unique across the system.
- Each group tracks a fee. Package deals can allow an owner to create multiple groups, but once the quota is consumed the owner must purchase additional capacity.
- An owner can manage more than one group simultaneously.
- Owners may enable an optional screening workflow to accept or decline join requests. The screening feature can be toggled on or off per group.
- Owners can transfer ownership of a group to another user. The incoming owner assumes responsibility for all fees, provided the existing subscription remains valid.

## Membership and Roles
- Owners may promote any existing group member to the **organizer** role. Organizers are standard (basic or premium) users who can manage events for that specific group.
- To become an organizer, a user must first join the group as a member.

## Event Governance
- Events can only be created for an existing group.
- Owners and organizers may create events solely for the groups they belong to.
- Groups can host free or paid events. The event creation flow must capture any associated fee and clearly disclose it to participants.
- If a subscription expires, suppress visibility of events created after the expiration until the subscription is renewed.
