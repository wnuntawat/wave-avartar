'use strict';
/* ============================================================
   WAVE RACE — ฉากหลัง 6 แบบ (สุ่มทุกการแข่ง)
   draw(ctx, c) วาดท้องฟ้า+ฉากไกล+ฉากกลาง เหนือเส้นขอบถนน (c.rt)
   c = { W, H, rt (ขอบถนน y), sc, cam (พิกเซลที่กล้องเลื่อน), t }
   ============================================================ */
function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function tiles(W, tileW, off, cb) {
  const x0 = -(((off % tileW) + tileW) % tileW) - tileW;
  for (let x = x0; x < W + tileW; x += tileW) cb(x);
}
function skyGrad(ctx, W, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, h + 2);
}
function glowDot(ctx, x, y, r, col) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
}
function palm(ctx, x, y, h, col, lean, sc) {
  const tx = x + lean, ty = y - h;
  ctx.strokeStyle = col; ctx.lineCap = 'round';
  ctx.lineWidth = 5 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.2, y - h * 0.55, tx, ty); ctx.stroke();
  ctx.lineWidth = 2.5 * sc; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + lean * 0.2, y - h * 0.55, tx, ty); ctx.stroke();
  ctx.fillStyle = col;
  const L = h * 0.55;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI + i * (Math.PI / 7) + (i % 2 ? 0.08 : -0.05);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.55 + L * 0.32;
    const mx = tx + Math.cos(a) * L * 0.5, my = ty + Math.sin(a) * L * 0.5 - L * 0.12;
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my - 6 * sc, ex, ey);
    ctx.quadraticCurveTo(mx, my + 8 * sc, tx, ty); ctx.fill();
  }
}
function pine(ctx, x, y, h, col, sc) {
  ctx.fillStyle = col;
  for (let i = 0; i < 4; i++) {
    const yy = y - h * (0.18 + i * 0.22), w = h * (0.34 - i * 0.06);
    ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - h * 0.3); ctx.lineTo(x + w, yy); ctx.closePath(); ctx.fill();
  }
  ctx.fillRect(x - 2 * sc, y - h * 0.2, 4 * sc, h * 0.2);
}
function ridge(ctx, W, base, amp, off, freq, col, seed) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, base + 4);
  for (let x = 0; x <= W; x += 8) {
    const u = (x + off) * freq;
    const y = base - amp * (0.5 + 0.28 * Math.sin(u + seed) + 0.2 * Math.sin(u * 2.3 + seed * 1.7) + 0.1 * Math.sin(u * 5.1 + seed * 3));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, base + 4); ctx.closePath(); ctx.fill();
}

/* ---------- ข้อมูลสุ่มคงที่ ---------- */
const CITY = (() => {
  const rnd = seeded(7); let x = 0; const a = [];
  for (let i = 0; i < 46; i++) { const w = 34 + rnd() * 60, h = 40 + rnd() * 130; a.push({ x, w, h, win: Array.from({ length: 16 }, () => rnd() < 0.35), neon: rnd() < 0.18 ? (rnd() < 0.5 ? '#ff3fa4' : '#19e3ff') : null }); x += w + rnd() * 10; }
  return { a, W: x };
})();
const STAR = (() => { const r = seeded(3); return Array.from({ length: 90 }, () => ({ x: r(), y: r() * 0.42, r: r() * 1.3 + 0.3 })); })();
const PALMS = (() => { const r = seeded(21); return Array.from({ length: 7 }, (_, i) => ({ x: i * 150 + r() * 80, h: 70 + r() * 50, lean: (r() - 0.5) * 36 })); })();
const PINES = (() => { const r = seeded(33); return Array.from({ length: 16 }, (_, i) => ({ x: i * 60 + r() * 40, h: 40 + r() * 46 })); })();
const TENTS = (() => { const r = seeded(55); let x = 0; const a = []; for (let i = 0; i < 9; i++) { const w = 60 + r() * 40; a.push({ x, w, h: 34 + r() * 20, col: ['#ff5d8f', '#ffb020', '#19e3ff', '#7bf05a', '#a56bff'][i % 5] }); x += w + 20 + r() * 20; } return { a, W: x }; })();

