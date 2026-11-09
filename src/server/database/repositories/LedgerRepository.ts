/**
 * COLIN Double-Entry Ledger Repository
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Manages double-entry financial journal transactions, entries, balance computation,
 * and immutable linked reversals preserving zero-sum balance invariants.
 */

import {
  LedgerTransaction,
  LedgerEntry,
  Prisma,
  JournalTransactionType,
  LedgerTransactionStatus,
  LedgerEntryType,
  LedgerAccountCategory,
  LedgerAccountType,
} from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateLedgerEntryInput {
  accountId: string;
  entryType: LedgerEntryType;
  amount: Prisma.Decimal | number | string;
  currency?: string;
}

export interface CreateTransactionInput {
  transactionNumber: string;
  transactionType: JournalTransactionType;
  description: string;
  idempotencyKey: string;
  currency?: string;
  bookingId?: string;
  paymentId?: string;
  disbursementId?: string;
  entries: CreateLedgerEntryInput[];
}

export class LedgerRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Retrieves a ledger transaction by its primary UUID, including all debit/credit entries.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<(LedgerTransaction & { entries: LedgerEntry[] }) | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.ledgerTransaction.findUnique({
        where: { id },
        include: {
          entries: {
            include: { account: true },
          },
        },
      });
    });
  }

  /**
   * Creates a draft ledger transaction with its balanced entries.
   */
  async createDraftTransaction(input: CreateTransactionInput, tx?: Prisma.TransactionClient): Promise<LedgerTransaction & { entries: LedgerEntry[] }> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const currency = input.currency || 'INR';

      return client.ledgerTransaction.create({
        data: {
          transactionNumber: input.transactionNumber,
          transactionType: input.transactionType,
          status: LedgerTransactionStatus.DRAFT,
          description: input.description,
          idempotencyKey: input.idempotencyKey,
          currency,
          bookingId: input.bookingId,
          paymentId: input.paymentId,
          disbursementId: input.disbursementId,
          entries: {
            create: input.entries.map((e) => ({
              accountId: e.accountId,
              entryType: e.entryType,
              amount: new Prisma.Decimal(e.amount.toString()),
              currency: e.currency || currency,
            })),
          },
        },
        include: {
          entries: true,
        },
      });
    });
  }

  /**
   * Transitions a transaction from DRAFT to POSTED.
   * PostgreSQL trigger `validate_ledger_transaction_balance()` verifies Total Debit = Total Credit.
   */
  async postTransaction(id: string, tx?: Prisma.TransactionClient): Promise<LedgerTransaction> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.ledgerTransaction.update({
        where: { id },
        data: {
          status: LedgerTransactionStatus.POSTED,
          postedAt: new Date(),
        },
      });
    });
  }

  /**
   * Atomically generates a reversal transaction via the PostgreSQL procedure `reverse_ledger_transaction()`.
   */
  async reverseTransaction(
    origTransactionId: string,
    reason: string,
    reversalTxNumber?: string,
    tx?: Prisma.TransactionClient
  ): Promise<string> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const txNum = reversalTxNumber || `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const res = await client.$queryRaw<[{ reverse_ledger_transaction: string }]>`
        SELECT reverse_ledger_transaction(${origTransactionId}::uuid, ${txNum}, ${reason}) AS reverse_ledger_transaction;
      `;
      return res[0]?.reverse_ledger_transaction;
    });
  }

  /**
   * Computes the net balance for a ledger account across all POSTED transactions.
   */
  async getAccountBalance(accountId: string, tx?: Prisma.TransactionClient): Promise<Prisma.Decimal> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const entries = await client.ledgerEntry.findMany({
        where: {
          accountId,
          transaction: {
            status: { in: [LedgerTransactionStatus.POSTED, LedgerTransactionStatus.REVERSED] },
          },
        },
        select: {
          entryType: true,
          amount: true,
        },
      });

      let net = new Prisma.Decimal(0);
      for (const entry of entries) {
        if (entry.entryType === LedgerEntryType.DEBIT) {
          net = net.add(entry.amount);
        } else {
          net = net.sub(entry.amount);
        }
      }
      return net;
    });
  }

  /**
   * Finds an active ledger account by category, or creates it if missing.
   */
  async ensureAccount(
    category: LedgerAccountCategory,
    name: string,
    accountType: LedgerAccountType,
    accountNumber: string,
    tx?: Prisma.TransactionClient
  ) {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const existing = await client.ledgerAccount.findFirst({
        where: { accountCategory: category },
      });
      if (existing) return existing;

      return client.ledgerAccount.create({
        data: {
          accountNumber,
          name,
          accountType,
          accountCategory: category,
          currency: 'INR',
          isActive: true,
        },
      });
    });
  }
}
