/**
 * COLIN Circuit Breaker Architecture
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Implements a lightweight, isolated circuit breaker state machine (CLOSED, OPEN, HALF-OPEN)
 * with per-provider isolation, failure thresholding, half-open probing, and observable state metrics.
 */

import { IntegrationCircuitOpenError, IntegrationProviderName } from './errors';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

export interface CircuitBreakerConfig {
  provider: IntegrationProviderName;
  failureThreshold?: number;      // Number of failures before tripping (default 3)
  openDurationMs?: number;        // Time spent in OPEN before HALF-OPEN probe (default 15,000ms)
  halfOpenProbeLimit?: number;    // Number of probe calls allowed in HALF-OPEN (default 1)
  onStateChange?: (from: CircuitState, to: CircuitState, provider: IntegrationProviderName) => void;
}

export interface CircuitBreakerMetrics {
  provider: IntegrationProviderName;
  state: CircuitState;
  consecutiveFailures: number;
  totalSuccesses: number;
  totalFailures: number;
  totalRejected: number;
  lastStateChange: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
}

export class CircuitBreaker {
  public readonly provider: IntegrationProviderName;
  public readonly failureThreshold: number;
  public readonly openDurationMs: number;
  public readonly halfOpenProbeLimit: number;

  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private totalSuccesses = 0;
  private totalFailures = 0;
  private totalRejected = 0;
  private lastStateChange: number = Date.now();
  private lastFailureTime?: number;
  private lastSuccessTime?: number;
  private halfOpenActiveProbes = 0;
  private onStateChange?: (from: CircuitState, to: CircuitState, provider: IntegrationProviderName) => void;

  constructor(config: CircuitBreakerConfig) {
    this.provider = config.provider;
    this.failureThreshold = Math.max(1, config.failureThreshold ?? 3);
    this.openDurationMs = Math.max(10, config.openDurationMs ?? 15000);
    this.halfOpenProbeLimit = Math.max(1, config.halfOpenProbeLimit ?? 1);
    this.onStateChange = config.onStateChange;
  }

  public getState(): CircuitState {
    this.checkStateTransition();
    return this.state;
  }

  public isAvailable(): boolean {
    const currentState = this.getState();
    if (currentState === 'CLOSED') return true;
    if (currentState === 'HALF-OPEN') {
      return this.halfOpenActiveProbes < this.halfOpenProbeLimit;
    }
    return false; // OPEN
  }

  /**
   * Evaluates whether an OPEN circuit has timed out and should transition to HALF-OPEN.
   */
  private checkStateTransition(): void {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastStateChange;
      if (elapsed >= this.openDurationMs) {
        this.transitionTo('HALF-OPEN');
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'HALF-OPEN') {
      this.halfOpenActiveProbes = 0;
    } else if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
      this.halfOpenActiveProbes = 0;
    }
    if (this.onStateChange) {
      this.onStateChange(oldState, newState, this.provider);
    }
  }

  /**
   * Executes an async action protected by the circuit breaker.
   */
  public async execute<T>(action: () => Promise<T>): Promise<T> {
    this.checkStateTransition();

    if (this.state === 'OPEN') {
      this.totalRejected++;
      const resetTimeoutMs = Math.max(0, this.openDurationMs - (Date.now() - this.lastStateChange));
      throw new IntegrationCircuitOpenError(
        `Circuit breaker for provider '${this.provider}' is OPEN. Fast-failing request.`,
        {
          provider: this.provider,
          resetTimeoutMs,
        }
      );
    }

    if (this.state === 'HALF-OPEN') {
      if (this.halfOpenActiveProbes >= this.halfOpenProbeLimit) {
        this.totalRejected++;
        throw new IntegrationCircuitOpenError(
          `Circuit breaker for provider '${this.provider}' is HALF-OPEN. Probe limit reached.`,
          {
            provider: this.provider,
            resetTimeoutMs: this.openDurationMs,
          }
        );
      }
      this.halfOpenActiveProbes++;
    }

    try {
      const result = await action();
      this.recordSuccess();
      return result;
    } catch (err: unknown) {
      this.recordFailure(err);
      throw err;
    } finally {
      if (this.state === 'HALF-OPEN' && this.halfOpenActiveProbes > 0) {
        this.halfOpenActiveProbes--;
      }
    }
  }

  public recordSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === 'HALF-OPEN') {
      // Successful probe in HALF-OPEN closes the circuit
      this.transitionTo('CLOSED');
    } else if (this.state === 'CLOSED') {
      this.consecutiveFailures = 0;
    }
  }

  public recordFailure(_err?: unknown): void {
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF-OPEN') {
      // Failed probe in HALF-OPEN immediately re-opens the circuit
      this.transitionTo('OPEN');
    } else if (this.state === 'CLOSED' && this.consecutiveFailures >= this.failureThreshold) {
      // Threshold exceeded in CLOSED trips to OPEN
      this.transitionTo('OPEN');
    }
  }

  public reset(): void {
    this.transitionTo('CLOSED');
    this.consecutiveFailures = 0;
    this.halfOpenActiveProbes = 0;
  }

  /**
   * Forces the circuit breaker into a specified state (used for testing and administrative toggling).
   */
  public forceState(newState: CircuitState): void {
    this.transitionTo(newState);
  }

  public getMetrics(): CircuitBreakerMetrics {
    this.checkStateTransition();
    return {
      provider: this.provider,
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      totalRejected: this.totalRejected,
      lastStateChange: this.lastStateChange,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }
}

// Registry maintaining provider-isolated circuit breaker instances
const circuitBreakerRegistry = new Map<IntegrationProviderName, CircuitBreaker>();

export function getCircuitBreaker(
  provider: IntegrationProviderName,
  customConfig?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  let breaker = circuitBreakerRegistry.get(provider);
  if (!breaker) {
    breaker = new CircuitBreaker({
      provider,
      failureThreshold: customConfig?.failureThreshold ?? 3,
      openDurationMs: customConfig?.openDurationMs ?? 15000,
      halfOpenProbeLimit: customConfig?.halfOpenProbeLimit ?? 1,
      onStateChange: customConfig?.onStateChange,
    });
    circuitBreakerRegistry.set(provider, breaker);
  }
  return breaker;
}

export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakerRegistry.values()) {
    breaker.reset();
  }
  circuitBreakerRegistry.clear();
}
