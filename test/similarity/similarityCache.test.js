/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { expect } from 'chai';
import esmock from 'esmock';

// Helper to create module under test with mocks
async function loadModuleWith({ entries = [] } = {}) {
  const mod = await esmock('../../lib/services/similarity-check/similarityCache.js', {
    // Mock the storage to return our controlled entries
    '../../lib/services/storage/listingsStorage.js': {
      getAllEntriesFromListings: () => entries,
    },
  });
  return mod;
}

describe('similarityCache', () => {
  it('initSimilarityCache builds cache from storage and enables duplicate detection', async () => {
    const entries = [
      { title: 'A', price: 1000, address: 'Main 1' },
      { title: 'B', price: 0, address: 'Zero St' },
    ];

    const { initSimilarityCache, checkAndAddEntry } = await loadModuleWith({ entries });

    // Initially, duplicates should not be detected for new data
    expect(checkAndAddEntry({ title: 'X', price: 200, address: 'Y' })).to.equal(false);

    // Now initialize from storage
    initSimilarityCache();

    // Exact duplicates should be detected
    expect(checkAndAddEntry({ title: 'A', price: 1000, address: 'Main 1' })).to.equal(true);
    // Ensure falsy-but-valid price 0 is preserved by hashing and detected as duplicate
    expect(checkAndAddEntry({ title: 'B', price: 0, address: 'Zero St' })).to.equal(true);
  });

  it('checkAndAddEntry returns false for new entry then true for duplicate on second call', async () => {
    const { checkAndAddEntry } = await loadModuleWith();

    const first = checkAndAddEntry({ title: 'C', price: 300, address: 'Road 3' });
    const second = checkAndAddEntry({ title: 'C', price: 300, address: 'Road 3' });

    expect(first).to.equal(false);
    expect(second).to.equal(true);
  });

  it('hashing ignores null/undefined but preserves 0 via behavior', async () => {
    const { checkAndAddEntry } = await loadModuleWith();

    // Add baseline (null address ignored)
    const add1 = checkAndAddEntry({ title: 'T', price: 1, address: null });
    expect(add1).to.equal(false);
    // Duplicate with undefined address should match
    const dup = checkAndAddEntry({ title: 'T', price: 1, address: undefined });
    expect(dup).to.equal(true);

    // Now test that price 0 is preserved (not filtered out)
    const addZero = checkAndAddEntry({ title: 'Z', price: 0, address: 'Zero' });
    expect(addZero).to.equal(false);
    const dupZero = checkAndAddEntry({ title: 'Z', price: 0, address: 'Zero' });
    expect(dupZero).to.equal(true);
  });

  describe('normalizePrice', () => {
    it('normalizes different price formats to the same integer', async () => {
      const { normalizePrice } = await loadModuleWith();

      // All of these represent 1200
      expect(normalizePrice('1.200 €')).to.equal(1200);
      expect(normalizePrice('1.200€')).to.equal(1200);
      expect(normalizePrice(1200)).to.equal(1200);
      expect(normalizePrice('1200')).to.equal(1200);
    });

    it('handles null/undefined', async () => {
      const { normalizePrice } = await loadModuleWith();
      expect(normalizePrice(null)).to.equal(null);
      expect(normalizePrice(undefined)).to.equal(null);
    });

    it('rounds decimal prices', async () => {
      const { normalizePrice } = await loadModuleWith();
      expect(normalizePrice(1200.5)).to.equal(1201);
      expect(normalizePrice('1200,50')).to.equal(1201);
    });
  });

  describe('normalizeAddress', () => {
    it('matches addresses with abbreviation differences', async () => {
      const { normalizeAddress } = await loadModuleWith();

      expect(normalizeAddress('Berliner Str. 5')).to.equal(normalizeAddress('Berliner Strasse 5'));
    });

    it('matches addresses with umlaut differences', async () => {
      const { normalizeAddress } = await loadModuleWith();

      expect(normalizeAddress('Königstraße 10')).to.equal(normalizeAddress('koenigstrasse 10'));
    });

    it('strips postal codes', async () => {
      const { normalizeAddress } = await loadModuleWith();

      expect(normalizeAddress('10115 Berlin')).to.equal(normalizeAddress('Berlin'));
    });

    it('drops text after comma', async () => {
      const { normalizeAddress } = await loadModuleWith();

      expect(normalizeAddress('Mitte, Berlin')).to.equal(normalizeAddress('Mitte'));
    });

    it('handles null/undefined', async () => {
      const { normalizeAddress } = await loadModuleWith();
      expect(normalizeAddress(null)).to.equal(null);
      expect(normalizeAddress(undefined)).to.equal(null);
    });
  });

  describe('normalizeTitle', () => {
    it('matches titles with filler word differences', async () => {
      const { normalizeTitle } = await loadModuleWith();

      expect(normalizeTitle('Wohnung mit Balkon')).to.equal(normalizeTitle('Wohnung Balkon'));
    });

    it('matches titles with abbreviation differences', async () => {
      const { normalizeTitle } = await loadModuleWith();

      expect(normalizeTitle('3 Zi. Whg.')).to.equal(normalizeTitle('3 Zimmer Wohnung'));
    });

    it('matches titles with umlaut differences', async () => {
      const { normalizeTitle } = await loadModuleWith();

      expect(normalizeTitle('Schöne Wohnung')).to.equal(normalizeTitle('schoene wohnung'));
    });

    it('handles null/undefined', async () => {
      const { normalizeTitle } = await loadModuleWith();
      expect(normalizeTitle(null)).to.equal(null);
      expect(normalizeTitle(undefined)).to.equal(null);
    });
  });

  describe('cross-provider duplicate detection', () => {
    it('detects same listing with different price formatting', async () => {
      const { checkAndAddEntry } = await loadModuleWith();

      // Provider A stores price as "1.200 €"
      const first = checkAndAddEntry({ title: '3 Zimmer Wohnung', price: '1.200 €', address: 'Berlin' });
      // Provider B stores price as numeric 1200
      const second = checkAndAddEntry({ title: '3 Zimmer Wohnung', price: 1200, address: 'Berlin' });

      expect(first).to.equal(false);
      expect(second).to.equal(true);
    });

    it('detects same listing with DB numeric price vs provider string price', async () => {
      // Simulates the bug: cache is seeded from DB (numeric) but checked against raw string
      const entries = [{ title: 'Nice Flat', price: 800, address: 'Munich' }];
      const { initSimilarityCache, checkAndAddEntry } = await loadModuleWith({ entries });

      initSimilarityCache();

      // Provider sends "800 €" as string - should match the DB entry of 800
      expect(checkAndAddEntry({ title: 'Nice Flat', price: '800 €', address: 'Munich' })).to.equal(true);
    });

    it('detects same listing with different title abbreviations across providers', async () => {
      const { checkAndAddEntry } = await loadModuleWith();

      const first = checkAndAddEntry({ title: '3 Zi. Whg. mit Balkon', price: 900, address: 'Hamburg' });
      const second = checkAndAddEntry({ title: '3 Zimmer Wohnung Balkon', price: 900, address: 'Hamburg' });

      expect(first).to.equal(false);
      expect(second).to.equal(true);
    });
  });
});
