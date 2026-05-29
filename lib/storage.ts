/**
 * Supabase Storage helpers for the playbook store.
 *
 * PDFs live in a private bucket named `store-products`. We never expose direct
 * URLs. Instead, on demand we mint a signed URL with a 24-hour TTL via the
 * Supabase admin SDK. The signed URL is delivered via email at checkout time
 * and rendered on the success page.
 */

import { getSupabase } from './supabase';

const BUCKET = 'store-products';
const TTL_SECONDS = 60 * 60 * 24; // 24 hours

/**
 * Mint a 24h signed download URL for a stored PDF.
 * Returns null if Supabase is not configured or the file does not exist.
 */
export async function getSignedDownloadUrl(pdfFileName: string): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(pdfFileName, TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('Storage signed URL error:', error, 'file:', pdfFileName);
    return null;
  }
  return data.signedUrl;
}
