'use strict';
/* ============================================================
   WAVE RACE — วาดรถ Honda Wave ด้วย Canvas (มองด้านข้าง หันขวา)
   พิกัดรถ: ล้อหลังแตะพื้นที่ (0,0)  ล้อหน้า (150,-34)  ขึ้นบน = ค่าลบ
   ============================================================ */
const R_WHEEL = 34;
const ENGINE_COL = { stock: '#3b3f46', b125: '#2d6fd6', b143: '#e0a100', b150: '#d6322c', b190: '#7e3ff2' };

function shade(hex, amt) {
  let c = String(hex).replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  const cl = v => Math.max(0, Math.min(255, v));
  return `rgb(${cl((n >> 16) + amt)},${cl(((n >> 8) & 255) + amt)},${cl((n & 255) + amt)})`;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function strokePath(ctx, pts, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}
function fillPanel(ctx, path, V, col) {
  ctx.fillStyle = col; ctx.fill(path);
  if (V.bodyV === 'carbon') {
    ctx.save(); ctx.clip(path);
    ctx.strokeStyle = '#2d3139'; ctx.lineWidth = 1.6;
    for (let i = -160; i < 220; i += 5) { ctx.beginPath(); ctx.moveTo(i, -170); ctx.lineTo(i + 90, 0); ctx.stroke(); }
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke(path);
}

/* ---------- ล้อ + เบรก ---------- */
function drawWheel(ctx, cx, cy, V, ang, front) {
  const R = R_WHEEL;
  const tireT = V.tireV === 'slick' ? 7 : V.tireV === 'radial' ? 6.5 : 8;
  const rimR = R - tireT;
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = '#101114'; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R - 1.2, 0, 7); ctx.stroke();
  if (V.tireV === 'slick') {
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, R - 3.2, -0.6, 0.8); ctx.stroke();
  } else if (V.tireV === 'radial') {
    ctx.strokeStyle = '#8a8f98'; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(0, 0, R - 3, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  } else {
    ctx.strokeStyle = '#1d2026'; ctx.lineWidth = 2; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.arc(0, 0, R - 0.8, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.rotate(ang);
  const col = V.rimColor || '#b8bcc4', wv = V.wheelV;
  ctx.fillStyle = '#17181b'; ctx.beginPath(); ctx.arc(0, 0, rimR, 0, 7); ctx.fill();

  const hasDisc = front ? V.brakeV !== 'drum' : V.brakeV === 'dual';
  if (hasDisc) {
    ctx.strokeStyle = '#c7cbd1'; ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(0, 0, rimR - 6, 0, 7); ctx.stroke();
    if (V.brakeV === 'drilled' || V.brakeV === 'dual') {
      ctx.fillStyle = '#17181b';
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * (rimR - 6), Math.sin(a) * (rimR - 6), 0.9, 0, 7); ctx.fill();
      }
    }
  }
  if (wv === 'wire') {
    ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 0.9;
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2, b = a + (i % 2 ? 0.22 : -0.22);
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(b) * rimR, Math.sin(b) * rimR); ctx.stroke();
    }
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, rimR - 0.6, 0, 7); ctx.stroke();
  } else {
    const n = wv === 'mag5' ? 5 : wv === 'mag7' ? 7 : 10;
    const sw = wv === 'mag5' ? 5.5 : wv === 'mag7' ? 3.6 : 2.4;
    ctx.strokeStyle = col; ctx.lineWidth = sw; ctx.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * (rimR - 1), Math.sin(a) * (rimR - 1)); ctx.stroke();
    }
    ctx.lineWidth = wv === 'cnc' ? 4 : 3; ctx.beginPath(); ctx.arc(0, 0, rimR - 1, 0, 7); ctx.stroke();
    if (wv === 'cnc') { ctx.lineWidth = 1.2; ctx.strokeStyle = shade(col, 60); ctx.beginPath(); ctx.arc(0, 0, rimR - 4, 0, 7); ctx.stroke(); }
  }
  // ดุมล้อ / ดรัม
  if (!hasDisc && (V.brakeV === 'drum' || !front)) {
    ctx.fillStyle = '#4a4f57'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, 7); ctx.stroke();
  }
  ctx.fillStyle = '#8b9099'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
  ctx.restore();

  if (hasDisc && front) { // คาลิเปอร์ (ไม่หมุน)
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-2.1);
    ctx.fillStyle = V.brakeV === 'dual' ? '#f2c14e' : V.brakeV === 'drilled' ? '#e8433a' : '#2b2e34';
    rr(ctx, rimR - 12, -4, 11, 8, 2); ctx.fill();
    ctx.restore();
  }
}

