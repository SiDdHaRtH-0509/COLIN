/**
 * COLIN — Ledger Transaction & Balanced Entries Fixture Helper
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

import { generateLedgerAccountFixtureSql } from './ledger-account.fixture';

export interface CreateLedgerTransactionOptions {
  id?: string;
  transactionNumber?: string;
  transactionType?: 'VISIT_FEE_COLLECTION' | 'VISIT_REJECTION_REFUND' | 'VISIT_ACCEPTANCE_SETTLEMENT' | 'VISIT_EXPIRATION_SETTLEMENT' | 'OWNER_SUBSCRIPTION_PAYMENT' | 'STUDENT_SUBSCRIPTION_PAYMENT' | 'DISBURSEMENT_PAYOUT' | 'DISBURSEMENT_REVERSAL';
  status?: 'DRAFT' | 'POSTED' | 'REVERSED';
  currency?: string;
  amount?: number;
  debitAccountId?: string;
  creditAccountId?: string;
  description?: string;
}

export function generateLedgerTransactionFixtureSql(options: CreateLedgerTransactionOptions = {}) {
  let setupSql = '';
  let cleanupSql = '';

  let debitAccountId = options.debitAccountId;
  if (!debitAccountId) {
    const debitAccount = generateLedgerAccountFixtureSql({
      accountName: 'Clearing Asset',
      accountType: 'ASSET',
      category: 'GATEWAY_CLEARING',
    });
    debitAccountId = debitAccount.accountId;
    setupSql += debitAccount.accountSql;
    cleanupSql += debitAccount.cleanupSql;
  }

  let creditAccountId = options.creditAccountId;
  if (!creditAccountId) {
    const creditAccount = generateLedgerAccountFixtureSql({
      accountName: 'Escrow Liability',
      accountType: 'LIABILITY',
      category: 'PLATFORM_ESCROW',
    });
    creditAccountId = creditAccount.accountId;
    setupSql += creditAccount.accountSql;
    cleanupSql += creditAccount.cleanupSql;
  }

  const id = options.id || `00000000-0000-0000-0008-${Math.floor(100000000000 + Math.random() * 900000000000)}`;
  const transactionNumber = options.transactionNumber || `TX-${id.substring(24)}`;
  const transactionType = options.transactionType || 'VISIT_FEE_COLLECTION';
  const status = options.status || 'DRAFT';
  const currency = options.currency || 'INR';
  const amount = options.amount || 150.00;
  const description = options.description || 'Visit fee collection balanced transaction';

  const transactionSql = `
    ${setupSql}
    INSERT INTO ledger_transactions (
      id, transaction_number, transaction_type, status, currency, description,
      idempotency_key, created_at
    ) VALUES (
      '${id}', '${transactionNumber}', '${transactionType}', '${status}', '${currency}', '${description}',
      'idemp-${id}', NOW()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO ledger_entries (
      id, transaction_id, account_id, entry_type, amount, currency, created_at
    ) VALUES 
      (gen_random_uuid(), '${id}', '${debitAccountId}', 'DEBIT', ${amount}, '${currency}', NOW()),
      (gen_random_uuid(), '${id}', '${creditAccountId}', 'CREDIT', ${amount}, '${currency}', NOW());
  `;

  const finalCleanupSql = `
    DELETE FROM ledger_entries WHERE transaction_id = '${id}';
    DELETE FROM ledger_transactions WHERE id = '${id}';
    ${cleanupSql}
  `;

  return {
    transactionId: id,
    debitAccountId,
    creditAccountId,
    amount,
    currency,
    transactionSql,
    cleanupSql: finalCleanupSql,
  };
}
