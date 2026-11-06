/**
 * COLIN — Room Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generatePropertyFixtureSql } from './property.fixture';

export interface CreateRoomOptions {
  id?: string;
  propertyId?: string;
  roomNumber?: string;
  roomType?: 'SINGLE' | 'DOUBLE_SHARING' | 'TRIPLE_SHARING' | 'FOUR_SHARING' | 'DORMITORY';
  baseMonthlyRent?: number;
}

export function generateRoomFixtureSql(options: CreateRoomOptions = {}) {
  let setupSql = '';
  let cleanupSql = '';
  let propertyId = options.propertyId;

  if (!propertyId) {
    const property = generatePropertyFixtureSql();
    propertyId = property.propertyId;
    setupSql += property.propertySql;
    cleanupSql += property.cleanupSql;
  }

  const id = options.id || `00000000-0000-0000-0003-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const roomNumber = options.roomNumber || `RM-${Math.floor(100 + Math.random() * 900)}`;
  const roomType = options.roomType || 'DOUBLE_SHARING';
  const baseMonthlyRent = options.baseMonthlyRent || 8500.00;

  const roomSql = `
    ${setupSql}
    INSERT INTO rooms (
      id, property_id, room_number, room_type, base_monthly_rent, security_deposit,
      total_beds, occupied_beds, created_at, updated_at
    ) VALUES (
      '${id}', '${propertyId}', '${roomNumber}', '${roomType}', ${baseMonthlyRent}, 8500.00,
      2, 0, NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  const finalCleanupSql = `
    DELETE FROM rooms WHERE id = '${id}';
    ${cleanupSql}
  `;

  return { roomId: id, propertyId, roomSql, cleanupSql: finalCleanupSql };
}