function nightCity(ctx, c, rainy) {
  const { W, rt, sc, cam } = c;
  skyGrad(ctx, W, rt, rainy ? [[0, '#0a0d1c'], [0.6, '#1b1c3a'], [1, '#3a2a55']] : [[0, '#070b1f'], [0.6, '#2a1650'], [1, '#ff7a3d']]);
  if (!rainy) {
    ctx.fillStyle = '#fff';
    for (const s of STAR) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(c.t * 2 + s.x * 40); ctx.beginPath(); ctx.arc(s.x * W, s.y * rt * 2, s.r, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(W * 0.82, rt * 0.28, 22 * sc, 0, 7); ctx.fill();
  }
  const tw = CITY.W * sc;
  tiles(W, tw, cam * 0.05, x0 => {
    for (const b of CITY.a) {
      const x = x0 + b.x * sc; if (x > W || x + b.w * sc < 0) continue;
      ctx.fillStyle = rainy ? '#0c1020' : '#10162e'; ctx.fillRect(x, rt - b.h * sc, b.w * sc, b.h * sc);
      ctx.fillStyle = rainy ? 'rgba(255,214,120,.5)' : 'rgba(255,214,120,.65)';
      b.win.forEach((on, i) => { if (on) ctx.fillRect(x + 6 * sc + (i % 4) * 12 * sc, rt - b.h * sc + 8 * sc + Math.floor(i / 4) * 14 * sc, 5 * sc, 7 * sc); });
      if (b.neon) { ctx.fillStyle = b.neon; ctx.fillRect(x + 4 * sc, rt - b.h * sc + 2, b.w * sc - 8 * sc, 3 * sc); glowDot(ctx, x + b.w * sc / 2, rt - b.h * sc + 4, 60 * sc, b.neon === '#ff3fa4' ? 'rgba(255,63,164,.35)' : 'rgba(25,227,255,.35)'); }
    }
  });
  poles(ctx, c);
}
function poles(ctx, c) {
  const { W, rt, sc, cam } = c, sp = 220 * sc;
  ctx.strokeStyle = '#07090f';
  tiles(W, sp, cam * 0.3, x => {
    ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.moveTo(x, rt + 2); ctx.lineTo(x, rt - 95 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 16 * sc, rt - 88 * sc); ctx.lineTo(x + 16 * sc, rt - 88 * sc); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (const dy of [-88, -80]) { ctx.beginPath(); ctx.moveTo(x, rt + dy * sc); ctx.quadraticCurveTo(x + sp / 2, rt + (dy + 18) * sc, x + sp, rt + dy * sc); ctx.stroke(); }
  });
}

function paddySunset(ctx, c) {
  const { W, rt, sc, cam } = c;
  skyGrad(ctx, W, rt, [[0, '#2b1b4a'], [0.35, '#a2386b'], [0.72, '#ff8a4a'], [1, '#ffd27a']]);
  const sx = W * 0.68, sy = rt - 26 * sc;
  glowDot(ctx, sx, sy, 230 * sc, 'rgba(255,180,90,.55)');
  ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(sx, sy, 52 * sc, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  tiles(W, 700 * sc, cam * 0.02, x => { for (const [dx, dy, w] of [[60, 70, 120], [380, 40, 160], [560, 96, 100]]) { ctx.beginPath(); ctx.ellipse(x + dx * sc, rt * 0.3 + dy * sc, w * sc, 9 * sc, 0, 0, 7); ctx.fill(); } });
  ridge(ctx, W, rt - 14 * sc, 120 * sc, cam * 0.03, 0.006 / sc, '#42234d', 1.3);
  ridge(ctx, W, rt - 6 * sc, 70 * sc, cam * 0.08, 0.009 / sc, '#2c1738', 4.2);
  // ทุ่งนา สะท้อนแสงตะวัน
  const g = ctx.createLinearGradient(0, rt - 44 * sc, 0, rt); g.addColorStop(0, '#5a6b2a'); g.addColorStop(1, '#1f2e16');
  ctx.fillStyle = g; ctx.fillRect(0, rt - 44 * sc, W, 44 * sc);
  ctx.fillStyle = 'rgba(255,200,110,.28)';
  tiles(W, 70 * sc, cam * 0.12, x => { ctx.fillRect(x, rt - 30 * sc, 36 * sc, 2.5 * sc); ctx.fillRect(x + 20 * sc, rt - 16 * sc, 40 * sc, 2.5 * sc); });
  tiles(W, 1050 * sc, cam * 0.22, x0 => { for (const p of PALMS) palm(ctx, x0 + p.x * sc, rt - 6 * sc, p.h * sc * 1.2, '#150b1c', p.lean * sc, sc); });
  // เสาไฟฟ้า
  poles(ctx, c);
}

function mistyMountain(ctx, c) {
  const { W, rt, sc, cam, t } = c;
  skyGrad(ctx, W, rt, [[0, '#6f95bd'], [0.55, '#e7c9b8'], [1, '#ffe9c6']]);
  glowDot(ctx, W * 0.25, rt - 70 * sc, 200 * sc, 'rgba(255,235,190,.5)');
  ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.arc(W * 0.25, rt - 70 * sc, 24 * sc, 0, 7); ctx.fill();
  ridge(ctx, W, rt - 40 * sc, 190 * sc, cam * 0.02, 0.004 / sc, '#9db4cc', 0.6);
  ridge(ctx, W, rt - 24 * sc, 150 * sc, cam * 0.05, 0.006 / sc, '#6f8aa8', 2.1);
  // หมอกลอยช้าๆ
  for (let i = 0; i < 3; i++) {
    const y = rt - (30 + i * 42) * sc, g = ctx.createLinearGradient(0, y - 30 * sc, 0, y + 30 * sc);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.28 - i * 0.05})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - 30 * sc, W, 60 * sc);
  }
  ridge(ctx, W, rt - 4 * sc, 90 * sc, cam * 0.1, 0.01 / sc, '#35506b', 5.4);
  tiles(W, 960 * sc, cam * 0.26, x0 => { for (const p of PINES) pine(ctx, x0 + p.x * sc, rt, p.h * sc * 1.5, '#14273a', sc); });
  const mx = (t * 14) % (W + 300);
  const g = ctx.createLinearGradient(0, rt - 60 * sc, 0, rt); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.3)');
  ctx.fillStyle = g; ctx.fillRect(0, rt - 60 * sc, W, 60 * sc);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(mx - 100, rt - 30 * sc, 200 * sc, 16 * sc, 0, 0, 7); ctx.fill();
}

