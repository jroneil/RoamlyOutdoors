import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  getNearbyGroups,
  setGeocodeProvider,
  setFirestoreProvider,
  clearNearbyGroupsCache,
  InvalidLocationInputError,
  PostalCodeValidationError,
  PostalCodeNotFoundError,
  GeocodingServiceError
} from '../services/nearbyGroups.js';
import { clearGeocodeCache } from '../services/geocoding.js';

const createFirestoreStub = (documents) => ({
  collection: (name) => {
    if (name !== 'groups') {
      return {
        get: async () => ({
          forEach: () => {}
        })
      };
    }
    return {
      get: async () => ({
        forEach: (callback) => {
          documents.forEach((doc) => {
            callback({
              id: doc.id,
              data: () => doc.data
            });
          });
        }
      })
    };
  }
});

describe('getNearbyGroups', () => {
  let firestoreDocuments;

  beforeEach(() => {
    firestoreDocuments = [
      {
        id: 'g-seattle',
        data: {
          title: 'Seattle Mountaineers',
          location: {
            coordinates: { latitude: 47.61, longitude: -122.33 },
            city: 'Seattle',
            state: 'WA',
            country: 'US',
            postalCode: '98101'
          },
          activities: ['hiking', 'climbing'],
          members: ['a', 'b', 'c']
        }
      },
      {
        id: 'g-bellevue',
        data: {
          title: 'Bellevue Trail Runners',
          location: {
            coordinates: { latitude: 47.61, longitude: -122.2 },
            city: 'Bellevue',
            state: 'WA',
            country: 'US',
            postalCode: '98004'
          },
          activities: ['running'],
          members: ['x', 'y']
        }
      },
      {
        id: 'g-portland',
        data: {
          title: 'Portland Paddlers',
          location: {
            coordinates: { latitude: 45.52, longitude: -122.68 },
            city: 'Portland',
            state: 'OR',
            country: 'US',
            postalCode: '97201'
          },
          activities: ['kayaking'],
          members: ['p', 'q', 'r']
        }
      }
    ];

    setFirestoreProvider(() => createFirestoreStub(firestoreDocuments));
    setGeocodeProvider(async ({ postalCode }) => {
      if (!/^\d{5}$/.test(postalCode)) {
        throw new PostalCodeValidationError();
      }
      if (postalCode === '98101') {
        return {
          latitude: 47.61,
          longitude: -122.33,
          postalCode: '98101',
          country: 'US',
          source: 'provider'
        };
      }
      throw new PostalCodeNotFoundError();
    });
    clearNearbyGroupsCache();
    clearGeocodeCache();
  });

  afterEach(() => {
    setGeocodeProvider();
    setFirestoreProvider();
    clearNearbyGroupsCache();
    clearGeocodeCache();
  });

  it('returns groups sorted by distance with metadata', async () => {
    const result = await getNearbyGroups({ postalCode: '98101', radius: 50, units: 'mi' });

    assert.ok(result.center);
    assert.equal(result.center?.lat.toFixed(2), '47.61');
    assert.equal(result.groups.length, 2);
    assert.equal(result.totalResults, 2);
    assert.equal(result.groups[0].id, 'g-seattle');
    assert.equal(result.groups[0].distanceMiles, 0);
    assert.equal(result.groups[0].postalCode, '98101');
    assert.ok(result.radiusMeters > 0);
  });

  it('prioritizes exact postal matches when requested', async () => {
    firestoreDocuments.push({
      id: 'g-second-seattle',
      data: {
        title: 'Second Seattle Group',
        location: {
          coordinates: { latitude: 47.62, longitude: -122.32 },
          city: 'Seattle',
          state: 'WA',
          country: 'US',
          postalCode: '98101'
        },
        activities: ['cycling'],
        members: ['k']
      }
    });
    clearNearbyGroupsCache();

    const result = await getNearbyGroups({
      postalCode: '98101',
      radius: 50,
      units: 'mi',
      exactPostalCode: true
    });

    assert.equal(result.groups[0].postalCode, '98101');
    assert.equal(result.groups[1].postalCode, '98101');
  });

  it('throws when no location is provided', async () => {
    await assert.rejects(() => getNearbyGroups({}), InvalidLocationInputError);
  });

  it('surfaces postal lookup errors from the geocoder', async () => {
    await assert.rejects(
      () => getNearbyGroups({ postalCode: '99999' }),
      PostalCodeNotFoundError
    );

    setGeocodeProvider(async () => {
      throw new GeocodingServiceError('geocoder down');
    });

    await assert.rejects(
      () => getNearbyGroups({ postalCode: '98101' }),
      GeocodingServiceError
    );
  });

  it('validates postal formats', async () => {
    await assert.rejects(
      () => getNearbyGroups({ postalCode: '98-101' }),
      PostalCodeValidationError
    );
  });
});
