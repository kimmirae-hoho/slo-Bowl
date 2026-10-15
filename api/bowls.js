// GET  /api/bowls -> { bowls: [...] } newest first
// POST /api/bowls -> { id, key }      body: { bowl, items, msg, from, id?, key? }
import { Redis } from '@upstash/redis';
import { listBowls, saveBowl } from '../lib/bowls.js';

// Vercel's Upstash integration sets either the KV_* or the UPSTASH_REDIS_* pair.
let redis;
function getRedis() {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return (redis = new Redis({ url, token }));
}

export default async function handler(req, res) {
  const db = getRedis();
  if (!db) return res.status(503).json({ error: 'storage_not_configured' });
  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ bowls: await listBowls(db) });
    }
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (JSON.stringify(body).length > 20000) return res.status(413).json({ error: 'too_large' });
      return res.status(200).json(await saveBowl(db, body));
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e).slice(0, 200) });
  }
}
