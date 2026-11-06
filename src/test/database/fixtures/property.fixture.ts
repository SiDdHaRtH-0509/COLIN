/**
 * COLIN — Property Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateOwnerFixtureSql } from './owner.fixture';

export interface CreatePropertyOptions {
  id?: string;
  ownerId?: string;
  name?: string;
  slug?: string;
  propertyType?: 'PG' | 'HOSTEL' | 'RENTAL_ROOM' | 'SHARED_FLAT' | 'COLIVING';
  genderPolicy?: 'BOYS_ONLY' | 'GIRLS_ONLY' | 'COED';
}

export function generatePropertyFixtureSql(options: CreatePropertyOptions = {}) {
  let setupSql = '';
  let cleanupSql = '';
  let ownerId = options.ownerId;

  if (!ownerId) {
    const owner = generateOwnerFixtureSql();
    ownerId = owner.ownerId;
    setupSql += owner.ownerSql;
    cleanupSql += owner.cleanupSql;
  }

  const id = options.id || `00000000-0000-0000-0002-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const name = options.name || `Property ${id.substring(24)}`;
  const slug = options.slug || `property-${id.substring(24)}`;
  const propertyType = options.propertyType || 'PG';
  const genderPolicy = options.genderPolicy || 'COED';

  const propertySql = `
    ${setupSql}
    INSERT INTO properties (
      id, owner_id, name, slug, property_type, gender_policy,
      verification_status, occupancy_status, address_line1, city, state, pincode,
      latitude, longitude, created_at, updated_at
    ) VALUES (
      '${id}', '${ownerId}', '${name}', '${slug}', '${propertyType}', '${genderPolicy}',
      'VERIFIED', 'AVAILABLE', '123 University Road', 'New Delhi', 'Delhi', '110007',
      28.6925, 77.2140, NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  const finalCleanupSql = `
    DELETE FROM property_photos WHERE property_id = '${id}';
    DELETE FROM properties WHERE id = '${id}';
    ${cleanupSql}
  `;

  return { propertyId: id, ownerId, propertySql, cleanupSql: finalCleanupSql };
}
