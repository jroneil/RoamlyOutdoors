import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  geocodePostalCode,
  PostalCodeValidationError,
  PostalCodeNotFoundError,
  GeocodingServiceError,
  clearGeocodeCache
} from '../services/geocoding.js';

const createResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

const createFetchStub = (responses) => {
  let callCount = 0;
  const queue = Array.isArray(responses) ? [...responses] : [];

  const fetchStub = async (_url, _init = {}) => {
    callCount += 1;
    if (typeof responses === 'function') {
      return responses(callCount, _url, _init);
    }
    if (!queue.length) {
      throw new Error('Unexpected fetch call');
    }
    return queue.shift();
  };

  fetchStub.getCallCount = () => callCount;
  return fetchStub;
};

describe('geocodePostalCode', () => {
  beforeEach(() => {
    clearGeocodeCache();
  });

  it('validates postal codes before calling the provider', async () => {
    const fetchStub = createFetchStub([]);
    await assert.rejects(
      () => geocodePostalCode({ postalCode: 'ABC123' }, { fetchImpl: fetchStub, provider: 'NOMINATIM' }),
      PostalCodeValidationError
    );
    assert.equal(fetchStub.getCallCount(), 0);
  });

  it('throws when the provider returns no results', async () => {
    const fetchStub = createFetchStub([createResponse(200, [])]);
    await assert.rejects(
      () => geocodePostalCode({ postalCode: '99999' }, { fetchImpl: fetchStub, provider: 'NOMINATIM' }),
      PostalCodeNotFoundError
    );
    assert.equal(fetchStub.getCallCount(), 1);
  });

  it('caches successful lookups', async () => {
    const fetchStub = createFetchStub([
      createResponse(200, [{ lat: '47.6101', lon: '-122.3364' }])
    ]);

    const first = await geocodePostalCode(
      { postalCode: '98101' },
      { fetchImpl: fetchStub, provider: 'NOMINATIM', now: () => 1000 }
    );
    assert.equal(first.postalCode, '98101');
    assert.equal(first.source, 'provider');

    const second = await geocodePostalCode(
      { postalCode: '98101' },
      { fetchImpl: fetchStub, provider: 'NOMINATIM', now: () => 2000 }
    );
    assert.equal(second.source, 'cache');
    assert.equal(fetchStub.getCallCount(), 1);
  });

  it('wraps provider failures in GeocodingServiceError', async () => {
    const fetchStub = createFetchStub([createResponse(500, { error: 'boom' })]);
    await assert.rejects(
      () => geocodePostalCode({ postalCode: '98101' }, { fetchImpl: fetchStub, provider: 'NOMINATIM' }),
      GeocodingServiceError
    );
    assert.equal(fetchStub.getCallCount(), 2);
  });
});
