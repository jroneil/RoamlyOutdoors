import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SUBSCRIPTION_HIDDEN_REASON,
  deriveInitialEventVisibility,
  normalizeEventFee,
  userCanManageGroup
} from '../eventRules.js';

describe('eventRules', () => {
  it('allows owners and organizers to manage their groups', () => {
    const group = {
      ownerId: 'owner-1',
      organizerIds: ['organizer-1', 'organizer-2']
    };

    assert.equal(userCanManageGroup(group, 'owner-1'), true);
    assert.equal(userCanManageGroup(group, 'organizer-2'), true);
    assert.equal(userCanManageGroup(group, 'stranger'), false);
    assert.equal(userCanManageGroup(group, undefined), false);
  });

  it('normalizes paid event fees and applies a default disclosure', () => {
    const fee = normalizeEventFee({
      amount: '12.50',
      currency: 'usd',
      description: 'Permit fee',
      disclosure: ''
    });

    assert.equal(fee.amountCents, 1250);
    assert.equal(fee.currency, 'USD');
    assert.equal(fee.description, 'Permit fee');
    assert.equal(typeof fee.disclosure, 'string');
    assert.notEqual(fee.disclosure, null);
  });

  it('strips fee metadata when the amount is not positive', () => {
    const fee = normalizeEventFee({ amount: '0', currency: 'USD' });

    assert.equal(fee.amountCents, null);
    assert.equal(fee.currency, null);
    assert.equal(fee.description, null);
    assert.equal(fee.disclosure, null);
  });

  it('suppresses visibility when the subscription is inactive', () => {
    const now = new Date('2024-06-01T12:00:00.000Z');
    const visibility = deriveInitialEventVisibility({
      group: { subscriptionStatus: 'past_due', subscriptionExpiredAt: '2024-05-01T00:00:00.000Z' },
      now
    });

    assert.equal(visibility.isVisible, false);
    assert.equal(visibility.hiddenReason, SUBSCRIPTION_HIDDEN_REASON);
    assert.equal(visibility.hiddenAt, now.toISOString());
  });

  it('keeps events visible when the subscription is active', () => {
    const visibility = deriveInitialEventVisibility({
      group: { subscriptionStatus: 'active', subscriptionExpiredAt: null }
    });

    assert.equal(visibility.isVisible, true);
    assert.equal(visibility.hiddenReason, null);
    assert.equal(visibility.hiddenAt, null);
  });
});
