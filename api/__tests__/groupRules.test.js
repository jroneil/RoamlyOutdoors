import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OwnershipTransferBlockReason,
  computeGroupSubscriptionTransition,
  hasAvailableGroupCapacity,
  normalizeGroupTitle,
  validateOwnershipTransfer
} from '../services/groupRules.js';

describe('groupRules', () => {
  it('normalizes titles by trimming whitespace and downcasing', () => {
    assert.equal(normalizeGroupTitle('  River   Runners  '), 'river runners');
    assert.equal(normalizeGroupTitle('Álpine CLUB'), 'álpine club');
  });

  it('computes subscription metadata transitions', () => {
    const now = new Date('2024-06-01T10:00:00.000Z');
    const transition = computeGroupSubscriptionTransition({
      currentStatus: 'active',
      nextStatus: 'past_due',
      currentExpiredAt: null,
      now
    });

    assert.equal(transition.subscriptionStatus, 'past_due');
    assert.equal(transition.subscriptionExpiredAt, now.toISOString());
    assert.equal(transition.subscriptionRenewedAt, null);
    assert.equal(transition.subscriptionUpdatedAt, now.toISOString());
  });

  it('detects when group capacity is available', () => {
    assert.equal(hasAvailableGroupCapacity(0, 10), true);
    assert.equal(hasAvailableGroupCapacity(5, 3), true);
    assert.equal(hasAvailableGroupCapacity(3, 3), false);
  });

  it('blocks ownership transfers when subscriptions are inactive', () => {
    const result = validateOwnershipTransfer({
      incomingStatus: 'past_due',
      hasCapacity: true,
      isSameOwner: false
    });

    assert.deepEqual(result, {
      allowed: false,
      reason: OwnershipTransferBlockReason.INACTIVE_SUBSCRIPTION
    });
  });

  it('blocks ownership transfers when quotas are exceeded', () => {
    const result = validateOwnershipTransfer({
      incomingStatus: 'active',
      hasCapacity: false,
      isSameOwner: false
    });

    assert.deepEqual(result, {
      allowed: false,
      reason: OwnershipTransferBlockReason.CAPACITY_EXCEEDED
    });
  });

  it('allows ownership transfer when requirements are met', () => {
    const result = validateOwnershipTransfer({
      incomingStatus: 'active',
      hasCapacity: true,
      isSameOwner: false
    });

    assert.deepEqual(result, { allowed: true });
  });
});
