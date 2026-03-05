/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

/**
 * Similarity cache
 *
 * Maintains an in-memory Set of content hashes to detect whether a listing
 * (identified by a normalized tuple of title, price and address) has been seen before.
 *
 * Design notes:
 * - The cache is refreshed periodically from persistent storage. To avoid
 *   modification-during-iteration issues, the refresh builds a new Set and
 *   atomically swaps the reference instead of mutating in place.
 * - Normalization functions ensure that different formatting of the same
 *   listing (e.g., "1.200 €" vs 1200) produces the same hash.
 *
 * This module has no persistence of its own; it relies on
 * getAllEntriesFromListings() for data hydration.
 * @module similarityCache
 */
import crypto from 'crypto';
import { getAllEntriesFromListings } from '../storage/listingsStorage.js';

/** @type {number} Refresh interval in milliseconds (defaults to one hour). */
const reloadCycle = 60 * 60 * 1000; // every hour, refresh

/**
 * Internal cache of content hashes for known listings.
 *
 * Each entry is an SHA-256 hex digest produced by toHash().
 * @type {Set<string>}
 */
let cache = new Set();

export const startSimilarityCacheReloader = () => {
  // Periodically refresh the cache from storage
  setInterval(() => {
    initSimilarityCache();
  }, reloadCycle);
};

/**
 * Extract a numeric integer from any price format.
 * Handles strings like "1.200 €", "1,200€", "1200", or numeric values.
 *
 * @param {string|number|null|undefined} price
 * @returns {number|null}
 */
export function normalizePrice(price) {
  if (price === null || price === undefined) return null;
  if (typeof price === 'number') return Math.round(price);
  const cleaned = String(price).replace(/[^\d.,]/g, '');
  if (cleaned === '') return null;
  // Remove dots used as thousands separators, then treat comma as decimal
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Normalize an address string for comparison.
 * Lowercase, ß→ss, umlauts→ascii, expand abbreviations, strip postal codes,
 * drop text after comma, collapse whitespace.
 *
 * @param {string|null|undefined} address
 * @returns {string|null}
 */
export function normalizeAddress(address) {
  if (address === null || address === undefined) return null;
  let s = String(address).toLowerCase();
  // Replace German characters
  s = s.replace(/ß/g, 'ss');
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  // Expand common abbreviations
  s = s.replace(/\bstr\./g, 'strasse');
  s = s.replace(/\bpl\./g, 'platz');
  // Strip postal codes (5 digits)
  s = s.replace(/\b\d{5}\b/g, '');
  // Drop text after comma (often city/district qualifiers)
  const commaIdx = s.indexOf(',');
  if (commaIdx !== -1) s = s.substring(0, commaIdx);
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s || null;
}

/**
 * Normalize a listing title for comparison.
 * Lowercase, umlauts→ascii, expand abbreviations, remove filler words,
 * collapse whitespace.
 *
 * @param {string|null|undefined} title
 * @returns {string|null}
 */
export function normalizeTitle(title) {
  if (title === null || title === undefined) return null;
  let s = String(title).toLowerCase();
  // Replace German characters
  s = s.replace(/ß/g, 'ss');
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  // Expand abbreviations
  s = s.replace(/\bzi\./g, 'zimmer');
  s = s.replace(/\bwhg\./g, 'wohnung');
  s = s.replace(/\bwg\b/g, 'wohngemeinschaft');
  s = s.replace(/\bqm\b/g, 'quadratmeter');
  // Remove filler words
  const fillers = ['mit', 'und', 'oder', 'in', 'im', 'am', 'ab', 'zum', 'zur', 'der', 'die', 'das', 'ein', 'eine'];
  const fillerPattern = new RegExp(`\\b(${fillers.join('|')})\\b`, 'g');
  s = s.replace(fillerPattern, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s || null;
}

/**
 * Compute a similarity hash from title, price and address using normalization.
 *
 * @param {string|null|undefined} title
 * @param {string|number|null|undefined} price
 * @param {string|null|undefined} address
 * @returns {string} Hexadecimal SHA-256 hash
 */
export function computeSimilarityHash(title, price, address) {
  const parts = [];
  const nt = normalizeTitle(title);
  if (nt !== null) parts.push(nt);
  const np = normalizePrice(price);
  if (np !== null) parts.push(String(np));
  const na = normalizeAddress(address);
  if (na !== null) parts.push(na);
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

/**
 * Initialize or refresh the similarity cache from persistent storage.
 *
 * Reads all stored listings via getAllEntriesFromListings(), computes a normalized
 * hash for each, and swaps the in-memory Set atomically.
 *
 * @returns {void}
 */
export const initSimilarityCache = () => {
  const allEntries = getAllEntriesFromListings();
  const newCache = new Set();
  for (const entry of allEntries) {
    newCache.add(computeSimilarityHash(entry?.title, entry?.price, entry?.address));
  }
  // Atomic swap to avoid mutating the cache while it may be iterated elsewhere
  cache = newCache;
};

/**
 * Check if a listing is already known and add it to the cache if not.
 *
 * The listing is identified by the normalized combination of its title, price and
 * address.
 *
 * @param {Object} params - Listing fields
 * @param {string|undefined|null} params.title - The listing title
 * @param {string|undefined|null} params.address - The listing address
 * @param {number|string|undefined|null} params.price - The listing price
 * @returns {boolean} true if the entry already existed in the cache (duplicate), otherwise false
 */
export const checkAndAddEntry = ({ title, address, price }) => {
  const hash = computeSimilarityHash(title, price, address);
  if (cache.has(hash)) {
    return true;
  }
  cache.add(hash);
  return false;
};
