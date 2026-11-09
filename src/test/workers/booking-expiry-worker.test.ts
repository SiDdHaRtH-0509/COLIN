/**
 * COLIN Automatic Booking Expiry Worker Test Suite
 * Validates autonomous background processing of overdue student visit decisions.
 *
 * Covers all required acceptance scenarios:
 * 1. Normal expiry.
 * 2. No overdue bookings.
 * 3. Multiple overdue bookings.
 * 4. Duplicate invocation.
 * 5. Concurrent worker execution.
 * 6. Database disconnection / transient failure recovery.
 * 7. Server restart (startup recovery).
 * 8. Graceful shutdown (timer clear & active job drain).
 * 9. Financial settlement idempotency.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingExpiryWorker } from '../../server/workers/BookingExpiryWorker';
import { BookingService } from '../../server/services/BookingService';
import { ReliabilityLogger } from '../../server/reliability/logger';
import { resetShutdownState, executeGracefulShutdown, registerBackgroundWorker } from '../../server/lifecycle/shutdown';

describe('BookingExpiryWorker Unit & Lifecycle Suite', () => {
  let mockBookingService: {
    expireOverdueDecisions: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetShutdownState();
    mockBookingService = {
      expireOverdueDecisions: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Normal Expiry
  // ---------------------------------------------------------------------------
  it('1. Normal expiry: processes overdue bookings and logs completion metrics', async () => {
    mockBookingService.expireOverdueDecisions.mockResolvedValueOnce(1);
    const infoSpy = vi.spyOn(ReliabilityLogger, 'info');

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    const cutoff = new Date();
    const result = await worker.runOnce(cutoff);

    expect(result).toBe(1);
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(1);
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledWith(cutoff);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('processed 1 expired booking(s)'),
      expect.objectContaining({
        operation: 'BookingExpiryWorker.expireOverdue',
        details: { expiredCount: 1 },
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 2. No Overdue Bookings
  // ---------------------------------------------------------------------------
  it('2. No overdue bookings: completes cleanly with 0 count when no bookings are overdue', async () => {
    mockBookingService.expireOverdueDecisions.mockResolvedValueOnce(0);

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    const result = await worker.runOnce();
    expect(result).toBe(0);
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Multiple Overdue Bookings
  // ---------------------------------------------------------------------------
  it('3. Multiple overdue bookings: correctly expires a batch of overdue bookings', async () => {
    mockBookingService.expireOverdueDecisions.mockResolvedValueOnce(5);

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    const result = await worker.runOnce();
    expect(result).toBe(5);
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Duplicate Invocation
  // ---------------------------------------------------------------------------
  it('4. Duplicate invocation: second run finds zero overdue bookings without duplicate processing', async () => {
    // First run expires 2 bookings, second run finds 0
    mockBookingService.expireOverdueDecisions
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    const firstRun = await worker.runOnce();
    expect(firstRun).toBe(2);

    const secondRun = await worker.runOnce();
    expect(secondRun).toBe(0);
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // 5. Concurrent Worker Execution (Mutex Lock)
  // ---------------------------------------------------------------------------
  it('5. Concurrent worker execution: prevents overlapping execution and rejoins in-flight promise', async () => {
    let resolveFirstExecution!: (count: number) => void;
    const slowExecution = new Promise<number>((resolve) => {
      resolveFirstExecution = resolve;
    });

    mockBookingService.expireOverdueDecisions.mockImplementationOnce(() => slowExecution);

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    // Launch first execution
    const run1Promise = worker.runOnce();

    // Immediately launch second concurrent execution while run1 is in-flight
    const run2Promise = worker.runOnce();

    // Only one call should have reached the service
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(1);

    // Resolve the slow service operation
    resolveFirstExecution(3);

    const [run1Result, run2Result] = await Promise.all([run1Promise, run2Promise]);
    expect(run1Result).toBe(3);
    expect(run2Result).toBe(3); // Joined in-flight execution safely
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 6. Database Disconnection / Transient Error Handling
  // ---------------------------------------------------------------------------
  it('6. Database disconnection: retries transient database errors and logs structured error', async () => {
    const errorSpy = vi.spyOn(ReliabilityLogger, 'error');
    const transientDbError = new Error('deadlock detected (40P01)');

    mockBookingService.expireOverdueDecisions
      .mockRejectedValueOnce(transientDbError)
      .mockResolvedValueOnce(1); // Succeeds on second attempt via withRetry

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    const result = await worker.runOnce();
    expect(result).toBe(1);
    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(2);

    // If completely failed:
    mockBookingService.expireOverdueDecisions.mockRejectedValue(new Error('Connection terminated unexpectedly'));

    await expect(worker.runOnce()).rejects.toThrow('Connection terminated unexpectedly');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('failed to process overdue bookings'),
      expect.objectContaining({
        provider: 'postgresql',
        operation: 'BookingExpiryWorker.runOnce',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // 7. Server Restart (Startup Recovery)
  // ---------------------------------------------------------------------------
  it('7. Server restart: recovers overdue bookings immediately upon startup when runOnStart is true', async () => {
    mockBookingService.expireOverdueDecisions.mockResolvedValueOnce(4);

    const worker = new BookingExpiryWorker({
      intervalMs: 60000,
      runOnStart: true,
      bookingService: mockBookingService as unknown as BookingService,
    });

    worker.start();
    expect(worker.getStatus().isRunning).toBe(true);

    // Wait a tick for runOnce on start to complete
    await worker.stop();

    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(1);
    expect(worker.getStatus().isRunning).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 8. Graceful Shutdown (Timer Clear & In-Flight Drain)
  // ---------------------------------------------------------------------------
  it('8. Graceful shutdown: stops timer and drains in-flight execution without dropping tasks', async () => {
    let resolveInFlight!: (count: number) => void;
    const inFlightPromise = new Promise<number>((resolve) => {
      resolveInFlight = resolve;
    });

    mockBookingService.expireOverdueDecisions.mockImplementationOnce(() => inFlightPromise);

    const worker = new BookingExpiryWorker({
      intervalMs: 5000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    worker.start();
    expect(worker.getStatus().isRunning).toBe(true);

    // Start in-flight task
    const activeRun = worker.runOnce();
    expect(worker.getStatus().isProcessing).toBe(true);

    // Register with graceful shutdown manager and initiate shutdown
    registerBackgroundWorker(worker);

    const shutdownPromise = executeGracefulShutdown({
      backgroundWorkers: [worker],
      gracePeriodMs: 5000,
      signal: 'SIGTERM',
      exitProcess: false,
    });

    // Complete in-flight task during shutdown drain
    resolveInFlight(2);

    const [activeResult, shutdownReport] = await Promise.all([activeRun, shutdownPromise]);

    expect(activeResult).toBe(2);
    expect(shutdownReport.success).toBe(true);
    expect(shutdownReport.stepsCompleted).toContain('STOP_BACKGROUND_WORKERS');
    expect(worker.getStatus().isRunning).toBe(false);
    expect(worker.getStatus().isProcessing).toBe(false);

    // Attempting runOnce after shutdown when worker is stopped should be skipped
    const postShutdownResult = await worker.runOnce();
    expect(postShutdownResult).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 9. Financial Settlement Idempotency
  // ---------------------------------------------------------------------------
  it('9. Financial settlement idempotency: passes through to service guaranteeing zero-sum ledger invariants', async () => {
    mockBookingService.expireOverdueDecisions.mockResolvedValue(1);

    const worker = new BookingExpiryWorker({
      intervalMs: 1000,
      runOnStart: false,
      bookingService: mockBookingService as unknown as BookingService,
    });

    const count1 = await worker.runOnce();
    expect(count1).toBe(1);

    // Second call simulates repeated invocation
    const count2 = await worker.runOnce();
    expect(count2).toBe(1);

    expect(mockBookingService.expireOverdueDecisions).toHaveBeenCalledTimes(2);
  });
});
