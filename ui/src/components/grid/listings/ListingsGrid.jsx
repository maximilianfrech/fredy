/*
 * Copyright (c) 2026 by Christian Kellner.
 * Licensed under Apache-2.0 with Commons Clause and Attribution/Naming Clause
 */

import { Card, Col, Row, Image, Button, Space, Typography, Divider } from '@douyinfe/semi-ui-19';
import {
  IconBriefcase,
  IconCart,
  IconClock,
  IconDelete,
  IconLink,
  IconMapPin,
  IconStar,
  IconStarStroked,
  IconActivity,
} from '@douyinfe/semi-icons';
import no_image from '../../../assets/no_image.jpg';
import * as timeService from '../../../services/time/timeService.js';

import './ListingsGrid.less';

const { Text } = Typography;

const cap = (val) => String(val).charAt(0).toUpperCase() + String(val).slice(1);

const ListingsGrid = ({ listings = [], onWatch, onDelete, onNavigate }) => {
  return (
    <Row gutter={[16, 16]}>
      {listings.map((item) => (
        <Col key={item.id} xs={24} sm={12} md={8} lg={6} xl={4} xxl={6}>
          <Card
            className={`listingsGrid__card ${!item.is_active ? 'listingsGrid__card--inactive' : ''}`}
            style={{ cursor: 'pointer' }}
            onClick={(e) => onNavigate(item, e)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                window.open(`#/listings/listing/${item.id}`, '_blank');
              }
            }}
            cover={
              <div style={{ position: 'relative' }}>
                <div className="listingsGrid__imageContainer">
                  <Image
                    src={item.image_url || no_image}
                    fallback={no_image}
                    width="100%"
                    height={180}
                    style={{ objectFit: 'cover' }}
                    preview={false}
                  />
                  <Button
                    icon={
                      item.isWatched === 1 ? (
                        <IconStar style={{ color: 'rgba(var(--semi-green-5), 1)' }} />
                      ) : (
                        <IconStarStroked />
                      )
                    }
                    theme="light"
                    shape="circle"
                    size="small"
                    className="listingsGrid__watchButton"
                    onClick={(e) => onWatch(e, item)}
                  />
                </div>
                {!item.is_active && <div className="listingsGrid__inactiveOverlay">Inactive</div>}
              </div>
            }
            bodyStyle={{ padding: '12px' }}
          >
            <div className="listingsGrid__content">
              <Text strong ellipsis={{ showTooltip: true }} className="listingsGrid__title">
                {cap(item.title)}
              </Text>
              <Space vertical align="start" spacing={2} style={{ width: '100%', marginTop: 8 }}>
                <Text type="secondary" icon={<IconCart />} size="small">
                  {Number(item.price).toLocaleString('de-DE')} €
                </Text>
                <Text
                  type="secondary"
                  icon={<IconMapPin />}
                  size="small"
                  ellipsis={{ showTooltip: true }}
                  style={{ width: '100%' }}
                >
                  {item.address || 'No address provided'}
                </Text>
                <Text type="tertiary" size="small" icon={<IconClock />}>
                  {timeService.format(item.created_at, false)}
                </Text>
                <Text type="tertiary" size="small" icon={<IconBriefcase />}>
                  {cap(item.provider)}
                </Text>
                {item.distance_to_destination ? (
                  <Text type="tertiary" size="small" icon={<IconActivity />}>
                    {item.distance_to_destination} m to chosen address
                  </Text>
                ) : (
                  <Text type="tertiary" size="small" icon={<IconActivity />}>
                    Distance cannot be calculated, provide an address
                  </Text>
                )}
              </Space>
              <Divider margin=".6rem" />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="listingsGrid__linkButton" onClick={(e) => e.stopPropagation()}>
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    <IconLink />
                  </a>
                </div>

                <Button
                  type="secondary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(item, e);
                  }}
                >
                  Details
                </Button>

                <Button
                  title="Remove"
                  type="danger"
                  size="small"
                  onClick={(e) => onDelete(e, item.id)}
                  icon={<IconDelete />}
                />
              </div>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default ListingsGrid;
