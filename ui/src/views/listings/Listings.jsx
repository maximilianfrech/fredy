/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Input,
  InputNumber,
  Button,
  ButtonGroup,
  Space,
  Typography,
  Pagination,
  Toast,
  Divider,
  Select,
  Popover,
  Empty,
} from '@douyinfe/semi-ui-19';
import { IconSearch, IconFilter, IconGridView1, IconList, IconChevronDown, IconClear } from '@douyinfe/semi-icons';
import { useNavigate } from 'react-router-dom';
import { IllustrationNoResult, IllustrationNoResultDark } from '@douyinfe/semi-illustrations';
import debounce from 'lodash/debounce';
import ListingsGrid from '../../components/grid/listings/ListingsGrid.jsx';
import ListingsTable from '../../components/table/listings/ListingsTable.jsx';
import ListingDeletionModal from '../../components/ListingDeletionModal.jsx';
import { xhrDelete, xhrPost } from '../../services/xhr.js';
import { useActions, useSelector } from '../../services/state/store.js';
import useListingsParams from '../../hooks/useListingsParams.js';

const { Text } = Typography;

function RangeFilter({ label, minValue, maxValue, onUpdate, suffix = '' }) {
  const [localMin, setLocalMin] = useState(minValue || '');
  const [localMax, setLocalMax] = useState(maxValue || '');

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const debouncedApply = useMemo(() => debounce((min, max) => onUpdateRef.current(min, max), 600), []);

  useEffect(() => () => debouncedApply.cancel(), [debouncedApply]);

  useEffect(() => {
    setLocalMin(minValue || '');
  }, [minValue]);
  useEffect(() => {
    setLocalMax(maxValue || '');
  }, [maxValue]);

  const handleMinChange = (val) => {
    const v = val === null || val === undefined ? '' : String(val);
    setLocalMin(v);
    debouncedApply(v, localMax);
  };
  const handleMaxChange = (val) => {
    const v = val === null || val === undefined ? '' : String(val);
    setLocalMax(v);
    debouncedApply(localMin, v);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setLocalMin('');
    setLocalMax('');
    debouncedApply.cancel();
    onUpdateRef.current('', '');
  };

  const fmt = (v) => (v === '' ? '–' : Number(v).toLocaleString('de-DE'));

  const hasValue = localMin !== '' || localMax !== '';
  const displayText = hasValue ? `${fmt(localMin)}${suffix} – ${fmt(localMax)}${suffix}` : 'All';

  return (
    <div className="listingsGrid__tableFilter__field">
      <Text size="small" type="tertiary">
        {label}
      </Text>
      <Popover
        trigger="click"
        position="bottomLeft"
        content={
          <div className="listingsGrid__tableFilter__range">
            <InputNumber
              placeholder="Min"
              size="small"
              value={localMin === '' ? null : Number(localMin)}
              onChange={handleMinChange}
              style={{ width: 90 }}
              min={0}
            />
            <span>–</span>
            <InputNumber
              placeholder="Max"
              size="small"
              value={localMax === '' ? null : Number(localMax)}
              onChange={handleMaxChange}
              style={{ width: 90 }}
              min={0}
            />
          </div>
        }
      >
        <div className="listingsGrid__tableFilter__rangeButton">
          <span>{displayText}</span>
          {hasValue ? (
            <IconClear size="small" className="listingsGrid__tableFilter__rangeClear" onClick={handleClear} />
          ) : (
            <IconChevronDown size="small" />
          )}
        </div>
      </Popover>
    </div>
  );
}

