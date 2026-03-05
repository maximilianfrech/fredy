/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import crypto from 'crypto';

export function up(db) {
  // 1. Add similarity_hash column
  db.exec(`ALTER TABLE listings ADD COLUMN similarity_hash TEXT;`);

  // 2. Add index for fast lookup of similar listings
  db.exec(`CREATE INDEX IF NOT EXISTS idx_listings_similarity_hash ON listings (similarity_hash);`);

  // 3. Backfill existing rows
  const rows = db.prepare(`SELECT id, title, price, address FROM listings`).all();
  const update = db.prepare(`UPDATE listings SET similarity_hash = @hash WHERE id = @id`);

  for (const row of rows) {
    const hash = computeHash(row.title, row.price, row.address);
    update.run({ id: row.id, hash });
  }
}

/**
 * Compute similarity hash using the same normalization logic as similarityCache.
 * Duplicated here so the migration is self-contained and stable.
 */
function computeHash(title, price, address) {
  const parts = [];
  const nt = normalizeTitle(title);
  if (nt !== null) parts.push(nt);
  const np = normalizePrice(price);
  if (np !== null) parts.push(String(np));
  const na = normalizeAddress(address);
  if (na !== null) parts.push(na);
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex');
}

function normalizePrice(price) {
  if (price === null || price === undefined) return null;
  if (typeof price === 'number') return Math.round(price);
  const cleaned = String(price).replace(/[^\d.,]/g, '');
  if (cleaned === '') return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : Math.round(num);
}

function normalizeAddress(address) {
  if (address === null || address === undefined) return null;
  let s = String(address).toLowerCase();
  s = s.replace(/ß/g, 'ss');
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  s = s.replace(/\bstr\./g, 'strasse');
  s = s.replace(/\bpl\./g, 'platz');
  s = s.replace(/\b\d{5}\b/g, '');
  const commaIdx = s.indexOf(',');
  if (commaIdx !== -1) s = s.substring(0, commaIdx);
  s = s.replace(/\s+/g, ' ').trim();
  return s || null;
}

function normalizeTitle(title) {
  if (title === null || title === undefined) return null;
  let s = String(title).toLowerCase();
  s = s.replace(/ß/g, 'ss');
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  s = s.replace(/\bzi\./g, 'zimmer');
  s = s.replace(/\bwhg\./g, 'wohnung');
  s = s.replace(/\bwg\b/g, 'wohngemeinschaft');
  s = s.replace(/\bqm\b/g, 'quadratmeter');
  const fillers = ['mit', 'und', 'oder', 'in', 'im', 'am', 'ab', 'zum', 'zur', 'der', 'die', 'das', 'ein', 'eine'];
  const fillerPattern = new RegExp(`\\b(${fillers.join('|')})\\b`, 'g');
  s = s.replace(fillerPattern, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s || null;
}
