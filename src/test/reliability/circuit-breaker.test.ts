/**
 * COLIN Circuit Breaker Architecture Tests
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Validates three-state transitions (CLOSED, OPEN, HALF-OPEN), failure thresholding,
 * half-open probe execution, recovery, and strict provider isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  getCircuitBreaker,
  resetAllCircuitBreakers,
} from '../../server/reliability/circuitBreaker';
import { IntegrationCircuitOpenError } from '../../server/reliability/errors';

describe('COLIN Phase 4A.2.5.6: Circuit Breaker Architecture Suite', () => {
  beforeEach(() => {
    resetAllCircuitBreakers();
  });

  describe('1. State Transitions & Thresholds', () => {
    it('initializes in CLOSED state and allows requests through', async () => {
      const breaker = new CircuitBreaker({
        provider: 'google-maps',
        failureThreshold: 3,
        openDurationMs: 100,
      });

      expect(breaker.getState()).toBe('CLOSED');
      expect(breaker.isAvailable()).toBe(true);

      const result = await breaker.execute(async () => 'ok');
      expect(result).toBe('ok');
    });

    it('transitions from CLOSED to OPEN after failureThreshold consecutive failures', async () => {
      const breaker = new CircuitBreaker({
        provider: 's3-storage',
        failureThreshold: 3,
        openDurationMs: 100,
      });

      // 1st failure
      await expect(breaker.execute(async () => { throw new Error('Fail 1'); })).rejects.toThrow('Fail 1');
      expect(breaker.getState()).toBe('CLOSED');

      // 2nd failure
      await expect(breaker.execute(async () => { throw new Error('Fail 2'); })).rejects.toThrow('Fail 2');
      expect(breaker.getState()).toBe('CLOSED');

      // 3rd failure (trips threshold)
      await expect(breaker.execute(async () => { throw new Error('Fail 3'); })).rejects.toThrow('Fail 3');
      expect(breaker.getState()).toBe('OPEN');
      expect(breaker.isAvailable()).toBe(false);
    });

    it('fast-fails requests immediately with IntegrationCircuitOpenError when OPEN', async () => {
      const breaker = new CircuitBreaker({
        provider: 'sendgrid',
        failureThreshold: 2,
        openDurationMs: 500,
      });

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('OPEN');

      let called = false;
      await expect(
        breaker.execute(async () => {
          called = true;
          return 'should not run';
        })
      ).rejects.toThrow(IntegrationCircuitOpenError);

      expect(called).toBe(false);
    });

    it('transitions to HALF-OPEN after openDurationMs and recovers to CLOSED upon successful probe', async () => {
      const breaker = new CircuitBreaker({
        provider: 'postmark',
        failureThreshold: 2,
        openDurationMs: 30,
      });

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('OPEN');

      // Wait for open duration to elapse
      await new Promise((r) => setTimeout(r, 50));
      expect(breaker.getState()).toBe('HALF-OPEN');
      expect(breaker.isAvailable()).toBe(true);

      // Successful probe in HALF-OPEN should close the circuit
      const result = await breaker.execute(async () => 'probe-success');
      expect(result).toBe('probe-success');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('re-opens circuit immediately if a HALF-OPEN probe fails', async () => {
      const breaker = new CircuitBreaker({
        provider: 'google-maps',
        failureThreshold: 2,
        openDurationMs: 30,
      });

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('OPEN');

      await new Promise((r) => setTimeout(r, 50));
      expect(breaker.getState()).toBe('HALF-OPEN');

      // Failed probe in HALF-OPEN
      await expect(
        breaker.execute(async () => {
          throw new Error('Probe failed');
        })
      ).rejects.toThrow('Probe failed');

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('2. Provider Isolation (Gate F08)', () => {
    it('maintains independent circuit state across separate providers', async () => {
      const googleBreaker = getCircuitBreaker('google-maps', { failureThreshold: 2 });
      const s3Breaker = getCircuitBreaker('s3-storage', { failureThreshold: 2 });
      const sendgridBreaker = getCircuitBreaker('sendgrid', { failureThreshold: 2 });
      const postmarkBreaker = getCircuitBreaker('postmark', { failureThreshold: 2 });

      // Trip Google Maps breaker
      googleBreaker.recordFailure();
      googleBreaker.recordFailure();

      expect(googleBreaker.getState()).toBe('OPEN');

      // Verify that S3, SendGrid, and Postmark are unaffected
      expect(s3Breaker.getState()).toBe('CLOSED');
      expect(sendgridBreaker.getState()).toBe('CLOSED');
      expect(postmarkBreaker.getState()).toBe('CLOSED');

      const s3Result = await s3Breaker.execute(async () => 's3-ok');
      expect(s3Result).toBe('s3-ok');
    });
  });
});
