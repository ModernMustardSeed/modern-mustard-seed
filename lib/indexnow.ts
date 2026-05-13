/**
 * IndexNow: pings Bing (and the broader IndexNow ecosystem) when content updates.
 * Google does not officially participate, but accelerated discovery elsewhere
 * still benefits SEO. Lightweight, no auth, no rate limits to speak of.
 *
 * Setup:
 *   1. Generate a key (random hex string), put in INDEXNOW_KEY env.
 *   2. Place a file at /public/<INDEXNOW_KEY>.txt containing only the key.
 *   3. Call submitToIndexNow(urls) whenever content changes.
 */
export async function submitToIndexNow(urls: string[]): Promise<{ ok: boolean; status?: number; error?: string }> {
  const key = process.env.INDEXNOW_KEY;
  const host = 'modernmustardseed.com';
  if (!key) return { ok: false, error: 'INDEXNOW_KEY not set' };
  if (urls.length === 0) return { ok: true };

  try {
    const res = await fetch('https://api.indexnow.org/IndexNow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: urls,
      }),
    });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
