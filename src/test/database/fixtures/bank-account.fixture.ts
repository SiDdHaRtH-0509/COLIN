/**
 * COLIN — Owner Bank Account Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateOwnerFixtureSql } from './owner.fixture';

export interface CreateBankAccountOptions {
  id?: string;
  ownerId?: string;
  bankName?: string;
  accountNumberMasked?: string;
  ifscCode?: string;
  accountHolderName?: string;
  isActive?: boolean;
  isVerified?: boolean;
  isPrimary?: boolean;
  gatewayBeneficiaryId?: string;
  beneficiaryTokenEncrypted?: string;
  verificationStatus?: string;
}

export function generateBankAccountFixtureSql(options: CreateBankAccountOptions = {}) {
  let setupSql = '';
  let cleanupSql = '';
  let ownerId = options.ownerId;

  if (!ownerId) {
    const owner = generateOwnerFixtureSql();
    ownerId = owner.ownerId;
    setupSql += owner.ownerSql;
    cleanupSql += owner.cleanupSql;
  }

  const id = options.id || `00000000-0000-0000-0005-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const bankName = options.bankName || 'HDFC Bank';
  const accountNumberMasked = options.accountNumberMasked || `****${Math.floor(1000 + Math.random() * 9000)}`;
  const ifscCode = options.ifscCode || 'HDFC0001234';
  const accountHolderName = options.accountHolderName || 'Colin Partner Account';
  const isActive = options.isActive ?? true;
  const isVerified = options.isVerified ?? true;
  const isPrimary = options.isPrimary ?? true;
  const gatewayBeneficiaryId = options.gatewayBeneficiaryId ?? `bene_${id.substring(24)}`;
  const beneficiaryTokenEncrypted = options.beneficiaryTokenEncrypted ?? 'enc_token_valid_rsa4096_secure';
  const verificationStatus = options.verificationStatus || 'VERIFIED';

  const bankAccountSql = `
    ${setupSql}
    INSERT INTO owner_bank_accounts (
      id, owner_id, bank_name, account_number_masked, ifsc_code, account_holder_name,
      is_active, is_verified, is_primary, gateway_beneficiary_id, beneficiary_token_encrypted,
      verification_status, created_at
    ) VALUES (
      '${id}', '${ownerId}', '${bankName}', '${accountNumberMasked}', '${ifscCode}', '${accountHolderName}',
      ${isActive}, ${isVerified}, ${isPrimary}, '${gatewayBeneficiaryId}', '${beneficiaryTokenEncrypted}',
      '${verificationStatus}', NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  const finalCleanupSql = `
    DELETE FROM financial_disbursements WHERE bank_account_id = '${id}';
    DELETE FROM owner_bank_accounts WHERE id = '${id}';
    ${cleanupSql}
  `;

  return { bankAccountId: id, ownerId, bankAccountSql, cleanupSql: finalCleanupSql };
}
