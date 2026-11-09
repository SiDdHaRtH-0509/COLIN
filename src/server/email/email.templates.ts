/**
 * COLIN Transactional Email - Template Engine
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Generates brand-aligned, accessible HTML and plain-text emails.
 * Enforces Gate E26 (HTML injection escaping) and Gate E27 (Plain-text fallback).
 */

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) {
    return '';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RenderedTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Base responsive email HTML wrapper with COLIN brand identity.
 * Palette:
 * - Navy: #142B45
 * - Teal: #16B8A6
 * - Amber: #F4B860
 * - Off-white: #F8FAFC
 * - Charcoal: #1E293B
 */
function wrapBaseLayout(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #1E293B;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F8FAFC;
      padding: 32px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #E2E8F0;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(20, 43, 69, 0.05);
    }
    .header {
      background-color: #142B45;
      padding: 24px 32px;
      text-align: left;
    }
    .logo-text {
      color: #16B8A6;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .logo-sub {
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .body-content {
      padding: 36px 32px;
    }
    .btn {
      display: inline-block;
      background-color: #16B8A6;
      color: #FFFFFF !important;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 10px;
      margin: 24px 0;
      text-align: center;
    }
    .fallback-box {
      background-color: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 8px;
      padding: 12px;
      margin-top: 16px;
      word-break: break-all;
      font-size: 12px;
      color: #64748B;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 20px 32px;
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
    }
    .security-notice {
      border-left: 4px solid #F4B860;
      background-color: #FFFBEB;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 13px;
      color: #92400E;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-text">COLIN</div>
        <div class="logo-sub">Campus Living Verified</div>
      </div>
      <div class="body-content">
        ${contentHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">This is a security notification from COLIN (Campus Living Verified).</p>
        <p style="margin: 0;">If you need assistance, please contact <a href="mailto:support@colin.in" style="color: #16B8A6;">support@colin.in</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Email Verification Template
 */
export function renderVerificationEmail(data: {
  firstName: string;
  verificationUrl: string;
  expirationHours?: number;
}): RenderedTemplate {
  const safeName = escapeHtml(data.firstName || 'Student');
  const safeUrl = escapeHtml(data.verificationUrl);
  const hours = data.expirationHours || 24;

  const subject = 'Verify your email address — COLIN';

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Welcome to COLIN, ${safeName}!</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Thank you for registering on COLIN — Campus Living Verified. To ensure the safety of our student community, please confirm your email address.
    </p>
    <div style="text-align: center;">
      <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
    </div>
    <p style="margin: 16px 0 0 0; font-size: 13px; color: #64748B;">
      This verification link will expire in <strong>${hours} hours</strong>. If you did not create an account on COLIN, you can safely ignore this email.
    </p>
    <div class="fallback-box">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${safeUrl}" style="color: #16B8A6;">${safeUrl}</a>
    </div>
  `;

  const textBody = `Welcome to COLIN, ${data.firstName || 'Student'}!

Thank you for registering on COLIN — Campus Living Verified. Please verify your email address by opening the following link:

${data.verificationUrl}

This link will expire in ${hours} hours.
If you did not create a COLIN account, please ignore this email.

— Team COLIN
support@colin.in`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 2. Password Reset Template
 */
export function renderPasswordResetEmail(data: {
  firstName: string;
  resetUrl: string;
  expirationMinutes?: number;
}): RenderedTemplate {
  const safeName = escapeHtml(data.firstName || 'User');
  const safeUrl = escapeHtml(data.resetUrl);
  const minutes = data.expirationMinutes || 60;

  const subject = 'Reset your password — COLIN';

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Password Reset Request</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, we received a request to reset your COLIN password. Click the button below to choose a new password:
    </p>
    <div style="text-align: center;">
      <a href="${safeUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
    </div>
    <div class="security-notice">
      <strong>Security Notice:</strong> This link is valid for <strong>${minutes} minutes</strong> and can only be used once. If you did not request a password reset, someone may have entered your email by mistake. Your account is still secure.
    </div>
    <div class="fallback-box">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${safeUrl}" style="color: #16B8A6;">${safeUrl}</a>
    </div>
  `;

  const textBody = `Hello ${data.firstName || 'User'},

We received a request to reset your COLIN password. Open the following link to choose a new password:

${data.resetUrl}

This link is valid for ${minutes} minutes and can only be used once.
If you did not request this, you can safely ignore this email. Your password will remain unchanged.

— Team COLIN
support@colin.in`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 3. Password Changed Notification Template
 */
export function renderPasswordChangedEmail(data: {
  firstName: string;
  changedAt?: Date;
  ipAddress?: string;
  securityGuidanceUrl?: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.firstName || 'User');
  const timeStr = data.changedAt ? data.changedAt.toUTCString() : new Date().toUTCString();
  const safeIp = data.ipAddress ? escapeHtml(data.ipAddress) : 'Unknown IP';
  const supportUrl = data.securityGuidanceUrl || 'https://colin.in/support';

  const subject = 'Your COLIN password was changed';

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Password Changed Successfully</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, your COLIN account password was successfully updated on <strong>${escapeHtml(timeStr)}</strong> (IP: ${safeIp}).
    </p>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      All existing active sessions on other devices have been invalidated for your protection.
    </p>
    <div class="security-notice">
      <strong>Did not make this change?</strong> If you did not change your password, your account may be compromised. Please immediately reset your password and review our <a href="${escapeHtml(supportUrl)}" style="color: #92400E; font-weight: 700;">Security Guidance</a> or contact our security team at <a href="mailto:security@colin.in" style="color: #92400E; font-weight: 700;">security@colin.in</a>.
    </div>
  `;

  const textBody = `Hello ${data.firstName || 'User'},

Your COLIN account password was successfully updated on ${timeStr} (IP: ${safeIp}).
All active sessions on other devices have been invalidated for your security.

If you did not make this change, please immediately reset your password and contact security@colin.in.

— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 4. Account Security Notification Template
 */
export function renderAccountSecurityEmail(data: {
  firstName: string;
  eventDescription: string;
  timestamp?: Date;
  ipAddress?: string;
  actionRequired?: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.firstName || 'User');
  const safeDesc = escapeHtml(data.eventDescription);
  const timeStr = data.timestamp ? data.timestamp.toUTCString() : new Date().toUTCString();
  const safeIp = data.ipAddress ? escapeHtml(data.ipAddress) : null;
  const safeAction = data.actionRequired ? escapeHtml(data.actionRequired) : null;

  const subject = 'COLIN Account Security Notification';

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Security Alert</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, we detected an account security event:
    </p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #142B45;">${safeDesc}</p>
      <p style="margin: 0; font-size: 13px; color: #64748B;">Time: ${escapeHtml(timeStr)}${safeIp ? ` • IP: ${safeIp}` : ''}</p>
    </div>
    ${safeAction ? `<div class="security-notice"><strong>Action Recommended:</strong> ${safeAction}</div>` : ''}
  `;

  const textBody = `Hello ${data.firstName || 'User'},

COLIN Account Security Event: ${data.eventDescription}
Time: ${timeStr}${safeIp ? ` (IP: ${safeIp})` : ''}

${data.actionRequired ? `Action Recommended: ${data.actionRequired}\n` : ''}
— Team COLIN
support@colin.in`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}


/**
 * 5. Booking Confirmation Template
 */
export function renderBookingConfirmationEmail(data: {
  studentName: string;
  propertyName: string;
  bookingId: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.studentName || 'Student');
  const safeProp = escapeHtml(data.propertyName);
  const subject = `Visit Request Received — ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Guided Visit Requested!</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, your visit request for <strong>${safeProp}</strong> has been logged.
    </p>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Booking Reference: <code>${escapeHtml(data.bookingId)}</code>
    </p>
    <p style="margin: 0; line-height: 1.6; color: #334155;">
      Please complete the ₹150 visit pass fee to activate scheduling with our COLIN visit guide.
    </p>
  `;

  const textBody = `Hello ${data.studentName || 'Student'},
Your visit request for ${data.propertyName} has been recorded (Ref: ${data.bookingId}).
Please complete the ₹150 visit pass fee to proceed with scheduling.
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 6. Payment Confirmation Template
 */
export function renderPaymentConfirmationEmail(data: {
  studentName: string;
  propertyName: string;
  amount: number;
  paymentReference: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.studentName || 'Student');
  const safeProp = escapeHtml(data.propertyName);
  const subject = `Payment Confirmed — ₹${data.amount.toFixed(2)} for ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Payment Verified!</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, we verified your payment of <strong>₹${data.amount.toFixed(2)}</strong> for the in-person visit to <strong>${safeProp}</strong>.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B;">
      Payment Reference: ${escapeHtml(data.paymentReference)}
    </p>
    <div class="security-notice">
      <strong>55% Guarantee:</strong> If after the visit you decide not to proceed, ₹82.50 (55%) will be refunded automatically.
    </div>
  `;

  const textBody = `Hello ${data.studentName || 'Student'},
We received your payment of ₹${data.amount.toFixed(2)} for ${data.propertyName} (Ref: ${data.paymentReference}).
Our operations team will assign a visit slot shortly.
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 7. Visit Scheduled Template
 */
export function renderVisitScheduledEmail(data: {
  studentName: string;
  propertyName: string;
  scheduledTime: string;
  address: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.studentName || 'Student');
  const safeProp = escapeHtml(data.propertyName);
  const subject = `Visit Scheduled — ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Your Visit is Confirmed!</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, an in-person guided visit to <strong>${safeProp}</strong> has been scheduled.
    </p>
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #142B45;">Scheduled Time: ${escapeHtml(data.scheduledTime)}</p>
      <p style="margin: 0; font-size: 13px; color: #64748B;">Address: ${escapeHtml(data.address)}</p>
    </div>
  `;

  const textBody = `Hello ${data.studentName || 'Student'},
Your visit to ${data.propertyName} is scheduled for: ${data.scheduledTime} at ${data.address}.
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 8. Visit Completed & 12-Hour Decision Window Template
 */
export function renderVisitCompletedEmail(data: {
  studentName: string;
  propertyName: string;
  deadlineTime: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.studentName || 'Student');
  const safeProp = escapeHtml(data.propertyName);
  const subject = `Visit Completed — 12-Hour Decision Window Open for ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Physical Inspection Complete</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, your visit to <strong>${safeProp}</strong> has been recorded as complete by our guide.
    </p>
    <div class="security-notice">
      <strong>Decision Deadline:</strong> You have 12 hours (until <strong>${escapeHtml(data.deadlineTime)}</strong>) to accept or reject this stay.
    </div>
    <p style="margin: 16px 0 0 0; font-size: 13px; color: #334155;">
      • <strong>Accept:</strong> Secures your room allocation.<br>
      • <strong>Reject:</strong> 55% refund (₹82.50) processed to your account.
    </p>
  `;

  const textBody = `Hello ${data.studentName || 'Student'},
Your visit to ${data.propertyName} is completed.
Your 12-hour decision deadline expires on: ${data.deadlineTime}.
Please log into COLIN to submit your decision (Accept or Reject).
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 9. Booking Decision Outcome Template
 */
export function renderBookingDecisionEmail(data: {
  studentName: string;
  propertyName: string;
  decision: string;
  refundAmount: number;
}): RenderedTemplate {
  const safeName = escapeHtml(data.studentName || 'Student');
  const safeProp = escapeHtml(data.propertyName);
  const isAccepted = data.decision === 'ACCEPTED';
  const subject = `Booking ${isAccepted ? 'Confirmed' : 'Decision Recorded'} — ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Decision: ${escapeHtml(data.decision)}</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, your decision for <strong>${safeProp}</strong> has been processed.
    </p>
    ${
      isAccepted
        ? `<p style="margin: 0; color: #047857; font-weight: 700;">Congratulations! The property host has been notified of your acceptance.</p>`
        : `<p style="margin: 0; color: #B45309;">Your refund of <strong>₹${data.refundAmount.toFixed(2)}</strong> has been scheduled.</p>`
    }
  `;

  const textBody = `Hello ${data.studentName || 'Student'},
Your decision (${data.decision}) for ${data.propertyName} is confirmed.
${isAccepted ? 'Room reservation confirmed.' : `Refund of ₹${data.refundAmount.toFixed(2)} scheduled.`}
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 10. Property Submitted for Moderation Template
 */
export function renderPropertySubmittedEmail(data: {
  ownerName: string;
  propertyName: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.ownerName || 'Property Host');
  const safeProp = escapeHtml(data.propertyName);
  const subject = `Listing Submitted for Verification — ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">Listing Under Review</h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, your listing <strong>${safeProp}</strong> has been submitted to the COLIN verification queue.
    </p>
    <p style="margin: 0; font-size: 13px; color: #64748B;">
      Our quality assurance team will inspect the details and photographs. You will receive an update once approved.
    </p>
  `;

  const textBody = `Hello ${data.ownerName || 'Property Host'},
Your listing ${data.propertyName} has been submitted for COLIN verification.
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}

/**
 * 11. Property Moderation Decision Template
 */
export function renderPropertyModerationEmail(data: {
  ownerName: string;
  propertyName: string;
  status: 'VERIFIED' | 'REJECTED';
  reason?: string;
}): RenderedTemplate {
  const safeName = escapeHtml(data.ownerName || 'Property Host');
  const safeProp = escapeHtml(data.propertyName);
  const isApproved = data.status === 'VERIFIED';
  const subject = `Listing ${isApproved ? 'Approved & Verified' : 'Needs Attention'} — ${data.propertyName}`;

  const htmlContent = `
    <h2 style="margin: 0 0 16px 0; color: #142B45; font-size: 20px;">
      ${isApproved ? 'Congratulations! Listing Verified' : 'Listing Requires Revisions'}
    </h2>
    <p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">
      Hello ${safeName}, our inspection team has completed review of <strong>${safeProp}</strong>.
    </p>
    ${
      isApproved
        ? `<p style="margin: 0; color: #047857; font-weight: 700;">Your accommodation is now live and discoverable in student searches!</p>`
        : `<div class="security-notice"><strong>Reason:</strong> ${escapeHtml(data.reason || 'Missing required information.')}</div>
           <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748B;">You can update the listing from your Owner Dashboard and resubmit.</p>`
    }
  `;

  const textBody = `Hello ${data.ownerName || 'Property Host'},
Review for ${data.propertyName}: ${isApproved ? 'VERIFIED and live!' : `REJECTED: ${data.reason || 'Requires revisions.'}`}
— Team COLIN`;

  return {
    subject,
    htmlBody: wrapBaseLayout(subject, htmlContent),
    textBody,
  };
}
