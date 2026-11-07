/**
 * COLIN Transactional Email - Provider Unit & Contract Test Suite
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Verifies Gates E01, E02, E03, E04, E05, E06, E28, E29.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MockEmailProvider,
  SendGridProvider,
  PostmarkProvider,
  createEmailProvider,
  getEmailConfig,
  resetEmailConfigCache,
  EmailConfigurationError,
  EmailMessage,
} from '../../server/email';

describe('COLIN Email Provider Unit & Contract Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetEmailConfigCache();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEmailConfigCache();
  });

  const testMessage: EmailMessage = {
    to: 'student@example.com',
    toName: 'Dev Sharma',
    from: 'no-reply@colin.in',
    fromName: 'COLIN — Campus Living Verified',
    replyTo: 'support@colin.in',
    subject: 'Confirm your accommodation email',
    htmlBody: '<p>Welcome Dev</p>',
    textBody: 'Welcome Dev',
    templateAlias: 'verification',
    idempotencyKey: 'idemp_key_12345',
    metadata: { userId: 'u_123' },
  };

  // Gate E01: Provider interface contract
  it('[Gate E01] ensures all providers satisfy the common EmailProvider contract', () => {
    const mock = new MockEmailProvider();
    const sendgrid = new SendGridProvider({ apiKey: 'SG.test_key' });
    const postmark = new PostmarkProvider({ serverToken: 'pm-test-token' });

    expect(mock.providerName).toBe('mock');
    expect(sendgrid.providerName).toBe('sendgrid');
    expect(postmark.providerName).toBe('postmark');

    expect(typeof mock.sendEmail).toBe('function');
    expect(typeof sendgrid.sendEmail).toBe('function');
    expect(typeof postmark.sendEmail).toBe('function');
  });

  // Gate E02: Mock provider behavior
  it('[Gate E02] verifies MockEmailProvider records sent messages and simulates deterministic failures', async () => {
    const mock = new MockEmailProvider();
    mock.clear();

    const result = await mock.sendEmail(testMessage);
    expect(result.success).toBe(true);
    expect(result.provider).toBe('mock');
    expect(result.providerMessageId).toMatch(/^mock_msg_/);
    expect(result.statusCode).toBe(202);

    expect(mock.getSentMessages()).toHaveLength(1);
    expect(mock.getLastMessage()?.to).toBe('student@example.com');
    expect(mock.findMessagesTo('student@example.com')).toHaveLength(1);

    // Simulate failure
    mock.setSimulatedFailure('RATE_LIMITED', 'Rate limit exceeded', true, 429);
    const failResult = await mock.sendEmail(testMessage);
    expect(failResult.success).toBe(false);
    expect(failResult.statusCode).toBe(429);
    expect(failResult.error?.code).toBe('RATE_LIMITED');
    expect(failResult.error?.retryable).toBe(true);

    mock.clear();
    expect(mock.getSentMessages()).toHaveLength(0);
  });

  // Gate E03: SendGrid adapter request mapping
  it('[Gate E03] verifies SendGridProvider formats requests according to official v3 Mail Send API', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = (async (url: any, init: any) => {
      capturedUrl = String(url);
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);
      return {
        status: 202,
        headers: new Headers({ 'x-message-id': 'sg_msg_unique_9988' }),
        text: async () => '',
      } as any;
    }) as any;

    const sendgrid = new SendGridProvider({
      apiKey: 'SG.test_secret_api_key_123',
      fetchFn: mockFetch,
    });

    const result = await sendgrid.sendEmail(testMessage);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('sendgrid');
    expect(result.providerMessageId).toBe('sg_msg_unique_9988');

    expect(capturedUrl).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(capturedHeaders.Authorization).toBe('Bearer SG.test_secret_api_key_123');
    expect(capturedHeaders['Content-Type']).toBe('application/json');

    expect(capturedBody.personalizations[0].to[0]).toEqual({
      email: 'student@example.com',
      name: 'Dev Sharma',
    });
    expect(capturedBody.personalizations[0].subject).toBe(testMessage.subject);
    expect(capturedBody.from.email).toBe('no-reply@colin.in');
    expect(capturedBody.reply_to.email).toBe('support@colin.in');
    expect(capturedBody.content).toEqual([
      { type: 'text/plain', value: 'Welcome Dev' },
      { type: 'text/html', value: '<p>Welcome Dev</p>' },
    ]);
    expect(capturedBody.custom_args.idempotencyKey).toBe('idemp_key_12345');
    expect(capturedBody.custom_args.userId).toBe('u_123');
  });

  // Gate E04: Postmark adapter request mapping
  it('[Gate E04] verifies PostmarkProvider formats requests according to official Server API', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> = {};
    let capturedBody: any = null;

    const mockFetch = (async (url: any, init: any) => {
      capturedUrl = String(url);
      capturedHeaders = init.headers;
      capturedBody = JSON.parse(init.body);
      return {
        status: 200,
        text: async () =>
          JSON.stringify({
            To: 'student@example.com',
            SubmittedAt: '2026-11-07T12:00:00Z',
            MessageID: 'pm_msg_id_445566',
            ErrorCode: 0,
            Message: 'OK',
          }),
      } as any;
    }) as any;

    const postmark = new PostmarkProvider({
      serverToken: 'pm_server_token_xyz',
      fetchFn: mockFetch,
    });

    const result = await postmark.sendEmail(testMessage);

    expect(result.success).toBe(true);
    expect(result.provider).toBe('postmark');
    expect(result.providerMessageId).toBe('pm_msg_id_445566');

    expect(capturedUrl).toBe('https://api.postmarkapp.com/email');
    expect(capturedHeaders['X-Postmark-Server-Token']).toBe('pm_server_token_xyz');
    expect(capturedHeaders['Content-Type']).toBe('application/json');

    expect(capturedBody.From).toBe('"COLIN — Campus Living Verified" <no-reply@colin.in>');
    expect(capturedBody.To).toBe('"Dev Sharma" <student@example.com>');
    expect(capturedBody.Subject).toBe(testMessage.subject);
    expect(capturedBody.HtmlBody).toBe('<p>Welcome Dev</p>');
    expect(capturedBody.TextBody).toBe('Welcome Dev');
    expect(capturedBody.ReplyTo).toBe('support@colin.in');
    expect(capturedBody.Tag).toBe('verification');
    expect(capturedBody.Metadata.idempotencyKey).toBe('idemp_key_12345');
    expect(capturedBody.Metadata.userId).toBe('u_123');
  });

  // Gate E05: Provider configuration validation
  it('[Gate E05] validates email configuration parameters using Zod schema', () => {
    process.env.EMAIL_PROVIDER = 'postmark';
    process.env.EMAIL_FROM_ADDRESS = 'notifications@colin.in';
    process.env.EMAIL_MAX_RETRIES = '7';

    const config = getEmailConfig(true);
    expect(config.provider).toBe('postmark');
    expect(config.fromAddress).toBe('notifications@colin.in');
    expect(config.maxRetries).toBe(7);
  });

  // Gate E06: Production rejects missing credentials or mock provider
  it('[Gate E06] enforces production guardrails rejecting mock provider and missing credentials', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ALLOW_MOCK_EMAIL_IN_PRODUCTION;

    // Production with mock provider must throw
    process.env.EMAIL_PROVIDER = 'mock';
    expect(() => getEmailConfig(true)).toThrow(EmailConfigurationError);

    // Production with sendgrid missing key must throw
    process.env.EMAIL_PROVIDER = 'sendgrid';
    delete process.env.SENDGRID_API_KEY;
    expect(() => getEmailConfig(true)).toThrow(EmailConfigurationError);

    // Production with postmark missing token must throw
    process.env.EMAIL_PROVIDER = 'postmark';
    delete process.env.POSTMARK_SERVER_TOKEN;
    expect(() => getEmailConfig(true)).toThrow(EmailConfigurationError);
  });

  // Gate E28: Email provider outage handling
  it('[Gate E28] handles network outages and normalizes provider errors with retryable flags', async () => {
    // 1. SendGrid network failure
    const networkFailFetch = (async () => {
      throw new Error('ECONNRESET connection reset by peer');
    }) as any;

    const sendgridOutage = new SendGridProvider({
      apiKey: 'SG.test_key',
      fetchFn: networkFailFetch,
    });
    const sgResult = await sendgridOutage.sendEmail(testMessage);
    expect(sgResult.success).toBe(false);
    expect(sgResult.error?.code).toBe('SENDGRID_NETWORK_ERROR');
    expect(sgResult.error?.retryable).toBe(true);

    // 2. Postmark 429 rate limit (retryable)
    const rateLimitFetch = (async () => {
      return {
        status: 429,
        text: async () => JSON.stringify({ ErrorCode: 429, Message: 'You have exceeded your rate limit' }),
      } as any;
    }) as any;

    const postmarkRateLimit = new PostmarkProvider({
      serverToken: 'pm_token',
      fetchFn: rateLimitFetch,
    });
    const pmResult = await postmarkRateLimit.sendEmail(testMessage);
    expect(pmResult.success).toBe(false);
    expect(pmResult.error?.retryable).toBe(true);

    // 3. Postmark 401 unauthenticated (non-retryable)
    const unauthorizedFetch = (async () => {
      return {
        status: 401,
        text: async () => JSON.stringify({ ErrorCode: 10, Message: 'Invalid server token' }),
      } as any;
    }) as any;

    const postmarkAuthFail = new PostmarkProvider({
      serverToken: 'bad_token',
      fetchFn: unauthorizedFetch,
    });
    const authFailResult = await postmarkAuthFail.sendEmail(testMessage);
    expect(authFailResult.success).toBe(false);
    expect(authFailResult.error?.retryable).toBe(false);
  });

  // Gate E29: Provider switch through configuration
  it('[Gate E29] seamlessly switches provider implementation based on configuration', () => {
    process.env.NODE_ENV = 'development';

    process.env.EMAIL_PROVIDER = 'mock';
    resetEmailConfigCache();
    const p1 = createEmailProvider();
    expect(p1.providerName).toBe('mock');

    process.env.EMAIL_PROVIDER = 'sendgrid';
    process.env.SENDGRID_API_KEY = 'SG.dummy_key';
    resetEmailConfigCache();
    const p2 = createEmailProvider();
    expect(p2.providerName).toBe('sendgrid');

    process.env.EMAIL_PROVIDER = 'postmark';
    process.env.POSTMARK_SERVER_TOKEN = 'pm_dummy_token';
    resetEmailConfigCache();
    const p3 = createEmailProvider();
    expect(p3.providerName).toBe('postmark');
  });
});
