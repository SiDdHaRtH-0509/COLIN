/**
 * COLIN — Central Database Test Client & Fixture Infrastructure
 * Phase 4A.2.2.1-R2.1.2 Fixture System
 */

declare const process: { env: Record<string, string | undefined> };

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseTestClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  transaction<T>(callback: (client: DatabaseTestClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export class SqlExecutionError extends Error {
  public code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = 'SqlExecutionError';
    this.code = code;
  }
}

/**
 * Fixture cleanup registry to ensure zero leftover records after test execution.
 */
export class FixtureCleanupRegistry {
  private cleanupSqlStatements: string[] = [];

  public register(deleteSql: string): void {
    this.cleanupSqlStatements.unshift(deleteSql); // LIFO for referential integrity
  }

  public async executeCleanup(queryExecutor: (sql: string) => Promise<unknown>): Promise<void> {
    for (const sql of this.cleanupSqlStatements) {
      try {
        await queryExecutor(sql);
      } catch (err) {
        console.warn(`[Fixture Cleanup Warning] Could not execute: ${sql}`, err);
      }
    }
    this.cleanupSqlStatements = [];
  }
}
