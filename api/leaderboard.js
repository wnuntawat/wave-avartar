'use strict';
/* Vercel Serverless Function — กระดานอันดับออนไลน์ของ WAVE RACE
   เก็บใน Upstash Redis (ตั้ง env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
   หรือ KV_REST_API_URL / KV_REST_API_TOKEN ถ้าเพิ่มจาก Vercel Marketplace)
   GET  /api/leaderboard?model=all|wave|ls|sp|kr  -> { rows: [{pid,name,model,et,trap,hp}] }
   POST /api/leaderboard {pid,name,et,trap,model,hp}  -> { ok:true }
   หมายเหตุ: ผลการแข่งถูกคำนวณฝั่งเบราว์เซอร์ จึงมีแค่การตรวจความสมเหตุสมผล ไม่กันโกงได้ 100% */

const MODELS = ['wave', 'ls', 'sp', 'kr'];
const MIN_ET = 9.0, MAX_ET = 60;

function cfg() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}
async function pipeline(c, cmds) {
  const r = await fetch(c.url + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + c.token, 'content-type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('redis ' + r.status);
  return r.json();
}
function clean(s) { return String(s || '').replace(/[\u0000-\u001f<>&"'`]/g, '').trim().slice(0, 16); }
function body(req) { if (req.body && typeof req.body === 'object') return req.body; try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const c = cfg();
  if (!c) return res.status(503).json({ error: 'leaderboard not configured' });
  try {
    if (req.method === 'GET') {
      const model = MODELS.includes(req.query && req.query.model) ? req.query.model : 'all';
      const key = 'wr:et:' + model;
      const [[z]] = [await pipeline(c, [['ZRANGE', key, 0, 29, 'WITHSCORES']])].map(a => a.map(x => x.result));
      const ids = [], ets = [];
      for (let i = 0; i < (z || []).length; i += 2) { ids.push(z[i]); ets.push(parseFloat(z[i + 1])); }
      let metas = [];
      if (ids.length) { const out = await pipeline(c, [['HMGET', 'wr:meta:' + model, ...ids]]); metas = out[0].result || []; }
      const rows = ids.map((pid, i) => { let m = {}; try { m = JSON.parse(metas[i] || '{}'); } catch (e) { /* ignore */ } return { pid, name: m.name || '???', model: m.model || model, et: ets[i], trap: m.trap || 0, hp: m.hp || 0 }; });
      return res.status(200).json({ rows });
    }
    if (req.method === 'POST') {
      const b = body(req);
      const pid = String(b.pid || '').replace(/[^a-z0-9]/gi, '').slice(0, 24);
      const name = clean(b.name), et = Number(b.et), trap = Number(b.trap) || 0, hp = Number(b.hp) || 0;
      if (!pid || !name || !MODELS.includes(b.model)) return res.status(400).json({ error: 'bad request' });
      if (!(et >= MIN_ET && et <= MAX_ET) || trap < 0 || trap > 260 || hp < 0 || hp > 140) return res.status(422).json({ error: 'implausible run' });
      const meta = JSON.stringify({ name, model: b.model, trap: +trap.toFixed(1), hp: +hp.toFixed(1) });
      const keys = ['all', b.model];
      // 'LT' = อัปเดตเฉพาะเมื่อเวลาดีกว่าเดิม, 'CH' = คืน 1 เมื่อมีการเปลี่ยน
      const zr = await pipeline(c, keys.map(m => ['ZADD', 'wr:et:' + m, 'LT', 'CH', et.toFixed(3), pid]));
      const sets = [];
      keys.forEach((m, k) => { if (Number(zr[k] && zr[k].result) > 0) sets.push(['HSET', 'wr:meta:' + m, pid, meta]); });
      if (sets.length) await pipeline(c, sets);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(502).json({ error: 'upstream error' });
  }
};
