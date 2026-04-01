// lib/webhook-verify.js
import crypto from 'crypto';

export function verifyWebhookSignature(signingSecret, signature, rawBody) {
  if (!signature || !signingSecret) return false;

  try {
    const fields = signature.split(';');
    // Format: hmac;1;timestamp;digest
    const timestamp = fields[2];
    const providedDigest = fields[3];

    const signedData = timestamp + '.' + rawBody;
    const signingKeyBinary = Buffer.from(signingSecret, 'base64').toString('binary');

    const computedDigest = crypto
      .createHmac('sha256', signingKeyBinary)
      .update(Buffer.from(signedData, 'utf8'))
      .digest('base64');

    return providedDigest === computedDigest;
  } catch (err) {
    console.error('Webhook signature verification error:', err);
    return false;
  }
}
