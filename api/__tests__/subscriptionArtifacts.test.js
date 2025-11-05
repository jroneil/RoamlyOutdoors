import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SUBSCRIPTION_HIDDEN_REASON,
  canCreateGroupWithStatus,
  computeGroupSubscriptionUpdate,
  deriveEventVisibilityChanges,
  isSubscriptionInactive
} from '../services/subscriptionArtifacts.js';

describe('subscriptionArtifacts', () => {
  it('only allows active subscribers to create groups', () => {
    assert.equal(canCreateGroupWithStatus('active'), true);
    assert.equal(canCreateGroupWithStatus('trialing'), false);
    assert.equal(canCreateGroupWithStatus('past_due'), false);
  });

  it('marks groups as expired when status transitions to inactive', () => {
    const now = new Date('2024-04-01T12:00:00.000Z');
    const update = computeGroupSubscriptionUpdate({
      currentStatus: 'active',
      nextStatus: 'past_due',
      currentExpiredAt: null,
      now
    });

    assert.equal(update.subscriptionStatus, 'past_due');
    assert.equal(update.subscriptionExpiredAt, now.toISOString());
    assert.equal(update.subscriptionRenewedAt, null);
    assert.equal(update.subscriptionUpdatedAt, now.toISOString());
  });

  it('clears expiration metadata when a subscription becomes active again', () => {
    const now = new Date('2024-05-01T09:00:00.000Z');
    const update = computeGroupSubscriptionUpdate({
      currentStatus: 'past_due',
      nextStatus: 'active',
      currentExpiredAt: '2024-04-01T00:00:00.000Z',
      now
    });

    assert.equal(update.subscriptionStatus, 'active');
    assert.equal(update.subscriptionExpiredAt, null);
    assert.equal(update.subscriptionRenewedAt, now.toISOString());
  });

  it('identifies statuses that should be considered inactive', () => {
    assert.equal(isSubscriptionInactive('canceled'), true);
    assert.equal(isSubscriptionInactive('none'), true);
    assert.equal(isSubscriptionInactive('active'), false);
  });

  it('hides events created after an expiration time when the subscription is inactive', () => {
    const now = new Date('2024-04-02T12:00:00.000Z');
    const expiredAt = new Date('2024-04-01T12:00:00.000Z');
    const { toHide, toRestore } = deriveEventVisibilityChanges({
      events: [
        {
          id: 'keep-visible',
          createdAt: '2024-03-20T00:00:00.000Z',
          isVisible: true,
          hiddenReason: null
        },
        {
          id: 'hide-me',
          createdAt: '2024-04-02T00:00:00.000Z',
          isVisible: true,
          hiddenReason: null
        },
        {
          id: 'already-hidden',
          createdAt: '2024-04-02T06:00:00.000Z',
          isVisible: false,
          hiddenReason: SUBSCRIPTION_HIDDEN_REASON
        }
      ],
      expiredAt,
      isInactive: true,
      now
    });

    assert.deepEqual(toHide, ['hide-me']);
    assert.deepEqual(toRestore, []);
  });

  it('restores subscription-hidden events once the subscription is active again', () => {
    const now = new Date('2024-04-05T12:00:00.000Z');
    const { toHide, toRestore } = deriveEventVisibilityChanges({
      events: [
        {
          id: 'restore-me',
          createdAt: '2024-04-02T00:00:00.000Z',
          isVisible: false,
          hiddenReason: SUBSCRIPTION_HIDDEN_REASON
        },
        {
          id: 'leave-hidden',
          createdAt: '2024-04-02T00:00:00.000Z',
          isVisible: false,
          hiddenReason: 'manual_moderation'
        }
      ],
      expiredAt: null,
      isInactive: false,
      now
    });

    assert.deepEqual(toHide, []);
    assert.deepEqual(toRestore, ['restore-me']);
  });
});
