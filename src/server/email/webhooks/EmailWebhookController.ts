/**
 * COLIN Transactional Email - Webhook Controller
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Express controller for SendGrid and Postmark delivery event webhooks.
 */

import { Request, Response } from 'express';
import { SendGridWebhookHandler, SendGridEventPayload } from './SendGridWebhookHandler';
import { PostmarkWebhookHandler, PostmarkWebhookPayload } from './PostmarkWebhookHandler';

export class EmailWebhookController {
  private sendGridHandler = new SendGridWebhookHandler();
  private postmarkHandler = new PostmarkWebhookHandler();

  /**
   * POST /api/v1/webhooks/email/sendgrid
   */
  public handleSendGrid = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
    const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;

    // Use rawBody if captured, or serialize body
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isVerified = SendGridWebhookHandler.verifySignature({
      rawBody,
      signature: signature || '',
      timestamp: timestamp || '',
    });

    if (!isVerified) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED_WEBHOOK', message: 'SendGrid webhook signature verification failed.' },
      });
      return;
    }

    const events: SendGridEventPayload[] = Array.isArray(req.body) ? req.body : [req.body];
    const result = await this.sendGridHandler.handleEvents(events);

    res.status(200).json({
      success: true,
      data: {
        processed: result.processed,
        skippedDuplicates: result.skippedDuplicates,
      },
    });
  };

  /**
   * POST /api/v1/webhooks/email/postmark
   */
  public handlePostmark = async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;

    const isVerified = PostmarkWebhookHandler.verifyBasicAuth(authHeader);
    if (!isVerified) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED_WEBHOOK', message: 'Invalid Postmark HTTP Basic Authentication credentials.' },
      });
      return;
    }

    const payload: PostmarkWebhookPayload = req.body;
    const result = await this.postmarkHandler.handleEvent(payload);

    res.status(200).json({
      success: true,
      data: {
        processed: result.processed,
        isDuplicate: result.isDuplicate,
      },
    });
  };
}

export const emailWebhookController = new EmailWebhookController();
