// Archive storage logic, kept apart from the Vercel handler so it can run against any Redis-like client.
import { randomBytes, createHash } from 'node:crypto';

export const STICKERS = ['tteok', 'mandu', 'mushroom', 'tomato', 'egg-deep', 'egg-light', 'clover', 'horse-sit', 'horse-stand'];
export const BOWLS = ['bowl-brass', 'bowl-white', 'bowl-bok'];
const LIST_LIMIT = 400;
const HASH = 'bowls';          // id -> JSON body
const INDEX = 'bowls:by-time'; // sorted set, score = createdAt
const KEYS = 'bowls:keys';     // id -> sha256(edit key)

const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
// prefixes keep values from being read back as numbers by the client's JSON auto-parsing
const sha = s => 'k:' + createHash('sha256').update(String(s)).digest('hex');

// Everything that comes in from a browser is untrusted: keep only known shapes and sizes.
export function clean(body) {
  const items = Array.isArray(body?.items) ? body.items.slice(0, 60)
    .filter(i => i && STICKERS.includes(i.type))
    .map(i => ({ type: i.type, x: num(i.x, 0, 1000, 500), y: num(i.y, 0, 1000, 500), s: num(i.s, 20, 800, 160), r: num(i.r, -3600, 3600, 0) })) : [];
  return {
    bowl: BOWLS.includes(body?.bowl) ? body.bowl : BOWLS[0],
    items,
    msg: String(body?.msg ?? '').slice(0, 120),
    from: String(body?.from ?? '').slice(0, 20),
  };
}

export async function listBowls(redis) {
  const ids = await redis.zrange(INDEX, 0, LIST_LIMIT - 1, { rev: true });
  if (!ids.length) return [];
  const rows = await redis.hmget(HASH, ...ids);
  return ids.map(id => {
    const raw = rows?.[id];
    if (!raw) return null;
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...d, id: String(id) };
  }).filter(Boolean);
}

// Create a new entry, or update one when the caller holds its edit key (the same visit saving again).
export async function saveBowl(redis, body) {
  const data = clean(body);
  let id = typeof body?.id === 'string' && /^b[a-f0-9]{16}$/.test(body.id) ? body.id : null;
  let key = typeof body?.key === 'string' ? body.key : null;
  if (id) {
    const stored = await redis.hget(KEYS, id);
    if (!stored || stored !== sha(key)) { id = null; key = null; }
  }
  const isNew = !id;
  if (isNew) { id = 'b' + randomBytes(8).toString('hex'); key = randomBytes(16).toString('hex'); }
  const createdAt = Date.now();
  await redis.hset(HASH, { [id]: JSON.stringify({ ...data, createdAt }) });
  await redis.zadd(INDEX, { score: createdAt, member: id });
  if (isNew) await redis.hset(KEYS, { [id]: sha(key) });
  return { id, key };
}