export default function Listings() {
  const listingsData = useSelector((state) => state.listingsData);
  const providers = useSelector((state) => state.provider);
  const jobs = useSelector((state) => state.jobsData.jobs);
  const actions = useActions();
  const navigate = useNavigate();

  const { params, setParams, apiParams, pageSize } = useListingsParams();

  const [showFilterBar, setShowFilterBar] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);

  const loadData = useCallback(() => {
    actions.listingsData.getListingsData(apiParams);
  }, [apiParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = useMemo(
    () => debounce((value) => setParams({ q: value || '', page: 1 }), 500),
    [setParams],
  );

  useEffect(() => {
    return () => {
      handleFilterChange.cancel && handleFilterChange.cancel();
    };
  }, [handleFilterChange]);

  const handleWatch = async (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await xhrPost('/api/listings/watch', { listingId: item.id });
      Toast.success(item.isWatched === 1 ? 'Listing removed from Watchlist' : 'Listing added to Watchlist');
      loadData();
    } catch (err) {
      console.error(err);
      Toast.error('Failed to operate Watchlist');
    }
  };

  const handleDelete = (e, itemId) => {
    e.stopPropagation();
    setListingToDelete(itemId);
    setDeleteModalVisible(true);
  };

  const confirmDeletion = async (hardDelete) => {
    try {
      await xhrDelete('/api/listings/', { ids: [listingToDelete], hardDelete });
      Toast.success('Listing successfully removed');
      loadData();
    } catch (error) {
      Toast.error(error.message || 'Error deleting listing');
    } finally {
      setDeleteModalVisible(false);
      setListingToDelete(null);
    }
  };

  const handleNavigateToDetail = (item, e) => {
    if (e?.ctrlKey || e?.metaKey) {
      window.open(`#/listings/listing/${item.id}`, '_blank');
    } else {
      navigate(`/listings/listing/${item.id}`);
    }
  };

  const listings = listingsData?.result || [];
  const isCardView = params.view !== 'table';

  return (
    <div className="listingsGrid">
      <div className="listingsGrid__searchbar">
        <ButtonGroup>
          <Button
            icon={<IconGridView1 />}
            type={isCardView ? 'primary' : 'tertiary'}
            onClick={() => setParams({ view: 'card' })}
          />
          <Button
            icon={<IconList />}
            type={!isCardView ? 'primary' : 'tertiary'}
            onClick={() => setParams({ view: 'table' })}
          />
        </ButtonGroup>
        <Input
          prefix={<IconSearch />}
          showClear
          placeholder="Search"
          defaultValue={params.q}
          onChange={handleFilterChange}
          style={{ maxWidth: 300 }}
        />
        {isCardView && (
          <Popover content="Filter / Sort Results" style={{ color: 'white', padding: '.5rem' }}>
            <div>
              <Button icon={<IconFilter />} onClick={() => setShowFilterBar(!showFilterBar)} />
            </div>
          </Popover>
        )}
      </div>

      {!isCardView && (
        <div className="listingsGrid__tableFilter">
          <div className="listingsGrid__tableFilter__header">
            <IconFilter style={{ color: 'white' }} />
            <Text strong>Filter</Text>
          </div>
          <div className="listingsGrid__tableFilter__selects">
            <div className="listingsGrid__tableFilter__field">
              <Text size="small" type="tertiary">
                Job Name
              </Text>
              <Select
                className="listingsGrid__tableFilter__select"
                placeholder="All"
                size="small"
                showClear
                onChange={(val) => setParams({ job: val || '', page: 1 })}
                value={params.job || undefined}
              >
                {jobs?.map((j) => (
                  <Select.Option key={j.id} value={j.id}>
                    {j.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <RangeFilter
              label="Size"
              minValue={params.sizeMin}
              maxValue={params.sizeMax}
              onUpdate={(min, max) => setParams({ sizeMin: min, sizeMax: max, page: 1 })}
              suffix="m²"
            />
            <RangeFilter
              label="Price"
              minValue={params.priceMin}
              maxValue={params.priceMax}
              onUpdate={(min, max) => setParams({ priceMin: min, priceMax: max, page: 1 })}
              suffix="€"
            />
            <div className="listingsGrid__tableFilter__field">
              <Text size="small" type="tertiary">
                Status
              </Text>
              <Select
                className="listingsGrid__tableFilter__select"
                placeholder="All"
                size="small"
                showClear
                dropdownStyle={{ width: 'auto', minWidth: 'auto' }}
                position="bottomLeft"
                onChange={(val) => setParams({ status: val === true ? 'true' : val === false ? 'false' : '', page: 1 })}
                value={params.status === 'true' ? true : params.status === 'false' ? false : undefined}
              >
                <Select.Option value={true}>Active</Select.Option>
                <Select.Option value={false}>Not Active</Select.Option>
              </Select>
            </div>
            <div className="listingsGrid__tableFilter__field">
              <Text size="small" type="tertiary">
                Provider
              </Text>
              <Select
                className="listingsGrid__tableFilter__select"
                placeholder="All"
                size="small"
                showClear
                dropdownStyle={{ width: 'auto', minWidth: 'auto' }}
                position="bottomLeft"
                onChange={(val) => setParams({ provider: val || '', page: 1 })}
                value={params.provider || undefined}
              >
                {providers?.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="listingsGrid__tableFilter__field">
              <Text size="small" type="tertiary">
                Watchlist
              </Text>
              <Select
                className="listingsGrid__tableFilter__select"
                placeholder="All"
                size="small"
                showClear
                dropdownStyle={{ width: 'auto', minWidth: 'auto' }}
                position="bottomLeft"
                onChange={(val) =>
                  setParams({ watched: val === true ? 'true' : val === false ? 'false' : '', page: 1 })
                }
                value={params.watched === 'true' ? true : params.watched === 'false' ? false : undefined}
              >
                <Select.Option value={true}>Watched</Select.Option>
                <Select.Option value={false}>Not Watched</Select.Option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {isCardView && showFilterBar && (
        <div className="listingsGrid__toolbar">
          <Space wrap style={{ marginBottom: '1rem' }}>
            <div className="listingsGrid__toolbar__card">
              <div>
                <Text strong>Filter by:</Text>
              </div>
              <div style={{ display: 'flex', gap: '.3rem' }}>
                <Select
                  placeholder="Status"
                  showClear
                  onChange={(val) =>
                    setParams({ status: val === true ? 'true' : val === false ? 'false' : '', page: 1 })
                  }
                  value={params.status === 'true' ? true : params.status === 'false' ? false : undefined}
                >
                  <Select.Option value={true}>Active</Select.Option>
                  <Select.Option value={false}>Not Active</Select.Option>
                </Select>

                <Select
                  placeholder="Watchlist"
                  showClear
                  onChange={(val) =>
                    setParams({ watched: val === true ? 'true' : val === false ? 'false' : '', page: 1 })
                  }
                  value={params.watched === 'true' ? true : params.watched === 'false' ? false : undefined}
                >
                  <Select.Option value={true}>Watched</Select.Option>
                  <Select.Option value={false}>Not Watched</Select.Option>
                </Select>

                <Select
                  placeholder="Provider"
                  showClear
                  onChange={(val) => setParams({ provider: val || '', page: 1 })}
                  value={params.provider || undefined}
                >
                  {providers?.map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name}
                    </Select.Option>
                  ))}
                </Select>

                <Select
                  placeholder="Job Name"
                  showClear
                  onChange={(val) => setParams({ job: val || '', page: 1 })}
                  value={params.job || undefined}
                >
                  {jobs?.map((j) => (
                    <Select.Option key={j.id} value={j.id}>
                      {j.name}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            </div>
            <Divider layout="vertical" />

            <div className="listingsGrid__toolbar__card">
              <div>
                <Text strong>Sort by:</Text>
              </div>
              <div style={{ display: 'flex', gap: '.3rem' }}>
                <Select
                  placeholder="Sort By"
                  style={{ width: 140 }}
                  value={params.sort}
                  onChange={(val) => setParams({ sort: val })}
                >
                  <Select.Option value="job_name">Job Name</Select.Option>
                  <Select.Option value="created_at">Listing Date</Select.Option>
                  <Select.Option value="price">Price</Select.Option>
                  <Select.Option value="provider">Provider</Select.Option>
                </Select>

                <Select
                  placeholder="Direction"
                  style={{ width: 120 }}
                  value={params.dir}
                  onChange={(val) => setParams({ dir: val })}
                >
                  <Select.Option value="asc">Ascending</Select.Option>
                  <Select.Option value="desc">Descending</Select.Option>
                </Select>
              </div>
            </div>
          </Space>
        </div>
      )}

      {listings.length === 0 && (
        <Empty
          image={<IllustrationNoResult />}
          darkModeImage={<IllustrationNoResultDark />}
          description="No listings available yet..."
        />
      )}

      {listings.length > 0 && isCardView && (
        <ListingsGrid
          listings={listings}
          onWatch={handleWatch}
          onDelete={handleDelete}
          onNavigate={handleNavigateToDetail}
        />
      )}

      {listings.length > 0 && !isCardView && (
        <ListingsTable
          listings={listings}
          params={params}
          setParams={setParams}
          onWatch={handleWatch}
          onDelete={handleDelete}
          onNavigate={handleNavigateToDetail}
        />
      )}

      {listings.length > 0 && (
        <div className="listingsGrid__pagination">
          <Pagination
            currentPage={params.page}
            pageSize={pageSize}
            total={listingsData?.totalNumber || 0}
            onPageChange={(p) => setParams({ page: p })}
            showSizeChanger={false}
          />
        </div>
      )}

      <ListingDeletionModal
        visible={deleteModalVisible}
        onConfirm={confirmDeletion}
        onCancel={() => {
          setDeleteModalVisible(false);
          setListingToDelete(null);
        }}
      />
    </div>
  );
}
