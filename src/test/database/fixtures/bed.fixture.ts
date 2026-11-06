/**
 * COLIN — Bed Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateRoomFixtureSql } from './room.fixture';

export interface CreateBedOptions {
  id?: string;
  roomId?: string;
  propertyId?: string;
  bedLabel?: string;
  status?: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';
  monthlyRent?: number;
}

export function generateBedFixtureSql(options: CreateBedOptions = {}) {
  let setupSql = '';
  let cleanupSql = '';
  let roomId = options.roomId;
  let propertyId = options.propertyId;

  if (!roomId) {
    const room = generateRoomFixtureSql({ propertyId });
    roomId = room.roomId;
    propertyId = room.propertyId;
    setupSql += room.roomSql;
    cleanupSql += room.cleanupSql;
  }

  const id = options.id || `00000000-0000-0000-0004-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const bedLabel = options.bedLabel || `Bed-${Math.floor(1 + Math.random() * 9)}`;
  const status = options.status || 'AVAILABLE';
  const monthlyRent = options.monthlyRent || 8500.00;

  const bedSql = `
    ${setupSql}
    INSERT INTO beds (
      id, room_id, bed_label, status, monthly_rent, created_at, updated_at
    ) VALUES (
      '${id}', '${roomId}', '${bedLabel}', '${status}', ${monthlyRent}, NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  const finalCleanupSql = `
    DELETE FROM bed_reservations WHERE bed_id = '${id}';
    DELETE FROM beds WHERE id = '${id}';
    ${cleanupSql}
  `;

  return { bedId: id, roomId, propertyId: propertyId!, bedSql, cleanupSql: finalCleanupSql };
}
