/**
 * COLIN Local Storage Asset Delivery Routes
 * Phase 4A.2.5.1: Cloud Image Storage Infrastructure
 * 
 * Delivers processed image assets in local development and testing environments.
 */

import { Router, Request, Response } from 'express';
import { storageProvider, LocalStorageProvider } from '../../../storage';

const router = Router();

router.get('/images/*filepath', (req: Request, res: Response): void => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filepathParam = (req.params as any).filepath;
  const rawPath = Array.isArray(filepathParam)
    ? filepathParam.join('/')
    : String(filepathParam || (req.params as any)[0] || '');
  const storageKey = rawPath ? rawPath.replace(/[^a-zA-Z0-9._\-/]/g, '') : '';

  if (!storageKey) {
    res.status(400).json({ success: false, error: { code: 'INVALID_KEY', message: 'Invalid storage key' } });
    return;
  }

  if (storageProvider instanceof LocalStorageProvider) {
    const item = (storageProvider as LocalStorageProvider).getBuffer(storageKey);
    if (!item) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Image asset not found' } });
      return;
    }

    res.setHeader('Content-Type', item.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(item.buffer);
    return;
  }

  // If using cloud storage, redirect to CDN / S3 delivery URL
  storageProvider.getDeliveryUrl(storageKey).then((url: string) => {
    res.redirect(302, url);
  }).catch(() => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
  });
});

export default router;
