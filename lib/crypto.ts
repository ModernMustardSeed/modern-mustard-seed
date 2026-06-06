import crypto from 'node:crypto';

/**
 * Symmetric encryption for stored secrets (the credentials vault). AES-256-GCM
 * with a key derived from a server-only secret. Authenticated, so tampering is
 * detected on decrypt. Node runtime only.
 */

function key(): Buffer {
  const secret =
    process.env.CREDENTIALS_SECRET || process.env.ADMIN_SESSION_SECRET || process.env.CLIENT_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('CREDENTIALS_SECRET (or ADMIN_SESSION_SECRET) is not configured');
  }
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

export function encryptSecret(plain: string): { ciphertext: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: enc.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
}

export function decryptSecret(ciphertext: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
  return dec.toString('utf8');
}
