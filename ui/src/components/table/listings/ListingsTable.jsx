/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { useMemo, useCallback } from 'react';
import { Table, Button, Tag, Space } from '@douyinfe/semi-ui-19';
import {
  IconExternalOpen,
  IconStar,
  IconStarStroked,
  IconDelete,
  IconCaretup,
  IconCaretdown,
} from '@douyinfe/semi-icons';
import no_image from '../../../assets/no_image.jpg';
import * as timeService from '../../../services/time/timeService.js';

import './ListingsTable.less';

const cap = (val) => String(val).charAt(0).toUpperCase() + String(val).slice(1);

const ListingsTable = ({ listings = [], params, setParams, providers, jobs, onWatch, onDelete, onNavigate }) => {
  const providerFilters = useMemo(() => (providers || []).map((p) => ({ text: p.name, value: p.id })), [providers]);

  const jobFilters = useMemo(() => (jobs || []).map((j) => ({ text: j.name, value: j.id })), [jobs]);

  const handleSort = useCallback(
    (field) => {
      setParams((prev) => {
        if (prev.sort !== field) return { ...prev, sort: field, dir: 'asc', page: 1 };
        if (prev.dir === 'asc') return { ...prev, dir: 'desc', page: 1 };
        return { ...prev, sort: 'created_at', dir: 'desc', page: 1 };
      });
    },
    [setParams],
  );

  const sortableTitle = useCallback(
    (label, field) => {
      const active = params.sort === field;
      const isAsc = active && params.dir === 'asc';
      const isDesc = active && params.dir === 'desc';
      return () => (
        <span className="listingsTable__sortHeader">
          {label}
          <span className="listingsTable__sortIcons">
            <IconCaretup
              size="small"
              className={isAsc ? 'listingsTable__sortIcon--active' : 'listingsTable__sortIcon--inactive'}
            />
            <IconCaretdown
              size="small"
              className={isDesc ? 'listingsTable__sortIcon--active' : 'listingsTable__sortIcon--inactive'}
            />
          </span>
        </span>
      );
    },
    [params.sort, params.dir],
  );

  const sortHeaderCell = useCallback(
    (field) => () => ({ onClick: () => handleSort(field), style: { cursor: 'pointer' } }),
    [handleSort],
  );

  const columns = [
    {
      title: '',
      dataIndex: 'image_url',
      width: 52,
      render: (val) => (
        <img
          className="listingsTable__thumbnail"
          src={val || no_image}
          onError={(e) => {
            e.target.src = no_image;
          }}
          alt=""
        />
      ),
    },
    {
      title: sortableTitle('Title', 'title'),
      dataIndex: 'title',
      width: 250,
      onHeaderCell: sortHeaderCell('title'),
      ellipsis: { showTitle: true },
      render: (text) => cap(text),
    },
    {
      title: sortableTitle('Price', 'price'),
      dataIndex: 'price',
      width: 120,
      onHeaderCell: sortHeaderCell('price'),
      render: (val) => (val != null ? `${Number(val).toLocaleString('de-DE')} €` : '–'),
    },
    {
      title: sortableTitle('Size', 'size'),
      dataIndex: 'size',
      width: 90,
      onHeaderCell: sortHeaderCell('size'),
      render: (val) => (val ? `${val} m²` : '–'),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      width: 180,
      ellipsis: { showTitle: true },
      render: (val) => val || '–',
    },
    {
      title: sortableTitle('Provider', 'provider'),
      dataIndex: 'provider',
      width: 130,
      onHeaderCell: sortHeaderCell('provider'),
      filters: providerFilters,
      filteredValue: params.provider ? [params.provider] : [],
      onFilter: () => true,
      render: (val) => cap(val),
    },
    {
      title: sortableTitle('Job', 'job_name'),
      dataIndex: 'job_name',
      width: 140,
      onHeaderCell: sortHeaderCell('job_name'),
      filters: jobFilters,
      filteredValue: params.job ? [params.job] : [],
      onFilter: () => true,
      ellipsis: { showTitle: true },
    },
    {
      title: 'Distance',
      dataIndex: 'distance_to_destination',
      width: 100,
      render: (val) => (val ? `${val} m` : '–'),
    },
    {
      title: sortableTitle('Created', 'created_at'),
      dataIndex: 'created_at',
      width: 155,
      onHeaderCell: sortHeaderCell('created_at'),
      render: (val) => timeService.format(val, false),
    },
    {
      title: sortableTitle('Status', 'is_active'),
      dataIndex: 'is_active',
      width: 90,
      onHeaderCell: sortHeaderCell('is_active'),
      filters: [
        { text: 'Active', value: 'true' },
        { text: 'Inactive', value: 'false' },
      ],
      filteredValue: params.status ? [params.status] : [],
      onFilter: () => true,
      render: (val) => (
        <Tag color={val ? 'green' : 'grey'} size="small">
          {val ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: sortableTitle('Watched', 'isWatched'),
      dataIndex: 'isWatched',
      width: 90,
      onHeaderCell: sortHeaderCell('isWatched'),
      filters: [
        { text: 'Yes', value: 'true' },
        { text: 'No', value: 'false' },
      ],
      filteredValue: params.watched ? [params.watched] : [],
      onFilter: () => true,
      render: (val) =>
        val === 1 ? (
          <IconStar style={{ color: 'rgba(var(--semi-green-5), 1)' }} />
        ) : (
          <IconStarStroked style={{ color: 'var(--semi-color-text-2)' }} />
        ),
    },
    {
      title: '',
      dataIndex: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            icon={<IconExternalOpen />}
            theme="borderless"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              window.open(record.link, '_blank');
            }}
          />
          <Button
            icon={
              record.isWatched === 1 ? (
                <IconStar style={{ color: 'rgba(var(--semi-green-5), 1)' }} />
              ) : (
                <IconStarStroked />
              )
            }
            theme="borderless"
            size="small"
            onClick={(e) => onWatch(e, record)}
          />
          <Button
            icon={<IconDelete />}
            theme="borderless"
            type="danger"
            size="small"
            onClick={(e) => onDelete(e, record.id)}
          />
        </Space>
      ),
    },
  ];

  const handleChange = ({ filters, extra }) => {
    const updates = { page: 1 };

    if (extra?.changeType === 'filter' && Array.isArray(filters)) {
      const filterMap = {};
      for (const f of filters) {
        if (f.dataIndex) filterMap[f.dataIndex] = f.filteredValue;
      }
      if ('provider' in filterMap) updates.provider = filterMap.provider?.[0] || '';
      if ('job_name' in filterMap) updates.job = filterMap.job_name?.[0] || '';
      if ('is_active' in filterMap) updates.status = filterMap.is_active?.[0] || '';
      if ('isWatched' in filterMap) updates.watched = filterMap.isWatched?.[0] || '';
    }

    setParams((prev) => ({ ...prev, ...updates }));
  };

  return (
    <Table
      className="listingsTable"
      columns={columns}
      dataSource={listings}
      rowKey="id"
      pagination={false}
      scroll={{ x: 1400 }}
      onChange={handleChange}
      onRow={(record) => ({
        className: !record.is_active ? 'listingsTable__row--inactive' : '',
        style: { cursor: 'pointer' },
        onClick: (e) => onNavigate(record, e),
        onMouseDown: (e) => {
          if (e.button === 1) {
            e.preventDefault();
            window.open(`#/listings/listing/${record.id}`, '_blank');
          }
        },
      })}
    />
  );
};

export default ListingsTable;