function seaside(ctx, c) {
  const { W, rt, sc, cam, t } = c;
  skyGrad(ctx, W, rt, [[0, '#2f8fe6'], [0.7, '#9bd7f7'], [1, '#e8f6ff']]);
  glowDot(ctx, W * 0.8, rt * 0.22, 160 * sc, 'rgba(255,255,220,.6)');
  ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(W * 0.8, rt * 0.22, 26 * sc, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  tiles(W, 640 * sc, cam * 0.015, x => { for (const [dx, dy, w] of [[60, 60, 80], [100, 52, 55], [380, 90, 100], [430, 84, 60]]) { ctx.beginPath(); ctx.ellipse(x + dx * sc, rt * 0.28 + dy * sc, w * sc, 16 * sc, 0, 0, 7); ctx.fill(); } });
  // ทะเล
  const sy = rt - 86 * sc, sg = ctx.createLinearGradient(0, sy, 0, rt - 22 * sc); sg.addColorStop(0, '#2a8fd0'); sg.addColorStop(1, '#8fe0f2');
  ctx.fillStyle = sg; ctx.fillRect(0, sy, W, 64 * sc);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  tiles(W, 90 * sc, cam * 0.06 - t * 10, x => { for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 18 * sc, sy + (6 + i * 11) * sc, 10 * sc, 1.6 * sc); });
  // เรือไกลๆ
  tiles(W, 900 * sc, cam * 0.02, x => { ctx.fillStyle = '#26394f'; ctx.fillRect(x + 300 * sc, sy - 7 * sc, 26 * sc, 7 * sc); ctx.fillRect(x + 308 * sc, sy - 15 * sc, 8 * sc, 8 * sc); });
  // หาดทราย
  ctx.fillStyle = '#e8cf93'; ctx.fillRect(0, rt - 22 * sc, W, 22 * sc);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, rt - 24 * sc, W, 3 * sc);
  tiles(W, 1050 * sc, cam * 0.24, x0 => { for (const p of PALMS) palm(ctx, x0 + p.x * sc, rt - 8 * sc, p.h * sc * 1.15, '#1c5a2c', p.lean * sc, sc); });
}

