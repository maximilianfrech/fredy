/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const DEFAULTS = {
  view: 'table',
  page: '1',
  sort: 'created_at',
  dir: 'desc',
  q: '',
  status: '',
  watched: '',
  provider: '',
  job: '',
  priceMin: '',
  priceMax: '',
  sizeMin: '',
  sizeMax: '',
};

const PAGE_SIZE = 40;

function parseParams(searchParams) {
  return {
    view: searchParams.get('view') || DEFAULTS.view,
    page: parseInt(searchParams.get('page') || DEFAULTS.page, 10),
    sort: searchParams.get('sort') || DEFAULTS.sort,
    dir: searchParams.get('dir') || DEFAULTS.dir,
    q: searchParams.get('q') || DEFAULTS.q,
    status: searchParams.get('status') || DEFAULTS.status,
    watched: searchParams.get('watched') || DEFAULTS.watched,
    provider: searchParams.get('provider') || DEFAULTS.provider,
    job: searchParams.get('job') || DEFAULTS.job,
    priceMin: searchParams.get('priceMin') || DEFAULTS.priceMin,
    priceMax: searchParams.get('priceMax') || DEFAULTS.priceMax,
    sizeMin: searchParams.get('sizeMin') || DEFAULTS.sizeMin,
    sizeMax: searchParams.get('sizeMax') || DEFAULTS.sizeMax,
  };
}

function toBoolOrNull(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return null;
}

export default function useListingsParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = useMemo(() => parseParams(searchParams), [searchParams]);

  const setParams = useCallback(
    (updater) => {
      setSearchParams(
        (prev) => {
          const current = parseParams(prev);
          const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };

          const result = new URLSearchParams();
          for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
            const val = String(next[key] ?? '');
            if (val !== '' && val !== defaultVal) {
              result.set(key, val);
            }
          }
          return result;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const apiParams = useMemo(
    () => ({
      page: params.page,
      pageSize: PAGE_SIZE,
      sortfield: params.sort,
      sortdir: params.dir,
      freeTextFilter: params.q || null,
      filter: {
        activityFilter: toBoolOrNull(params.status),
        watchListFilter: toBoolOrNull(params.watched),
        providerFilter: params.provider || null,
        jobNameFilter: params.job || null,
        priceMin: params.priceMin ? parseInt(params.priceMin, 10) : null,
        priceMax: params.priceMax ? parseInt(params.priceMax, 10) : null,
        sizeMin: params.sizeMin ? parseInt(params.sizeMin, 10) : null,
        sizeMax: params.sizeMax ? parseInt(params.sizeMax, 10) : null,
      },
    }),
    [
      params.page,
      params.sort,
      params.dir,
      params.q,
      params.status,
      params.watched,
      params.provider,
      params.job,
      params.priceMin,
      params.priceMax,
      params.sizeMin,
      params.sizeMax,
    ],
  );

  return { params, setParams, apiParams, pageSize: PAGE_SIZE };
}
