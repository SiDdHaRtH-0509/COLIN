/**
 * COLIN — Ledger Account Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

export interface CreateLedgerAccountOptions {
  id?: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category?: 'GATEWAY_CLEARING' | 'PLATFORM_ESCROW' | 'PLATFORM_REVENUE' | 'STUDENT_WALLET' | 'OWNER_PAYABLE' | 'DISPUTE_RESERVE';
  currency?: string;
}

export function generateLedgerAccountFixtureSql(options: CreateLedgerAccountOptions = {}) {
  const id = options.id || `00000000-0000-0000-0007-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const accountNumber = options.accountNumber || `ACC-${id.substring(24)}`;
  const accountName = options.accountName || `Ledger Account ${id.substring(24)}`;
  const accountType = options.accountType || 'ASSET';
  const category = options.category || 'GATEWAY_CLEARING';
  const currency = options.currency || 'INR';

  const accountSql = `
    INSERT INTO ledger_accounts (
      id, account_number, account_name, account_type, category, currency, is_active, created_at, updated_at
    ) VALUES (
      '${id}', '${accountNumber}', '${accountName}', '${accountType}', '${category}', '${currency}', TRUE, NOW(), NOW()
    ) ON CONFLICT (id) DO NOTHING;
  `;

  const cleanupSql = `DELETE FROM ledger_accounts WHERE id = '${id}';`;

  return { accountId: id, accountSql, cleanupSql };
}