function templeFair(ctx, c) {
  const { W, rt, sc, cam, t } = c;
  skyGrad(ctx, W, rt, [[0, '#080a1c'], [0.6, '#1b1440'], [1, '#4a2058']]);
  ctx.fillStyle = '#fff';
  for (const s of STAR) { ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 2 + s.x * 40); ctx.beginPath(); ctx.arc(s.x * W, s.y * rt * 1.6, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  // พลุ
  for (let k = 0; k < 3; k++) {
    const age = (t + k * 1.9) % 5.2; if (age > 2.2) continue;
    const fx = W * (0.2 + k * 0.28), fy = rt * (0.28 + (k % 2) * 0.12), rad = age * 46 * sc;
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * 6.283, px = fx + Math.cos(a) * rad, py = fy + Math.sin(a) * rad + age * age * 8 * sc;
      glowDot(ctx, px, py, 6 * sc, `hsla(${(k * 120 + i * 6) % 360},95%,65%,${Math.max(0, 1 - age / 2.2)})`);
    }
  }
  // วัดไกลๆ: เจดีย์
  tiles(W, 820 * sc, cam * 0.04, x => {
    ctx.fillStyle = '#0d0a22';
    ctx.beginPath(); ctx.moveTo(x + 120 * sc, rt); ctx.lineTo(x + 130 * sc, rt - 64 * sc); ctx.lineTo(x + 146 * sc, rt - 110 * sc); ctx.lineTo(x + 152 * sc, rt - 150 * sc);
    ctx.lineTo(x + 158 * sc, rt - 110 * sc); ctx.lineTo(x + 174 * sc, rt - 64 * sc); ctx.lineTo(x + 184 * sc, rt); ctx.closePath(); ctx.fill();
    glowDot(ctx, x + 152 * sc, rt - 150 * sc, 22 * sc, 'rgba(255,214,120,.7)');
  });
  // ชิงช้าสวรรค์
  const fx = W * 0.72 - (cam * 0.1) % (W * 1.4), R = 82 * sc, cy = rt - R - 8 * sc;
  for (const ox of [0, W * 1.4]) {
    const cx = fx + ox;
    if (cx < -R - 20 || cx > W + R + 20) continue;
    ctx.strokeStyle = '#150f33'; ctx.lineWidth = 3 * sc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 30 * sc, rt); ctx.moveTo(cx, cy); ctx.lineTo(cx + 30 * sc, rt); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * 6.283 + t * 0.25, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
      glowDot(ctx, px, py, 10 * sc, `hsla(${i * 30},90%,60%,.85)`);
    }
  }
  // เต็นท์ร้านค้า + ไฟประดับ
  tiles(W, TENTS.W * sc, cam * 0.22, x0 => {
    for (const tt of TENTS.a) {
      const x = x0 + tt.x * sc; if (x > W || x + tt.w * sc < 0) continue;
      ctx.fillStyle = '#120d2c'; ctx.fillRect(x, rt - tt.h * sc, tt.w * sc, tt.h * sc);
      ctx.fillStyle = tt.col; ctx.beginPath(); ctx.moveTo(x - 4 * sc, rt - tt.h * sc); ctx.lineTo(x + tt.w * sc / 2, rt - tt.h * sc - 20 * sc); ctx.lineTo(x + tt.w * sc + 4 * sc, rt - tt.h * sc); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,230,150,.8)'; ctx.fillRect(x + 8 * sc, rt - tt.h * sc + 8 * sc, tt.w * sc - 16 * sc, 12 * sc);
    }
  });
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2;
  tiles(W, 160 * sc, cam * 0.22, x => {
    ctx.beginPath(); ctx.moveTo(x, rt - 62 * sc); ctx.quadraticCurveTo(x + 80 * sc, rt - 44 * sc, x + 160 * sc, rt - 62 * sc); ctx.stroke();
    for (let i = 1; i < 6; i++) { const u = i / 6, px = x + u * 160 * sc, py = rt - 62 * sc + Math.sin(u * 3.14) * 18 * sc; glowDot(ctx, px, py, 7 * sc, `hsla(${(i * 70) % 360},95%,62%,.9)`); }
  });
}

/* ---------- รายการธีม ---------- */
const THEMES = [
  { id: 'night',  name: 'ถนนวงแหวนยามค่ำ',     lamps: true,  road: ['#171922', '#2b2e3a'], draw: (ctx, c) => nightCity(ctx, c, false) },
  { id: 'paddy',  name: 'ทุ่งนาตะวันตกดิน',     lamps: false, road: ['#2a2230', '#3a3140'], draw: paddySunset, tint: 'rgba(255,150,60,.10)' },
  { id: 'mist',   name: 'เขาใหญ่ยามเช้าหมอกจาง', lamps: false, road: ['#3a4452', '#566272'], draw: mistyMountain, tint: 'rgba(200,225,255,.08)' },
  { id: 'rain',   name: 'ฝนตกในเมืองนีออน',     lamps: true,  road: ['#12151f', '#1f2432'], draw: (ctx, c) => nightCity(ctx, c, true), wet: true, rain: true },
  { id: 'sea',    name: 'ถนนริมทะเลยามบ่าย',    lamps: false, road: ['#4a4e58', '#6a6f7c'], draw: seaside, day: true },
  { id: 'fair',   name: 'งานวัดประจำปี',        lamps: false, road: ['#1a1830', '#2c2850'], draw: templeFair },
];
function pickTheme(pref) {
  if (pref && pref !== 'random') { const t = THEMES.find(x => x.id === pref); if (t) return t; }
  return THEMES[Math.floor(Math.random() * THEMES.length)];
}
