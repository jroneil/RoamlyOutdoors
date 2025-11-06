import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  InsufficientCreditsError,
  MissingGroupAssociationError,
  UnauthorizedEventCreatorError,
  publishEventWithCredit
} from '../services/eventPublishing.js';

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

class FakeDocRef {
  constructor(firestore, collectionName, id) {
    this.firestore = firestore;
    this.collectionName = collectionName;
    this.id = id ?? firestore._generateId();
  }

  async get() {
    const collection = this.firestore._ensureCollection(this.collectionName);
    const data = collection[this.id];
    return {
      exists: data !== undefined,
      data: () => clone(data)
    };
  }
}

class FakeCollectionRef {
  constructor(firestore, name) {
    this.firestore = firestore;
    this.name = name;
  }

  doc(id) {
    return new FakeDocRef(this.firestore, this.name, id);
  }
}

const applyUpdates = (target, updates) => {
  const next = clone(target ?? {});
  for (const [path, value] of Object.entries(updates)) {
    const segments = path.split('.');
    let cursor = next;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const key = segments[index];
      if (typeof cursor[key] !== 'object' || cursor[key] === null) {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    cursor[segments.at(-1)] = clone(value);
  }
  return next;
};

class FakeTransaction {
  constructor(firestore) {
    this.firestore = firestore;
    this.operations = [];
  }

  async get(docRef) {
    return docRef.get();
  }

  set(docRef, data) {
    this.operations.push({ type: 'set', docRef, data: clone(data) });
  }

  update(docRef, data) {
    this.operations.push({ type: 'update', docRef, data: clone(data) });
  }

  commit() {
    for (const operation of this.operations) {
      if (operation.type === 'set') {
        this.firestore._setDocument(operation.docRef.collectionName, operation.docRef.id, operation.data);
      } else if (operation.type === 'update') {
        this.firestore._updateDocument(operation.docRef.collectionName, operation.docRef.id, operation.data);
      }
    }
  }
}

class FakeFirestore {
  constructor(seed = {}) {
    this.store = {
      users: clone(seed.users ?? {}),
      groups: clone(seed.groups ?? {}),
      events: clone(seed.events ?? {})
    };
    this._idCounter = 0;
  }

  _ensureCollection(name) {
    if (!this.store[name]) {
      this.store[name] = {};
    }
    return this.store[name];
  }

  _generateId() {
    this._idCounter += 1;
    return `auto-${this._idCounter}`;
  }

  _setDocument(collectionName, id, data) {
    const collection = this._ensureCollection(collectionName);
    collection[id] = clone(data);
  }

  _updateDocument(collectionName, id, updates) {
    const collection = this._ensureCollection(collectionName);
    const current = collection[id];
    if (!current) {
      throw new Error('Document does not exist');
    }
    collection[id] = applyUpdates(current, updates);
  }

  collection(name) {
    this._ensureCollection(name);
    return new FakeCollectionRef(this, name);
  }

  async runTransaction(callback) {
    const transaction = new FakeTransaction(this);
    const result = await callback(transaction);
    transaction.commit();
    return result;
  }
}

const createLedger = (balance) => ({
  balance,
  history: [],
  replenishment: { mode: 'manual', threshold: 5, bundleId: 'starter-10' },
  lastUpdatedAt: null,
  lastAutoPurchaseAt: null,
  lowBalanceEmailSentAt: null
});

describe('eventPublishing service', () => {
  it('creates an event and debits a credit atomically', async () => {
    const firestore = new FakeFirestore({
      users: {
        'user-1': {
          billing: {
            credits: createLedger(3)
          }
        }
      },
      groups: {
        'group-1': {
          ownerId: 'user-1',
          organizerIds: [],
          organizers: [],
          title: 'Summit Seekers',
          subscriptionStatus: 'active',
          subscriptionExpiredAt: null
        }
      }
    });

    const result = await publishEventWithCredit(
      {
        userId: 'user-1',
        groupId: 'group-1',
        values: {
          groupId: 'group-1',
          title: 'Alpine Start',
          description: 'Dawn patrol with the crew.',
          location: 'Trailhead',
          startDate: '2024-06-01T09:00:00.000Z',
          endDate: '2024-06-01T12:00:00.000Z',
          hostName: 'Avery Organizer',
          capacity: 10,
          tags: ['climbing', 'alpine'],
          bannerImage: '',
          groupTitle: 'Summit Seekers',
          feeAmount: '',
          feeCurrency: 'USD',
          feeDescription: '',
          feeDisclosure: ''
        }
      },
      { firestore }
    );

    assert.ok(result.event.id);
    assert.equal(result.event.hiddenReason, null);
    assert.equal(result.credits.balance, 2);
    assert.equal(result.credits.consumed, 1);

    const ledger = firestore.store.users['user-1'].billing.credits;
    assert.equal(ledger.balance, 2);
    assert.equal(ledger.history.length, 1);
    assert.equal(ledger.history[0].amount, 1);
    assert.equal(ledger.history[0].balanceAfter, 2);
    assert.equal(typeof ledger.history[0].occurredAt, 'string');

    const eventEntries = Object.values(firestore.store.events);
    assert.equal(eventEntries.length, 1);
    assert.equal(eventEntries[0].title, 'Alpine Start');
    assert.equal(eventEntries[0].groupId, 'group-1');
    assert.equal(eventEntries[0].createdById, 'user-1');
    assert.deepEqual(eventEntries[0].tags, ['climbing', 'alpine']);
  });

  it('rejects when credits are unavailable', async () => {
    const firestore = new FakeFirestore({
      users: {
        'user-1': {
          billing: { credits: createLedger(0) }
        }
      },
      groups: {
        'group-1': {
          ownerId: 'user-1',
          organizerIds: [],
          organizers: [],
          title: 'Summit Seekers',
          subscriptionStatus: 'active',
          subscriptionExpiredAt: null
        }
      }
    });

    await assert.rejects(
      () =>
        publishEventWithCredit(
          {
            userId: 'user-1',
            groupId: 'group-1',
            values: {
              groupId: 'group-1',
              title: 'Credit Crunch',
              description: 'No credits left.',
              location: 'Nowhere',
              startDate: '2024-06-01T09:00:00.000Z',
              endDate: '2024-06-01T12:00:00.000Z',
              hostName: 'Avery Organizer',
              capacity: 5,
              tags: [],
              bannerImage: '',
              groupTitle: 'Summit Seekers',
              feeAmount: '',
              feeCurrency: 'USD',
              feeDescription: '',
              feeDisclosure: ''
            }
          },
          { firestore }
        ),
      (error) => error instanceof InsufficientCreditsError
    );
  });

  it('requires a valid group association', async () => {
    const firestore = new FakeFirestore({
      users: {
        'user-1': {
          billing: { credits: createLedger(2) }
        }
      },
      groups: {}
    });

    await assert.rejects(
      () =>
        publishEventWithCredit(
          {
            userId: 'user-1',
            groupId: 'group-missing',
            values: {
              groupId: 'group-missing',
              title: 'Lost Group',
              description: 'Should fail.',
              location: 'Unknown',
              startDate: '2024-06-01T09:00:00.000Z',
              endDate: '2024-06-01T12:00:00.000Z',
              hostName: 'Jordan Organizer',
              capacity: 5,
              tags: [],
              bannerImage: '',
              groupTitle: 'Ghosts',
              feeAmount: '',
              feeCurrency: 'USD',
              feeDescription: '',
              feeDisclosure: ''
            }
          },
          { firestore }
        ),
      (error) => error instanceof MissingGroupAssociationError
    );
  });

  it('blocks users who are not organizers', async () => {
    const firestore = new FakeFirestore({
      users: {
        'user-2': {
          billing: { credits: createLedger(2) }
        }
      },
      groups: {
        'group-1': {
          ownerId: 'user-1',
          organizerIds: [],
          organizers: [],
          title: 'Summit Seekers',
          subscriptionStatus: 'active',
          subscriptionExpiredAt: null
        }
      }
    });

    await assert.rejects(
      () =>
        publishEventWithCredit(
          {
            userId: 'user-2',
            groupId: 'group-1',
            values: {
              groupId: 'group-1',
              title: 'Unauthorized',
              description: 'Should fail.',
              location: 'Unknown',
              startDate: '2024-06-01T09:00:00.000Z',
              endDate: '2024-06-01T12:00:00.000Z',
              hostName: 'Jordan Organizer',
              capacity: 5,
              tags: [],
              bannerImage: '',
              groupTitle: 'Ghosts',
              feeAmount: '',
              feeCurrency: 'USD',
              feeDescription: '',
              feeDisclosure: ''
            }
          },
          { firestore }
        ),
      (error) => error instanceof UnauthorizedEventCreatorError
    );
  });
});