/* ---------- เครื่องยนต์ ---------- */
function drawEngine(ctx, V) {
  const acc = ENGINE_COL[V.engineV] || ENGINE_COL.stock;
  const Lc = 20 + (V.cc - 110) * 0.14, wc = 18 + (V.cc - 110) * 0.11;
  // แคร้ง
  ctx.fillStyle = '#4a4f58'; ctx.beginPath(); ctx.arc(68, -44, 17, 0, 7); ctx.fill();
  ctx.fillStyle = '#363a41'; ctx.beginPath(); ctx.arc(64, -44, 10, 0, 7); ctx.fill();
  ctx.strokeStyle = '#6b7078'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(64, -44, 10, 0, 7); ctx.stroke();
  // สูบ
  ctx.save(); ctx.translate(78, -50); ctx.rotate(-0.2);
  ctx.fillStyle = V.engineV === 'stock' ? '#8d939c' : '#20232a'; ctx.fillRect(0, -wc / 2, Lc, wc);
  ctx.strokeStyle = V.engineV === 'stock' ? '#c5cad2' : '#5a606c'; ctx.lineWidth = 1.4;
  for (let x = 3; x < Lc - 2; x += 4.2) { ctx.beginPath(); ctx.moveTo(x, -wc / 2 - 2); ctx.lineTo(x, wc / 2 + 2); ctx.stroke(); }
  ctx.fillStyle = acc; rr(ctx, Lc, -wc / 2 - 2, 14, wc + 4, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(Lc + 2, -wc / 2, 3, wc);
  ctx.restore();
  // ตำแหน่งหัวสูบ → คาร์บู/กรอง
  const hx = 78 + (Lc + 7) * Math.cos(-0.2), hy = -50 + (Lc + 7) * Math.sin(-0.2) - wc / 2 - 2;
  const cv = V.carbV;
  const carbCol = cv === 'f0' ? '#8a8f97' : cv === 'f1' ? '#c0c5cc' : cv === 'f2' ? '#e5a53a' : '#22252b';
  ctx.fillStyle = carbCol; rr(ctx, hx - 14, hy - 5, 13, 8, 2); ctx.fill();
  if (cv === 'f0') {
    ctx.fillStyle = '#2a2d33'; rr(ctx, hx - 36, hy - 14, 24, 14, 3); ctx.fill();
  } else if (cv === 'f3') {
    ctx.fillStyle = '#e11d2a'; ctx.fillRect(hx - 24, hy - 4, 10, 3);
    ctx.fillStyle = '#c9ced6'; rr(ctx, hx - 36, hy - 9, 14, 11, 4); ctx.fill();
  } else {
    ctx.fillStyle = cv === 'f2' ? '#2f6bff' : '#d6322c'; ctx.beginPath(); ctx.arc(hx - 24, hy - 1, 8, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(hx - 26, hy - 3, 3, 0, 7); ctx.fill();
  }
}

/* ---------- ท่อไอเสีย ---------- */
const EXH_TIP = { stock: [-8, -33], race: [-1, -37], horn: [-12, -31], carbon: [8, -42] };
function drawExhaust(ctx, V) {
  const st = V.exhaustV || 'stock';
  const header = st === 'carbon' ? '#7a8cff' : '#b9bec6';
  const hw = st === 'stock' ? 6.5 : 5;
  strokePath(ctx, [[110, -50], [121, -34], [112, -24], [62, -24], [60, -27]], hw, header);
  if (st === 'carbon') strokePath(ctx, [[110, -50], [121, -34], [112, -24]], 2, '#c78bff');
  ctx.save(); ctx.translate(60, -27);
  if (st === 'stock') {
    ctx.rotate(0.09);
    rr(ctx, -68, -9, 70, 16, 7); ctx.fillStyle = '#c8cdd5'; ctx.fill();
    ctx.fillStyle = '#4b4f57'; rr(ctx, -40, -8, 40, 6, 3); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(-69, -5, 4, 8);
  } else if (st === 'race') {
    ctx.fillStyle = '#cdd1d8'; ctx.beginPath(); ctx.ellipse(-14, 0, 17, 7, 0, 0, 7); ctx.fill();
    ctx.rotate(0.16);
    rr(ctx, -62, -7, 56, 11, 5); ctx.fillStyle = '#2b2e33'; ctx.fill();
    ctx.fillStyle = '#d9dde4'; ctx.fillRect(-64, -6, 7, 9);
  } else if (st === 'horn') {
    ctx.fillStyle = '#d9dde4';
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-72, -16); ctx.lineTo(-72, 8); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6b7078'; ctx.lineWidth = 1;
    for (let x = -60; x < -5; x += 11) { ctx.beginPath(); ctx.moveTo(x, -3 + (x / 72) * 13 * -1 + 1); ctx.lineTo(x, 6); ctx.stroke(); }
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(-72, -4, 3, 12, 0, 0, 7); ctx.fill();
  } else {
    ctx.rotate(0.28);
    rr(ctx, -56, -8, 54, 13, 6); ctx.fillStyle = '#1d1f23'; ctx.fill();
    ctx.save(); rr(ctx, -56, -8, 54, 13, 6); ctx.clip();
    ctx.strokeStyle = '#363a42'; ctx.lineWidth = 1.2;
    for (let x = -60; x < 0; x += 4) { ctx.beginPath(); ctx.moveTo(x, -9); ctx.lineTo(x + 8, 6); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#f0c14b'; ctx.fillRect(-58, -7, 5, 11);
  }
  ctx.restore();
}

/* ---------- โซ่ / สเตอร์ ---------- */
function drawChain(ctx, V, ang) {
  const fs = 5, rs = Math.max(8, Math.min(18, fs * (V.final || 2.5)));
  const fx = 58, fy = -35, rx = 0, ry = -34;
  strokePath(ctx, [[fx, fy - fs], [rx, ry - rs]], 1.8, '#2a2d33');
  strokePath(ctx, [[fx, fy + fs], [rx, ry + rs]], 1.8, '#2a2d33');
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang * 2);
  ctx.fillStyle = '#9ba0a8'; ctx.beginPath(); ctx.arc(0, 0, fs, 0, 7); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(rx, ry); ctx.rotate(ang);
  ctx.strokeStyle = '#bfc4cc'; ctx.lineWidth = 3; ctx.setLineDash([2, 1.6]);
  ctx.beginPath(); ctx.arc(0, 0, rs, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

/* ---------- ตัวถัง ---------- */
function drawBodyPanels(ctx, V) {
  const C = V.color || '#e63b1f', D = shade(C, -50);
  const bv = V.bodyV || 'stock';
  const fill = bv === 'carbon' ? '#17191d' : C;

  // แผ่นพื้น
  rr(ctx, 50, -46, 62, 6, 3); ctx.fillStyle = '#2a2c31'; ctx.fill();

  // บังลมหน้า / แฟริ่ง
  let p = new Path2D();
  if (bv === 'fairing') {
    p.moveTo(110, -60); p.lineTo(138, -100); p.quadraticCurveTo(160, -106, 170, -92);
    p.lineTo(154, -62); p.lineTo(132, -40); p.lineTo(110, -40); p.closePath();
  } else {
    p.moveTo(114, -92); p.lineTo(138, -106); p.quadraticCurveTo(148, -100, 143, -90);
    p.lineTo(139, -62); p.lineTo(128, -40); p.lineTo(113, -40); p.lineTo(108, -70); p.closePath();
  }
  fillPanel(ctx, p, V, fill);
  if (bv !== 'carbon') { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(116, -84); ctx.lineTo(132, -60); ctx.stroke(); }

  // บังโคลนหน้า
  ctx.strokeStyle = fill; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  if (bv === 'stock') ctx.arc(150, -34, 40, -2.3, -0.65); else ctx.arc(150, -34, 39, -2.0, -0.95);
  ctx.stroke();

  // ฝาข้าง / ท้าย
  p = new Path2D();
  if (bv === 'stock') {
    p.moveTo(40, -88); p.lineTo(4, -90); p.quadraticCurveTo(-12, -88, -12, -76); p.lineTo(-6, -64); p.lineTo(34, -68); p.closePath();
  } else if (bv === 'fairing') {
    p.moveTo(44, -90); p.lineTo(6, -98); p.lineTo(-14, -90); p.lineTo(-12, -76); p.lineTo(6, -66); p.lineTo(34, -68); p.closePath();
  } else {
    p.moveTo(40, -88); p.lineTo(12, -92); p.quadraticCurveTo(0, -88, 2, -76); p.lineTo(8, -66); p.lineTo(34, -68); p.closePath();
  }
  fillPanel(ctx, p, V, fill);
  // ไฟท้าย
  rr(ctx, bv === 'fairing' ? -15 : bv === 'stock' ? -13 : 0, -80, 5, 8, 2); ctx.fillStyle = '#ff3040'; ctx.fill();
  if (bv === 'stock') { strokePath(ctx, [[-6, -92], [16, -96]], 3, '#9aa0a8'); } // กันตก

  // เบาะ
  if (bv === 'stock') { rr(ctx, 14, -100, 64, 13, 6); ctx.fillStyle = '#1b1c20'; ctx.fill(); }
  else { rr(ctx, 18, -98, 58, 9, 4); ctx.fillStyle = '#1b1c20'; ctx.fill(); }

  // กระจกบังลม
  if (bv === 'fairing') {
    ctx.fillStyle = 'rgba(120,200,255,.45)'; ctx.beginPath();
    ctx.moveTo(138, -104); ctx.lineTo(158, -130); ctx.lineTo(148, -131); ctx.lineTo(128, -108); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawNos(ctx, V) {
  if (!V.nos) return;
  const big = V.nos > 1;
  ctx.save(); ctx.translate(2, -106); ctx.rotate(-0.12);
  const w = big ? 13 : 9, l = big ? 36 : 25;
  rr(ctx, -l / 2, -w / 2, l, w, w / 2); ctx.fillStyle = '#2f6bff'; ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-l / 2 + 4, -w / 2 + 2, l - 8, 2);
  ctx.fillStyle = '#e5b53a'; ctx.fillRect(l / 2 - 1, -2, 5, 4);
  ctx.restore();
  strokePath(ctx, [[8, -104], [30, -96], [60, -60], [96, -62]], 1.6, '#2f6bff');
}

/* ---------- คนขี่ (เด็กแว้นใส่รองเท้าแตะ) ---------- */
function drawRider(ctx, V, tuck) {
  const t = tuck || 0, lerp = (a, b) => a + (b - a) * t;
  const hip = [40, -101], knee = [84, -99], foot = [88, -47];
  const sh = [lerp(84, 98, 1), lerp(-136, -126, 1)].map((v, i) => i ? lerp(-136, -124, t) : lerp(84, 98, t));
  const head = [lerp(94, 110, t), lerp(-152, -138, t)], hand = [121, -124];
  const elbow = [(sh[0] + hand[0]) / 2 - 4, (sh[1] + hand[1]) / 2 + 12];
  strokePath(ctx, [hip, knee], 11, '#2b4a7a');
  strokePath(ctx, [knee, foot], 9, '#2b4a7a');
  rr(ctx, foot[0] - 6, foot[1] - 2, 17, 4, 2); ctx.fillStyle = '#29c4f4'; ctx.fill(); // รองเท้าแตะ
  strokePath(ctx, [hip, sh], 15, V.shirt || '#f2c230');
  strokePath(ctx, [sh, elbow, hand], 5.5, V.shirt || '#f2c230');
  ctx.fillStyle = '#d49a6a'; ctx.beginPath(); ctx.arc(head[0], head[1], 9, 0, 7); ctx.fill();
  ctx.fillStyle = V.helmet || '#f5c518'; ctx.beginPath(); ctx.arc(head[0], head[1] - 1, 11, Math.PI, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(head[0], head[1] - 1, 11, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#111'; ctx.fillRect(head[0] + 2, head[1] - 4, 9, 3); // แว่น
}

/* ---------- ตัวหลัก ---------- */
function drawBike(ctx, V, o) {
  o = o || {};
  const sc = o.scale || 1, ang = o.wheelAngle || 0;
  // เงา (ไม่หมุนตาม pitch)
  ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(75, 3, 100, 6, 0, 0, 7); ctx.fill();
  if (o.pitch) ctx.rotate(-o.pitch);

  drawWheel(ctx, 0, -34, V, ang, false);
  drawWheel(ctx, 150, -34, V, ang, true);
  // ปีกนก + โช้ค
  strokePath(ctx, [[62, -38], [0, -34]], 6, '#22252a');
  strokePath(ctx, [[14, -86], [8, -40]], 5, '#e5b53a');
  strokePath(ctx, [[14, -86], [8, -40]], 2.5, '#2a2d33');
  drawChain(ctx, V, ang);
  // เฟรม
  strokePath(ctx, [[130, -98], [60, -86], [20, -84]], 7, '#23252a');
  strokePath(ctx, [[128, -96], [112, -56], [90, -42]], 6, '#23252a');
  drawEngine(ctx, V);
  drawBodyPanels(ctx, V);
  // โช้คหน้า, แฮนด์, ไฟหน้า
  strokePath(ctx, [[136, -100], [150, -34]], 4.5, '#9aa3ad');
  strokePath(ctx, [[134, -102], [128, -124], [118, -125]], 3.4, '#22252a');
  ctx.fillStyle = '#2a2d33'; ctx.fillRect(116, -128, 8, 5);
  ctx.fillStyle = '#fff7c2'; ctx.beginPath(); ctx.arc(147, -108, 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.2; ctx.stroke();
  drawNos(ctx, V);
  drawExhaust(ctx, V);
  if (o.rider) drawRider(ctx, V, o.tuck);

  // เปลวไฟท่อ / NOS
  const tip = EXH_TIP[V.exhaustV || 'stock'];
  if (o.flame > 0.02) {
    const L = 14 + o.flame * 34;
    const g = ctx.createLinearGradient(tip[0], tip[1], tip[0] - L, tip[1] - 3);
    g.addColorStop(0, 'rgba(255,255,200,.95)'); g.addColorStop(.4, 'rgba(255,150,30,.8)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(tip[0], tip[1] - 4); ctx.lineTo(tip[0] - L, tip[1] - 3 - (Math.random() * 3)); ctx.lineTo(tip[0], tip[1] + 4); ctx.closePath(); ctx.fill();
  }
  if (o.nosFlame) {
    const L = 40 + Math.random() * 25;
    const g = ctx.createLinearGradient(tip[0], tip[1], tip[0] - L, tip[1]);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.35, 'rgba(90,170,255,.85)'); g.addColorStop(1, 'rgba(40,80,255,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(tip[0], tip[1] - 5); ctx.lineTo(tip[0] - L, tip[1]); ctx.lineTo(tip[0], tip[1] + 5); ctx.closePath(); ctx.fill();
  }
  // ไฮไลต์อะไหล่ที่กำลังลองใส่
  if (o.hl && SLOT_ANCHOR[o.hl]) {
    const a = SLOT_ANCHOR[o.hl], pulse = 0.5 + 0.5 * Math.sin((o.t || 0) * 6);
    ctx.strokeStyle = `rgba(25,227,255,${0.45 + 0.4 * pulse})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(a[0], a[1], 15 + 4 * pulse, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(25,227,255,.12)'; ctx.fill();
  }
  ctx.restore();
}

/* ---------- ภาพตัดเครื่อง: ลูกสูบ / ก้านสูบ (โชว์ว่า Craft อะไรอยู่) ---------- */
function drawCutaway(ctx, w, h, V, t) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(8,10,16,.82)'; rr(ctx, 0, 0, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(25,227,255,.5)'; ctx.lineWidth = 1; rr(ctx, 0.5, 0.5, w - 1, h - 1, 10); ctx.stroke();
  const cx = w / 2, crankY = h - 52, r = 15, L = 52;
  const th = t * 9;
  const pinX = cx + r * Math.sin(th), pinY = crankY - r * Math.cos(th);
  const pistonBot = pinY - Math.sqrt(Math.max(1, L * L - (pinX - cx) * (pinX - cx)));
  // กระบอกสูบ
  ctx.fillStyle = '#242a35'; ctx.fillRect(cx - 24, 24, 48, crankY - 38 - 24 + 14);
  ctx.fillStyle = '#10141b'; ctx.fillRect(cx - 20, 24, 40, crankY - 38 - 24 + 14);
  // ลูกสูบ
  const pCol = (V.piston && V.piston.col) || '#a9a39a', cCol = (V.conrod && V.conrod.col) || '#8a8f97';
  const py = pistonBot - 22;
  ctx.fillStyle = pCol; rr(ctx, cx - 19, py, 38, 24, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 19, py + 4 + i * 3.5); ctx.lineTo(cx + 19, py + 4 + i * 3.5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx - 15, py + 1, 6, 22);
  // ก้านสูบ
  strokePath(ctx, [[cx, pistonBot], [pinX, pinY]], 7, cCol);
  strokePath(ctx, [[cx, pistonBot], [pinX, pinY]], 2, 'rgba(255,255,255,.3)');
  ctx.fillStyle = '#e5b53a'; ctx.beginPath(); ctx.arc(cx, pistonBot, 3, 0, 7); ctx.fill();
  // ข้อเหวี่ยง
  ctx.fillStyle = '#4a4f58'; ctx.beginPath(); ctx.arc(cx, crankY, 20, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a2d33'; ctx.beginPath(); ctx.arc(cx, crankY, 6, 0, 7); ctx.fill();
  ctx.fillStyle = cCol; ctx.beginPath(); ctx.arc(pinX, pinY, 4.5, 0, 7); ctx.fill();
  // ป้ายสเปก
  ctx.textAlign = 'center'; ctx.font = '600 11px Kanit, sans-serif';
  const pn = V.piston ? V.piston.name : '', cn = V.conrod ? V.conrod.name : '';
  ctx.fillStyle = '#ffd36b'; ctx.fillText(pn.length > 22 ? pn.slice(0, 21) + '…' : pn, cx, 14);
  ctx.fillStyle = '#8fe3ff'; ctx.fillText(cn.length > 22 ? cn.slice(0, 21) + '…' : cn, cx, h - 8);
}

/* ---------- กราฟ Dyno ---------- */
function drawDyno(ctx, w, h, S, base) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(8,10,16,.6)'; rr(ctx, 0, 0, w, h, 10); ctx.fill();
  const padL = 36, padR = 10, padT = 14, padB = 22;
  const pw = w - padL - padR, ph = h - padT - padB;
  const maxRpm = Math.max(S.redline, base ? base.redline : 0) + 300, minRpm = 2000;
  const maxHp = Math.max(30, S.hp * 1.15), maxTq = Math.max(24, S.peakTorque * 1.2);
  const X = r => padL + (r - minRpm) / (maxRpm - minRpm) * pw;
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '10px Kanit, sans-serif'; ctx.textAlign = 'center';
  for (let r = 3000; r <= maxRpm; r += 2000) { ctx.beginPath(); ctx.moveTo(X(r), padT); ctx.lineTo(X(r), padT + ph); ctx.stroke(); ctx.fillText((r / 1000) + 'k', X(r), h - 8); }
  const curve = (St, f, max, col, dash, wd) => {
    ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.setLineDash(dash || []); ctx.beginPath();
    let first = true;
    for (let r = minRpm; r <= St.redline; r += 100) {
      const v = f(St, r), y = padT + ph - v / max * ph, x = X(r);
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]);
  };
  const hpF = (St, r) => powerAt(St, r, false) * 1.341, tqF = (St, r) => torqueAt(St, r, false);
  if (base) { curve(base, hpF, maxHp, 'rgba(255,150,60,.35)', [4, 3], 1.3); curve(base, tqF, maxTq, 'rgba(25,227,255,.35)', [4, 3], 1.3); }
  curve(S, hpF, maxHp, '#ff8a1f', null, 2.2);
  curve(S, tqF, maxTq, '#19e3ff', null, 2.2);
  // เส้นรอบตัด
  ctx.strokeStyle = 'rgba(255,60,60,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(S.redline), padT); ctx.lineTo(X(S.redline), padT + ph); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ff8a1f'; ctx.fillText('แรงม้า', padL + 4, padT + 9);
  ctx.fillStyle = '#19e3ff'; ctx.fillText('แรงบิด', padL + 46, padT + 9);
}
