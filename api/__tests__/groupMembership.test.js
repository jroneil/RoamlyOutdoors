import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  demoteMemberFromOrganizer,
  promoteMemberToOrganizer,
  MemberNotInGroupError,
  MemberNotOrganizerError,
  UnauthorizedGroupActionError
} from '../services/groupMembership.js';

class FakeDocRef {
  constructor(store, collectionName, id) {
    this.store = store;
    this.collectionName = collectionName;
    this.id = id;
  }

  async get() {
    const collection = this.store[this.collectionName] ?? {};
    const data = collection[this.id];
    return {
      exists: data !== undefined,
      data: () => data
    };
  }

  async update(payload) {
    const collection = this.store[this.collectionName] ?? {};
    if (!collection[this.id]) {
      throw new Error('Document does not exist');
    }
    collection[this.id] = { ...collection[this.id], ...payload };
  }

  async set(payload, options = {}) {
    const collection = this.store[this.collectionName] ?? {};
    const current = collection[this.id] ?? {};
    collection[this.id] = options.merge ? { ...current, ...payload } : payload;
  }
}

class FakeCollectionRef {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }

  doc(id) {
    return new FakeDocRef(this.store, this.name, id);
  }
}

class FakeFirestore {
  constructor(seed = {}) {
    this.store = {
      groups: { ...(seed.groups ?? {}) },
      users: { ...(seed.users ?? {}) }
    };
  }

  collection(name) {
    if (!this.store[name]) {
      this.store[name] = {};
    }
    return new FakeCollectionRef(this.store, name);
  }
}

describe('groupMembership service', () => {
  it('promotes a group member to organizer and updates their profile', async () => {
    const firestore = new FakeFirestore({
      groups: {
        g1: { ownerId: 'owner-1', members: ['member-1', 'member-2'], organizers: [] }
      },
      users: {
        'member-1': { role: 'member', organizerGroupIds: [], updatedAt: '2024-01-01T00:00:00.000Z' }
      }
    });

    const result = await promoteMemberToOrganizer(
      { groupId: 'g1', ownerId: 'owner-1', memberId: 'member-1' },
      { firestore }
    );

    assert.deepEqual(result.organizers, ['member-1']);
    assert.deepEqual(firestore.store.groups.g1.organizers, ['member-1']);
    assert.equal(firestore.store.users['member-1'].role, 'organizer');
    assert.deepEqual(firestore.store.users['member-1'].organizerGroupIds, ['g1']);
  });

  it('prevents promoting non-members', async () => {
    const firestore = new FakeFirestore({
      groups: {
        g1: { ownerId: 'owner-1', members: ['member-2'], organizers: [] }
      },
      users: {
        'member-1': { role: 'member', organizerGroupIds: [] }
      }
    });

    await assert.rejects(
      () =>
        promoteMemberToOrganizer(
          { groupId: 'g1', ownerId: 'owner-1', memberId: 'member-1' },
          { firestore }
        ),
      (error) => error instanceof MemberNotInGroupError
    );
  });

  it('prevents non-owners from modifying organizers', async () => {
    const firestore = new FakeFirestore({
      groups: {
        g1: { ownerId: 'owner-1', members: ['member-1'], organizers: [] }
      },
      users: {
        'member-1': { role: 'member', organizerGroupIds: [] }
      }
    });

    await assert.rejects(
      () =>
        promoteMemberToOrganizer(
          { groupId: 'g1', ownerId: 'owner-2', memberId: 'member-1' },
          { firestore }
        ),
      (error) => error instanceof UnauthorizedGroupActionError
    );
  });

  it('demotes organizers and resets user role when last assignment is removed', async () => {
    const firestore = new FakeFirestore({
      groups: {
        g1: { ownerId: 'owner-1', members: ['member-1'], organizers: ['member-1'] }
      },
      users: {
        'member-1': { role: 'organizer', organizerGroupIds: ['g1'] }
      }
    });

    const result = await demoteMemberFromOrganizer(
      { groupId: 'g1', ownerId: 'owner-1', memberId: 'member-1' },
      { firestore }
    );

    assert.deepEqual(result.organizers, []);
    assert.deepEqual(firestore.store.groups.g1.organizers, []);
    assert.equal(firestore.store.users['member-1'].role, 'member');
    assert.deepEqual(firestore.store.users['member-1'].organizerGroupIds, []);
  });

  it('blocks demotions when the user is not an organizer', async () => {
    const firestore = new FakeFirestore({
      groups: {
        g1: { ownerId: 'owner-1', members: ['member-1'], organizers: [] }
      },
      users: {
        'member-1': { role: 'member', organizerGroupIds: [] }
      }
    });

    await assert.rejects(
      () =>
        demoteMemberFromOrganizer(
          { groupId: 'g1', ownerId: 'owner-1', memberId: 'member-1' },
          { firestore }
        ),
      (error) => error instanceof MemberNotOrganizerError
    );
  });
});
