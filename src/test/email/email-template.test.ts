/**
 * COLIN Transactional Email - Template System Test Suite
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Verifies Gate E26 (HTML injection escaping) and Gate E27 (Plain-text fallback).
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  renderVerificationEmail,
  renderPasswordResetEmail,
  renderPasswordChangedEmail,
  renderAccountSecurityEmail,
} from '../../server/email';

describe('COLIN Email Template System Suite', () => {
  // Gate E26: HTML template escaping
  it('[Gate E26] strictly escapes user-supplied content to prevent HTML injection and XSS', () => {
    // 1. Core escapeHtml function
    expect(escapeHtml('<script>alert("pwned")</script>')).toBe(
      '&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#039;s');

    // 2. Verification email escaping
    const maliciousName = '<img src=x onerror=alert(1)>';
    const maliciousUrl = 'https://colin.in/verify?token="><script>alert(2)</script>';
    const verResult = renderVerificationEmail({
      firstName: maliciousName,
      verificationUrl: maliciousUrl,
    });
    expect(verResult.htmlBody).not.toContain('<script>');
    expect(verResult.htmlBody).not.toContain('<img src=x onerror=alert(1)>');
    expect(verResult.htmlBody).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(verResult.htmlBody).toContain('&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;');

    // 3. Password reset email escaping
    const resetResult = renderPasswordResetEmail({
      firstName: '<script>evil()</script>',
      resetUrl: 'https://colin.in/reset?code="onfocus="alert(3)',
    });
    expect(resetResult.htmlBody).not.toContain('<script>evil()</script>');
    expect(resetResult.htmlBody).toContain('&lt;script&gt;evil()&lt;/script&gt;');

    // 4. Account security notification escaping
    const secResult = renderAccountSecurityEmail({
      firstName: '<b>Admin</b>',
      eventDescription: '<style>body{display:none}</style>Malicious Event',
      ipAddress: '127.0.0.1<script>',
      actionRequired: '<a href="http://phish.com">Click</a>',
    });
    expect(secResult.htmlBody).not.toContain('<style>body{display:none}</style>');
    expect(secResult.htmlBody).toContain('&lt;style&gt;body{display:none}&lt;/style&gt;');
    expect(secResult.htmlBody).not.toContain('127.0.0.1<script>');
    expect(secResult.htmlBody).toContain('127.0.0.1&lt;script&gt;');
    expect(secResult.htmlBody).toContain('&lt;b&gt;Admin&lt;/b&gt;');
  });

  // Gate E27: Plain-text template generation
  it('[Gate E27] generates comprehensive plain-text versions alongside HTML for all templates', () => {
    // 1. Verification
    const v = renderVerificationEmail({
      firstName: 'Rahul',
      verificationUrl: 'https://colin.in/verify?token=abc123xyz',
      expirationHours: 24,
    });
    expect(v.textBody).toContain('Welcome to COLIN, Rahul!');
    expect(v.textBody).toContain('https://colin.in/verify?token=abc123xyz');
    expect(v.textBody).toContain('24 hours');
    expect(v.textBody).not.toContain('<html');
    expect(v.textBody).not.toContain('<div>');

    // 2. Password reset
    const r = renderPasswordResetEmail({
      firstName: 'Pooja',
      resetUrl: 'https://colin.in/reset?token=rst456',
      expirationMinutes: 60,
    });
    expect(r.textBody).toContain('Hello Pooja,');
    expect(r.textBody).toContain('https://colin.in/reset?token=rst456');
    expect(r.textBody).toContain('60 minutes');

    // 3. Password changed
    const c = renderPasswordChangedEmail({
      firstName: 'Vikram',
      changedAt: new Date('2026-11-07T12:00:00Z'),
      ipAddress: '192.168.1.100',
    });
    expect(c.textBody).toContain('Hello Vikram,');
    expect(c.textBody).toContain('successfully updated');
    expect(c.textBody).toContain('192.168.1.100');

    // 4. Account security
    const s = renderAccountSecurityEmail({
      firstName: 'Ananya',
      eventDescription: 'New session logged in from Firefox on Windows',
      ipAddress: '49.207.180.12',
      actionRequired: 'If this was not you, please change your password immediately.',
    });
    expect(s.textBody).toContain('New session logged in from Firefox on Windows');
    expect(s.textBody).toContain('49.207.180.12');
    expect(s.textBody).toContain('Action Recommended');
  });
});
