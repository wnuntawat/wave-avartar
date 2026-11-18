'use strict';
/* ============================================================
   WAVE RACE — วาดรถ Honda Wave ด้วย Canvas (มองด้านข้าง หันขวา)  v2: เพิ่มแสงเงา/วัสดุ
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
function lg(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  return g;
}
/* ท่อ/แท่งโลหะ: เส้นมืดหนา + เส้นสว่างบาง ให้ดูเป็นทรงกระบอก */
function tube(ctx, pts, w, base) {
  strokePath(ctx, pts, w + 1.6, 'rgba(0,0,0,.55)');
  strokePath(ctx, pts, w, base);
  strokePath(ctx, pts, Math.max(1, w * 0.35), 'rgba(255,255,255,.35)');
}
/* ชิ้นส่วนตัวถัง: ไล่สี + แสงสะท้อน + ขอบ (carbon = ลายเคฟล่า) */
function fillPanel(ctx, path, V, col) {
  const carbon = V.bodyV === 'carbon';
  ctx.fillStyle = carbon ? lg(ctx, 0, -130, 0, -36, [[0, '#2a2e36'], [0.5, '#15171c'], [1, '#08090b']])
                         : lg(ctx, 0, -130, 0, -36, [[0, shade(col, 55)], [0.4, col], [1, shade(col, -70)]]);
  ctx.fill(path);
  ctx.save(); ctx.clip(path);
  if (carbon) {
    ctx.strokeStyle = 'rgba(70,76,90,.55)'; ctx.lineWidth = 1.2;
    for (let i = -160; i < 220; i += 4) { ctx.beginPath(); ctx.moveTo(i, -170); ctx.lineTo(i + 90, 0); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    for (let i = -160; i < 220; i += 4) { ctx.beginPath(); ctx.moveTo(i + 2, 0); ctx.lineTo(i + 92, -170); ctx.stroke(); }
  }
  // แสงสะท้อนเฉียง (clearcoat)
  ctx.fillStyle = lg(ctx, -20, -140, 170, -30, [[0, 'rgba(255,255,255,0)'], [0.35, 'rgba(255,255,255,.28)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(-40, -180, 260, 160);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.stroke(path);
}

/* ---------- ล้อ + ยาง + เบรก ---------- */
function drawWheel(ctx, cx, cy, V, ang, front, blur) {
  const R = R_WHEEL;
  const tireT = V.tireV === 'slick' ? 7.5 : V.tireV === 'radial' ? 6.5 : 8.5;
  const rimR = R - tireT;
  blur = blur || 0;
  ctx.save(); ctx.translate(cx, cy);

  // ยาง: ไล่ระดับ + ดอกยาง
  let g = ctx.createRadialGradient(0, 0, rimR, 0, 0, R);
  g.addColorStop(0, '#1b1d22'); g.addColorStop(0.7, '#0f1013'); g.addColorStop(1, '#050506');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  ctx.save(); ctx.rotate(ang);
  if (V.tireV !== 'slick') {
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 1.2;
    const n = V.tireV === 'radial' ? 56 : 44;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      ctx.beginPath(); ctx.moveTo(c * (R - 0.4), s * (R - 0.4)); ctx.lineTo(c * (R - 2.6), s * (R - 2.6)); ctx.stroke();
    }
  } else {
    ctx.strokeStyle = '#e5484d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, R - 3.4, -0.6, 0.8); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, R - 1, 0, 7); ctx.stroke();
  }
  // ตัวหนังสือข้างยาง (ดอท)
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  for (let i = 0; i < 9; i++) { const a = 0.4 + i * 0.075; ctx.fillRect(Math.cos(a) * (R - 4.2) - 0.6, Math.sin(a) * (R - 4.2) - 0.6, 1.4, 1.4); }
  ctx.restore();
  // แสงบนยาง
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R - 1.6, -2.5, -1.4); ctx.stroke();

  ctx.rotate(ang);
  const col = V.rimColor || '#b8bcc4', wv = V.wheelV;
  ctx.fillStyle = '#121316'; ctx.beginPath(); ctx.arc(0, 0, rimR, 0, 7); ctx.fill();

  const hasDisc = front ? V.brakeV !== 'drum' : V.brakeV === 'dual';
  if (hasDisc) {
    g = ctx.createRadialGradient(0, 0, rimR - 11, 0, 0, rimR - 3);
    g.addColorStop(0, '#6e737c'); g.addColorStop(0.5, '#d4d8de'); g.addColorStop(1, '#7c818a');
    ctx.strokeStyle = g; ctx.lineWidth = 5.2; ctx.beginPath(); ctx.arc(0, 0, rimR - 7, 0, 7); ctx.stroke();
    if (V.brakeV === 'drilled' || V.brakeV === 'brembo' || V.brakeV === 'dual') {
      ctx.fillStyle = '#16171a';
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * (rimR - 7), Math.sin(a) * (rimR - 7), 0.95, 0, 7); ctx.fill(); }
    }
  }
  if (!blur || blur < 0.85) {
    ctx.globalAlpha = 1 - blur * 0.9;
    if (wv === 'wire') {
      ctx.lineWidth = 0.9;
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2, b = a + (i % 2 ? 0.24 : -0.24);
        ctx.strokeStyle = i % 2 ? '#8e949d' : '#b9bec7';
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5); ctx.lineTo(Math.cos(b) * (rimR - 0.5), Math.sin(b) * (rimR - 0.5)); ctx.stroke();
      }
    } else {
      const n = wv === 'mag5' ? 5 : wv === 'mag7' ? 7 : 10;
      const sw = wv === 'mag5' ? 6 : wv === 'mag7' ? 3.8 : 2.6;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = sw + 1.6; ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(c * 5, s * 5); ctx.lineTo(c * (rimR - 1), s * (rimR - 1)); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = sw;
        ctx.beginPath(); ctx.moveTo(c * 5, s * 5); ctx.lineTo(c * (rimR - 1), s * (rimR - 1)); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = sw * 0.3;
        ctx.beginPath(); ctx.moveTo(c * 5 - s * sw * 0.2, s * 5 + c * sw * 0.2); ctx.lineTo(c * (rimR - 1) - s * sw * 0.2, s * (rimR - 1) + c * sw * 0.2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  if (blur > 0.1) { // เบลอความเร็วสูง
    ctx.fillStyle = `rgba(190,195,205,${0.28 * blur})`; ctx.beginPath(); ctx.arc(0, 0, rimR - 1, 0, 7); ctx.fill();
  }
  // ขอบกระทะล้อ
  const rg = ctx.createLinearGradient(-rimR, -rimR, rimR, rimR);
  rg.addColorStop(0, shade(col, 50)); rg.addColorStop(0.5, col); rg.addColorStop(1, shade(col, -60));
  ctx.strokeStyle = rg; ctx.lineWidth = wv === 'cnc' ? 4 : 3; ctx.beginPath(); ctx.arc(0, 0, rimR - 1, 0, 7); ctx.stroke();
  if (wv === 'cnc') { ctx.lineWidth = 1; ctx.strokeStyle = shade(col, 70); ctx.beginPath(); ctx.arc(0, 0, rimR - 4.5, 0, 7); ctx.stroke(); }

  // ดุม / ดรัม
  if (!hasDisc && (V.brakeV === 'drum' || !front)) {
    g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 10);
    g.addColorStop(0, '#8b9099'); g.addColorStop(1, '#3a3e45');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#22252a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.stroke();
  }
  g = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 4.5);
  g.addColorStop(0, '#d9dde4'); g.addColorStop(1, '#6a6f78');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 7); ctx.fill();
  ctx.restore();

  if (hasDisc) drawCaliper(ctx, cx, cy, rimR, V, front ? -2.1 : 2.3, !front);
}

/* ---------- เครื่องยนต์ ---------- */
function drawEngine(ctx, V) {
  if (V.type === '2T') return drawEngine2T(ctx, V);
  const acc = ENGINE_COL[V.engineV] || ENGINE_COL.stock;
  const Lc = 20 + (V.cc - 110) * 0.14, wc = 18 + (V.cc - 110) * 0.11;
  // แคร้งเครื่อง
  let g = ctx.createRadialGradient(62, -50, 2, 68, -44, 20);
  g.addColorStop(0, '#9aa0aa'); g.addColorStop(0.6, '#555a64'); g.addColorStop(1, '#2d3036');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(68, -44, 17.5, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  // ฝาไฟ/คลัตช์
  g = ctx.createRadialGradient(61, -48, 1, 64, -44, 11);
  g.addColorStop(0, '#6d727c'); g.addColorStop(1, '#2a2d33');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, -44, 10.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#80858f'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#b9bec7';
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; ctx.beginPath(); ctx.arc(64 + Math.cos(a) * 7.4, -44 + Math.sin(a) * 7.4, 0.9, 0, 7); ctx.fill(); }
  // คันสตาร์ท
  strokePath(ctx, [[76, -30], [86, -26], [90, -22]], 3, '#2a2d33');
  // กระบอกสูบ + ครีบ
  ctx.save(); ctx.translate(78, -50); ctx.rotate(-0.2);
  const stock = V.engineV === 'stock';
  ctx.fillStyle = stock ? lg(ctx, 0, -wc / 2, 0, wc / 2, [[0, '#bfc4cc'], [1, '#6c727c']]) : lg(ctx, 0, -wc / 2, 0, wc / 2, [[0, '#3a3e48'], [1, '#14161b']]);
  ctx.fillRect(0, -wc / 2, Lc, wc);
  for (let x = 2.5; x < Lc - 1; x += 4.2) {
    ctx.fillStyle = stock ? '#d6dae1' : '#5d6370'; ctx.fillRect(x, -wc / 2 - 2.4, 2.2, wc + 4.8);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2.2, -wc / 2 - 2.4, 0.8, wc + 4.8);
  }
  // หัวสูบ
  ctx.fillStyle = lg(ctx, 0, -wc / 2 - 2, 0, wc / 2 + 2, [[0, shade(acc, 50)], [0.5, acc], [1, shade(acc, -60)]]);
  rr(ctx, Lc, -wc / 2 - 2, 14, wc + 4, 3.5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(Lc + 2, -wc / 2 - 0.5, 3, wc - 1);
  ctx.fillStyle = '#cfd3da';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(Lc + 10, -wc / 2 + 4 + i * ((wc - 8) / 2), 1.2, 0, 7); ctx.fill(); }
  ctx.restore();

  // ตำแหน่งหัวสูบ → หัวเทียน / คาร์บู / กรอง
  const hx = 78 + (Lc + 7) * Math.cos(-0.2), hy = -50 + (Lc + 7) * Math.sin(-0.2) - wc / 2 - 2;
  tube(ctx, [[hx + 2, hy - 1], [hx + 6, hy - 9]], 2.4, '#2b2e34');         // หัวเทียน + ปลั๊ก
  rr(ctx, hx + 3, hy - 14, 7, 6, 2); ctx.fillStyle = '#111'; ctx.fill();
  const cv = V.carbV;
  const carbCol = cv === 'f0' ? '#8a8f97' : cv === 'f1' ? '#c0c5cc' : cv === 'f2' ? '#e5a53a' : '#22252b';
  ctx.fillStyle = lg(ctx, 0, hy - 5, 0, hy + 3, [[0, shade(carbCol, 40)], [1, shade(carbCol, -50)]]);
  rr(ctx, hx - 14, hy - 5, 13, 8, 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
  if (cv === 'f0') {
    ctx.fillStyle = lg(ctx, 0, hy - 14, 0, hy, [[0, '#454952'], [1, '#1d1f24']]); rr(ctx, hx - 36, hy - 14, 24, 14, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1; ctx.stroke();
  } else if (cv === 'f3') {
    ctx.fillStyle = '#e11d2a'; ctx.fillRect(hx - 24, hy - 4, 10, 3);
    ctx.fillStyle = lg(ctx, 0, hy - 9, 0, hy + 2, [[0, '#e8ecf2'], [1, '#8a909b']]); rr(ctx, hx - 36, hy - 9, 14, 11, 4); ctx.fill();
  } else {
    const fc = cv === 'f2' ? '#2f6bff' : '#d6322c';
    g = ctx.createRadialGradient(hx - 26, hy - 4, 1, hx - 24, hy - 1, 9);
    g.addColorStop(0, shade(fc, 70)); g.addColorStop(1, shade(fc, -50));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx - 24, hy - 1, 8, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

/* ---------- ท่อไอเสีย ---------- */
const EXH_TIP = { stock: [-8, -33], race: [-1, -37], horn: [-12, -31], carbon: [8, -42], stock2t: [-8, -33], chamber: [-11, -31], chamber2: [-13, -31], chamber3: [-14, -31] };
function chrome(ctx, y0, y1) {
  return lg(ctx, 0, y0, 0, y1, [[0, '#f4f6fa'], [0.25, '#aab0ba'], [0.55, '#e9ecf1'], [0.8, '#7b818c'], [1, '#c2c7d0']]);
}
function drawExhaust(ctx, V) {
  if (V.type === '2T') return drawExhaust2T(ctx, V);
  const st = V.exhaustV || 'stock';
  const header = st === 'carbon' ? '#7a8cff' : '#c4c9d1';
  const hw = st === 'stock' ? 6.5 : 5;
  tube(ctx, [[110, -50], [121, -34], [112, -24], [62, -24], [60, -27]], hw, header);
  if (st === 'carbon') strokePath(ctx, [[112, -24], [90, -24], [66, -24]], 1.6, '#c78bff');
  ctx.save(); ctx.translate(60, -27);
  if (st === 'stock') {
    ctx.rotate(0.09);
    rr(ctx, -68, -9, 70, 16, 7); ctx.fillStyle = chrome(ctx, -9, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = lg(ctx, 0, -8, 0, -2, [[0, '#6a6e77'], [1, '#2a2d33']]); rr(ctx, -40, -8, 40, 6, 3); ctx.fill();
    ctx.fillStyle = '#16171a'; ctx.fillRect(-69, -5, 4, 8);
  } else if (st === 'race') {
    ctx.fillStyle = chrome(ctx, -7, 7); ctx.beginPath(); ctx.ellipse(-14, 0, 17, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.rotate(0.16);
    rr(ctx, -62, -7, 56, 11, 5); ctx.fillStyle = lg(ctx, 0, -7, 0, 4, [[0, '#555a63'], [1, '#14161a']]); ctx.fill();
    ctx.fillStyle = chrome(ctx, -6, 3); ctx.fillRect(-64, -6, 7, 9);
  } else if (st === 'horn') {
    ctx.fillStyle = lg(ctx, 0, -16, 0, 8, [[0, '#f0f2f6'], [0.5, '#a4aab4'], [1, '#d3d7de']]);
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-72, -16); ctx.lineTo(-72, 8); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.28)';
    for (let x = -60; x < -5; x += 11) { ctx.beginPath(); ctx.moveTo(x, -3 + (x / 72) * -13 + 1); ctx.lineTo(x, 6); ctx.stroke(); }
    ctx.fillStyle = '#0c0d0f'; ctx.beginPath(); ctx.ellipse(-72, -4, 3, 12, 0, 0, 7); ctx.fill();
  } else {
    ctx.rotate(0.28);
    rr(ctx, -56, -8, 54, 13, 6); ctx.fillStyle = '#16181c'; ctx.fill();
    ctx.save(); rr(ctx, -56, -8, 54, 13, 6); ctx.clip();
    ctx.strokeStyle = 'rgba(80,88,104,.7)'; ctx.lineWidth = 1.2;
    for (let x = -60; x < 0; x += 4) { ctx.beginPath(); ctx.moveTo(x, -9); ctx.lineTo(x + 8, 6); ctx.stroke(); }
    ctx.fillStyle = lg(ctx, 0, -8, 0, 5, [[0, 'rgba(255,255,255,.3)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.4)']]); ctx.fillRect(-58, -9, 60, 15);
    ctx.restore();
    ctx.fillStyle = lg(ctx, 0, -7, 0, 4, [[0, '#ffe08a'], [1, '#b8862b']]); ctx.fillRect(-58, -7, 5, 11);
  }
  ctx.restore();
}

/* ---------- โซ่ / สเตอร์ ---------- */
function drawChain(ctx, V, ang) {
  const fs = 5, rs = Math.max(8, Math.min(18, fs * (V.final || 2.5)));
  const fx = 58, fy = -35, rx = 0, ry = -34;
  strokePath(ctx, [[fx, fy - fs], [rx, ry - rs]], 2.2, '#17181b');
  strokePath(ctx, [[fx, fy + fs], [rx, ry + rs]], 2.2, '#17181b');
  ctx.save(); ctx.setLineDash([1.6, 1.6]); strokePath(ctx, [[fx, fy - fs], [rx, ry - rs]], 1.2, '#b5a46a'); ctx.restore();
  ctx.save(); ctx.translate(fx, fy); ctx.rotate(ang * 2);
  ctx.strokeStyle = '#a7acb5'; ctx.lineWidth = 2.6; ctx.setLineDash([1.4, 1.2]); ctx.beginPath(); ctx.arc(0, 0, fs, 0, 7); ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(rx, ry); ctx.rotate(ang);
  ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 4.2; ctx.setLineDash([]); ctx.beginPath(); ctx.arc(0, 0, rs, 0, 7); ctx.stroke();
  ctx.strokeStyle = '#d0d4db'; ctx.lineWidth = 3; ctx.setLineDash([2, 1.6]); ctx.beginPath(); ctx.arc(0, 0, rs, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}

/* ---------- ตัวถัง ---------- */
function drawBodyPanels(ctx, V) {
  const C = V.color || '#e63b1f';
  const bv = V.bodyV || 'stock';
  const mk = V.model || 'wave';

  // พื้นวางเท้า (ลายยาง)
  rr(ctx, 50, -46, 62, 7, 3); ctx.fillStyle = lg(ctx, 0, -46, 0, -39, [[0, '#3a3d44'], [1, '#17181c']]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1;
  for (let x = 54; x < 110; x += 5) { ctx.beginPath(); ctx.moveTo(x, -45); ctx.lineTo(x, -41); ctx.stroke(); }

  if (bv === 'stock' && (mk === 'kr' || mk === 'sp')) { // ใต้ท้อง (belly pan)
    const b = new Path2D();
    b.moveTo(72, -40); b.lineTo(114, -42); b.lineTo(124, -34); b.lineTo(116, -24); b.quadraticCurveTo(92, -20, 74, -27); b.closePath();
    fillPanel(ctx, b, V, V.color || '#e63b1f');
  }
  // บังลมหน้า / แฟริ่ง
  let p = new Path2D();
  if (bv === 'fairing') {
    p.moveTo(108, -58); p.bezierCurveTo(116, -84, 128, -98, 140, -102);
    p.bezierCurveTo(156, -108, 168, -100, 170, -92);
    p.bezierCurveTo(166, -78, 158, -64, 150, -54); p.lineTo(132, -40); p.lineTo(110, -40); p.closePath();
  } else if (bv === 'stock' && mk === 'kr') {
    p.moveTo(104, -54); p.lineTo(112, -96); p.lineTo(136, -112); p.quadraticCurveTo(160, -114, 172, -98);
    p.lineTo(162, -70); p.lineTo(150, -54); p.lineTo(132, -40); p.lineTo(110, -40); p.closePath();
  } else if (bv === 'stock' && mk === 'sp') {
    p.moveTo(108, -60); p.bezierCurveTo(108, -88, 124, -106, 142, -108); p.bezierCurveTo(160, -110, 170, -97, 165, -82);
    p.bezierCurveTo(160, -66, 150, -56, 140, -48); p.lineTo(124, -40); p.lineTo(110, -42); p.closePath();
  } else {
    p.moveTo(112, -90); p.bezierCurveTo(120, -100, 132, -106, 142, -108);
    p.quadraticCurveTo(151, -104, 147, -92);
    p.bezierCurveTo(145, -78, 142, -60, 133, -45); p.lineTo(123, -38);
    p.quadraticCurveTo(108, -44, 108, -62); p.quadraticCurveTo(108, -80, 112, -90); p.closePath();
  }
  fillPanel(ctx, p, V, C);
  if (bv === 'stock' && mk === 'ls') { // คาวล์เล็กหน้า LS
    const c = new Path2D();
    c.moveTo(114, -92); c.bezierCurveTo(122, -106, 140, -112, 152, -108); c.quadraticCurveTo(160, -102, 154, -94); c.lineTo(138, -88); c.lineTo(118, -86); c.closePath();
    fillPanel(ctx, c, V, V.color || '#e63b1f');
  }
  if (bv !== 'carbon') { // แถบสติกเกอร์
    ctx.save(); ctx.clip(p);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(110, -80); ctx.quadraticCurveTo(128, -76, 142, -54); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(110, -75); ctx.quadraticCurveTo(126, -71, 138, -50); ctx.stroke();
    ctx.restore();
  }

  // บังโคลนหน้า
  const fender = (a0, a1) => {
    ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(150, -34, 40, a0, a1); ctx.stroke();
    ctx.strokeStyle = bv === 'carbon' ? '#1b1d22' : C; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.arc(150, -34, 40, a0, a1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(150, -34, 41.6, a0 + 0.1, a1 - 0.2); ctx.stroke();
  };
  if (bv === 'stock') fender(-2.3, -0.65); else fender(-2.0, -0.95);

  // บังโคลนหลัง (ซุ้มล้อหลังสีดำ)
  ctx.strokeStyle = '#0f1013'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(0, -34, 38, -2.75, -1.5); ctx.stroke();

  // ฝาข้าง / ท้าย
  p = new Path2D();
  if (bv === 'stock' && mk !== 'wave') {
    p.moveTo(44, -88); p.bezierCurveTo(28, -94, 10, -98, -6, -92); p.lineTo(-13, -82); p.quadraticCurveTo(-9, -72, 2, -68);
    p.lineTo(34, -66); p.quadraticCurveTo(46, -76, 44, -88); p.closePath();
  } else if (bv === 'stock') {
    p.moveTo(42, -88); p.bezierCurveTo(24, -92, 8, -94, 0, -90); p.quadraticCurveTo(-14, -86, -13, -74);
    p.quadraticCurveTo(-12, -66, -4, -64); p.lineTo(34, -66); p.quadraticCurveTo(44, -76, 42, -88); p.closePath();
  } else if (bv === 'fairing') {
    p.moveTo(46, -90); p.bezierCurveTo(30, -98, 8, -102, -10, -94); p.quadraticCurveTo(-17, -88, -14, -78);
    p.lineTo(4, -66); p.lineTo(34, -66); p.quadraticCurveTo(46, -76, 46, -90); p.closePath();
  } else {
    p.moveTo(42, -88); p.bezierCurveTo(28, -92, 14, -96, 4, -92); p.quadraticCurveTo(-4, -86, 2, -74);
    p.lineTo(8, -66); p.lineTo(34, -66); p.quadraticCurveTo(44, -76, 42, -88); p.closePath();
  }
  fillPanel(ctx, p, V, C);
  // ไฟท้าย + ป้ายทะเบียน
  const tx = bv === 'fairing' ? -15 : bv === 'stock' ? (mk === 'wave' ? -14 : -12) : -1;
  rr(ctx, tx, -82, 5, 9, 2); ctx.fillStyle = lg(ctx, 0, -82, 0, -73, [[0, '#ff6070'], [1, '#c0182b']]); ctx.fill();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,40,60,.25)'; ctx.beginPath(); ctx.arc(tx, -77, 8, 0, 7); ctx.fill(); ctx.restore();
  rr(ctx, tx + 1, -70, 11, 7, 1); ctx.fillStyle = '#f2f2f2'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.6; ctx.stroke();
  if (bv === 'stock' && mk === 'wave') tube(ctx, [[-6, -93], [16, -97]], 3, '#9aa0a8'); // กันตก

  if (mk === 'ls') { // ถังน้ำมัน LS
    const t = new Path2D();
    t.moveTo(56, -96); t.bezierCurveTo(60, -112, 96, -118, 114, -106); t.lineTo(114, -94); t.closePath();
    fillPanel(ctx, t, V, V.color || '#e63b1f');
    ctx.fillStyle = '#cfd3da'; ctx.beginPath(); ctx.ellipse(84, -112, 6, 2.2, -0.1, 0, 7); ctx.fill();
  }
  // เบาะ
  const seat = new Path2D();
  if (bv === 'stock' && mk === 'wave') { seat.moveTo(12, -97); seat.bezierCurveTo(30, -102, 60, -103, 80, -99); seat.quadraticCurveTo(84, -93, 78, -89); seat.lineTo(16, -88); seat.quadraticCurveTo(8, -92, 12, -97); }
  else { seat.moveTo(18, -97); seat.bezierCurveTo(36, -100, 60, -101, 76, -97); seat.quadraticCurveTo(79, -92, 74, -90); seat.lineTo(22, -90); seat.quadraticCurveTo(15, -93, 18, -97); }
  ctx.fillStyle = lg(ctx, 0, -103, 0, -88, [[0, '#3a3c44'], [0.5, '#1b1c20'], [1, '#0b0b0e']]); ctx.fill(seat);
  ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1; ctx.stroke(seat);
  ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.moveTo(24, -95); ctx.bezierCurveTo(40, -98, 60, -98, 74, -95); ctx.stroke(); ctx.setLineDash([]);

  // กระจกบังลม
  if (bv === 'fairing') {
    ctx.fillStyle = lg(ctx, 128, -130, 150, -104, [[0, 'rgba(160,220,255,.6)'], [1, 'rgba(60,120,180,.35)']]);
    ctx.beginPath(); ctx.moveTo(138, -104); ctx.lineTo(160, -131); ctx.lineTo(149, -132); ctx.lineTo(128, -108); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

function drawNos(ctx, V) {
  if (!V.nos) return;
  const big = V.nos > 1;
  ctx.save(); ctx.translate(2, -106); ctx.rotate(-0.12);
  const w = big ? 13 : 9, l = big ? 36 : 25;
  rr(ctx, -l / 2, -w / 2, l, w, w / 2); ctx.fillStyle = lg(ctx, 0, -w / 2, 0, w / 2, [[0, '#7aa8ff'], [0.4, '#2f6bff'], [1, '#12328a']]); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-l / 2 + 4, -w / 2 + 1.6, l - 8, 1.8);
  ctx.fillStyle = lg(ctx, 0, -3, 0, 3, [[0, '#ffe08a'], [1, '#a8791f']]); ctx.fillRect(l / 2 - 1, -2.5, 6, 5);
  ctx.restore();
  tube(ctx, [[8, -104], [30, -96], [60, -62], [96, -62]], 1.6, '#2f6bff');
}

/* ---------- คนขี่ (เด็กแว้นใส่รองเท้าแตะ) ---------- */
function limb(ctx, pts, w, col) { strokePath(ctx, pts, w + 2, 'rgba(0,0,0,.55)'); strokePath(ctx, pts, w, col); }
function drawRider(ctx, V, tuck) {
  const t = tuck || 0, lerp = (a, b) => a + (b - a) * t;
  const hip = [40, -101], knee = [84, -99], foot = [88, -47];
  const sh = [lerp(84, 98, t), lerp(-136, -124, t)];
  const head = [lerp(94, 110, t), lerp(-152, -138, t)], hand = [121, -124];
  const elbow = [(sh[0] + hand[0]) / 2 - 4, (sh[1] + hand[1]) / 2 + 12];
  const shirt = V.shirt || '#f2c230';
  limb(ctx, [hip, knee], 11, '#33568f');
  limb(ctx, [knee, foot], 9, '#2b4a7a');
  ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hip[0], hip[1] - 4); ctx.lineTo(knee[0], knee[1] - 4); ctx.stroke();
  // รองเท้าแตะ
  rr(ctx, foot[0] - 6, foot[1] - 2, 17, 4.5, 2); ctx.fillStyle = '#29c4f4'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
  strokePath(ctx, [[foot[0] + 2, foot[1] - 8], [foot[0] + 4, foot[1] - 2]], 1.4, '#e8f9ff');
  // เสื้อ
  limb(ctx, [hip, sh], 15, shirt);
  strokePath(ctx, [[hip[0] + 2, hip[1] - 4], [sh[0] + 2, sh[1] - 4]], 3, 'rgba(255,255,255,.35)');
  limb(ctx, [sh, elbow, hand], 5.6, shirt);
  ctx.fillStyle = '#d49a6a'; ctx.beginPath(); ctx.arc(hand[0], hand[1], 3.2, 0, 7); ctx.fill();
  // หัว + หมวกครึ่งใบ
  ctx.fillStyle = '#d49a6a'; ctx.beginPath(); ctx.arc(head[0], head[1], 9, 0, 7); ctx.fill();
  const hg = ctx.createRadialGradient(head[0] - 4, head[1] - 8, 1, head[0], head[1] - 1, 12);
  hg.addColorStop(0, shade(V.helmet || '#f5c518', 70)); hg.addColorStop(1, shade(V.helmet || '#f5c518', -50));
  ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(head[0], head[1] - 1, 11.5, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#111'; ctx.fillRect(head[0] + 1, head[1] - 4.5, 10, 3.6); // แว่น
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(head[0] + 2, head[1] - 4, 3, 1);
}

/* ---------- ตัวหลัก ---------- */
function drawBike(ctx, V, o) {
  o = o || {};
  const sc = o.scale || 1, ang = o.wheelAngle || 0, blur = o.blur || 0;
  ctx.save(); ctx.translate(o.x || 0, o.y || 0); ctx.scale(sc, sc);
  // เงาบนพื้น (ไล่ระดับ)
  const sg = ctx.createRadialGradient(75, 3, 4, 75, 3, 105);
  sg.addColorStop(0, 'rgba(0,0,0,.6)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.scale(1, 0.1); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(75, 30, 105, 0, 7); ctx.fill(); ctx.restore();
  if (o.pitch) ctx.rotate(-o.pitch);

  drawWheel(ctx, 0, -34, V, ang, false, blur);
  drawWheel(ctx, 150, -34, V, ang, true, blur);
  // ปีกนก + โช้คหลัง
  tube(ctx, [[62, -38], [0, -34]], 6, '#2e3138');
  drawRearShock(ctx, V);
  drawChain(ctx, V, ang);
  // เฟรม
  tube(ctx, [[130, -98], [60, -86], [20, -84]], 7, '#2e3138');
  tube(ctx, [[128, -96], [112, -56], [90, -42]], 6, '#2e3138');
  drawEngine(ctx, V);
  drawBodyPanels(ctx, V);
  // โช้คหน้า (แกนเงิน + กระบอกทอง/ดำ)
  drawFork(ctx, V);
  // แฮนด์ + มือจับ + มาตรวัด + กระจก
  tube(ctx, [[134, -102], [128, -124], [117, -125]], 3.4, '#2a2d33');
  rr(ctx, 113, -128, 9, 5.5, 2.5); ctx.fillStyle = '#0d0e11'; ctx.fill();
  strokePath(ctx, [[122, -125], [133, -118]], 1.6, '#aab0ba');
  strokePath(ctx, [[128, -124], [124, -138]], 1.4, '#2a2d33');
  ctx.fillStyle = lg(ctx, 0, -144, 0, -136, [[0, '#aeb4be'], [1, '#4a4f58']]); ctx.beginPath(); ctx.ellipse(122, -139, 6, 3.6, -0.3, 0, 7); ctx.fill();
  rr(ctx, 132, -118, 14, 9, 3); ctx.fillStyle = '#14161a'; ctx.fill();
  ctx.fillStyle = '#19e3ff'; ctx.fillRect(135, -115, 8, 3);
  drawHeadlight(ctx, V);
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
  ctx.fillStyle = '#242a35'; ctx.fillRect(cx - 24, 24, 48, crankY - 38 - 24 + 14);
  ctx.fillStyle = '#10141b'; ctx.fillRect(cx - 20, 24, 40, crankY - 38 - 24 + 14);
  const pCol = (V.piston && V.piston.col) || '#a9a39a', cCol = (V.conrod && V.conrod.col) || '#8a8f97';
  const py = pistonBot - 22;
  ctx.fillStyle = lg(ctx, cx - 19, 0, cx + 19, 0, [[0, shade(pCol, 50)], [0.5, pCol], [1, shade(pCol, -60)]]);
  rr(ctx, cx - 19, py, 38, 24, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 19, py + 4 + i * 3.5); ctx.lineTo(cx + 19, py + 4 + i * 3.5); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(cx - 15, py + 1, 6, 22);
  strokePath(ctx, [[cx, pistonBot], [pinX, pinY]], 7, cCol);
  strokePath(ctx, [[cx, pistonBot], [pinX, pinY]], 2, 'rgba(255,255,255,.3)');
  ctx.fillStyle = '#e5b53a'; ctx.beginPath(); ctx.arc(cx, pistonBot, 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a4f58'; ctx.beginPath(); ctx.arc(cx, crankY, 20, 0, 7); ctx.fill();
  ctx.fillStyle = '#2a2d33'; ctx.beginPath(); ctx.arc(cx, crankY, 6, 0, 7); ctx.fill();
  ctx.fillStyle = cCol; ctx.beginPath(); ctx.arc(pinX, pinY, 4.5, 0, 7); ctx.fill();
  ctx.textAlign = 'center'; ctx.font = `600 ${w < 110 ? 9 : 11}px Kanit, sans-serif`;
  const lim = w < 110 ? 16 : 22;
  const pn = V.piston ? V.piston.name : '', cn = V.conrod ? V.conrod.name : '';
  ctx.fillStyle = '#ffd36b'; ctx.fillText(pn.length > lim ? pn.slice(0, lim - 1) + '…' : pn, cx, 14);
  ctx.fillStyle = '#8fe3ff'; ctx.fillText(cn.length > lim ? cn.slice(0, lim - 1) + '…' : cn, cx, h - 8);
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
  ctx.strokeStyle = 'rgba(255,60,60,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(S.redline), padT); ctx.lineTo(X(S.redline), padT + ph); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ff8a1f'; ctx.fillText('แรงม้า', padL + 4, padT + 9);
  ctx.fillStyle = '#19e3ff'; ctx.fillText('แรงบิด', padL + 46, padT + 9);
}

/* ============================================================
   v3: ชิ้นส่วนใหม่ — เบรก Brembo, โช้ค Öhlins, เครื่อง/ท่อ 2 จังหวะ, ไฟหน้าแต่ละรุ่น
   ============================================================ */
function drawCaliper(ctx, cx, cy, rimR, V, ang, rear) {
  const bv = V.brakeV;
  let col = '#33363d';
  if (bv === 'drilled') col = '#2d6bff';
  else if (bv === 'brembo') col = '#e11f26';
  else if (bv === 'dual') col = rear ? '#e11f26' : '#f0b323';
  const big = bv === 'brembo' || bv === 'dual', w = big ? 15 : 11, h = big ? 13 : 10;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang);
  ctx.fillStyle = lg(ctx, 0, -h / 2, 0, h / 2, [[0, shade(col, 50)], [0.5, col], [1, shade(col, -55)]]);
  rr(ctx, rimR - w - 1, -h / 2, w, h, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
  if (big) { // ลูกสูบ 4 พอต + ไฮไลต์
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(rimR - w + 3.6 + i * 6.2, -h / 4 + j * (h / 2), 1.9, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(rimR - w + 1, -h / 2 + 1, w - 4, 1.4);
  }
  ctx.restore();
}

function drawRearShock(ctx, V) {
  const v = V.shockV || 'stock';
  const body = v === 'ohlins' ? '#f2c200' : '#2a2d33';
  const spring = v === 'ohlins' ? '#d9dde4' : v === 'yss' ? '#e5313b' : v === 'showa' ? '#e5b53a' : '#9aa0a8';
  const top = [14, -86], mid = [11, -62], bot = [8, -41];
  tube(ctx, [mid, bot], 6, body);
  tube(ctx, [top, [12.6, -74]], 3, '#cfd4dc');
  // สปริงขดเป็นห่วง
  ctx.save(); ctx.lineCap = 'butt';
  ctx.setLineDash([2.5, 1.7]);
  strokePath(ctx, [[13.4, -79], [11.2, -63]], 10.5, 'rgba(0,0,0,.6)');
  strokePath(ctx, [[13.4, -79], [11.2, -63]], 8.6, spring);
  ctx.setLineDash([]);
  strokePath(ctx, [[11.6, -78], [9.6, -64]], 1.6, 'rgba(255,255,255,.5)');
  ctx.restore();
  // ลูกยางรอง/จุดยึด
  ctx.fillStyle = '#b9bec7'; ctx.beginPath(); ctx.arc(top[0], top[1], 2.6, 0, 7); ctx.fill();
  ctx.fillStyle = '#b9bec7'; ctx.beginPath(); ctx.arc(bot[0], bot[1], 2.6, 0, 7); ctx.fill();
  if (v === 'ohlins' || v === 'showa') { // กระป๋องแยก (remote reservoir)
    const rc = v === 'ohlins' ? '#f2c200' : '#2a2d33';
    tube(ctx, [[18, -58], [27, -50]], 5.6, rc);
    ctx.fillStyle = v === 'ohlins' ? '#1a1a1a' : '#e5b53a'; ctx.fillRect(25, -53, 4, 2.4);
    strokePath(ctx, [[14, -54], [20, -56]], 1.8, '#1a1c20');
    ctx.fillStyle = '#e5313b'; ctx.beginPath(); ctx.arc(10.6, -47, 1.6, 0, 7); ctx.fill(); // ปุ่มปรับ
  }
}

function drawFork(ctx, V) {
  const v = V.shockV || 'stock';
  tube(ctx, [[136, -100], [150, -34]], 4.8, '#c7ccd4');
  const slider = v === 'ohlins' ? '#f2c200' : '#26282d';
  tube(ctx, [[145, -61], [150, -34]], 6.4, slider);
  if (v !== 'stock') { // แหวน/ฝาปรับพรีโหลด
    const ring = v === 'ohlins' ? '#1a1a1a' : v === 'yss' ? '#e5313b' : '#e5b53a';
    strokePath(ctx, [[143.8, -64], [146.2, -58]], 6.8, ring);
    ctx.fillStyle = v === 'ohlins' ? '#f2c200' : ring; rr(ctx, 133.4, -105, 6, 4, 1.4); ctx.fill();
  }
}

function drawEngine2T(ctx, V) {
  const acc = ENGINE_COL[V.engineV] || ENGINE_COL.stock;
  const mk = V.model, liquid = mk === 'kr' || mk === 'sp';
  const Lc = 22 + (V.cc - 125) * 0.1, wc = 19 + (V.cc - 125) * 0.08;
  // แคร้ง
  let g = ctx.createRadialGradient(62, -50, 2, 68, -44, 20);
  g.addColorStop(0, '#9aa0aa'); g.addColorStop(0.6, '#555a64'); g.addColorStop(1, '#2d3036');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(68, -44, 17.5, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  g = ctx.createRadialGradient(61, -48, 1, 64, -44, 11);
  g.addColorStop(0, '#6d727c'); g.addColorStop(1, '#2a2d33');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(64, -44, 10.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#80858f'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#b9bec7';
  for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283; ctx.beginPath(); ctx.arc(64 + Math.cos(a) * 7.4, -44 + Math.sin(a) * 7.4, 0.9, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#e8ecf2'; ctx.beginPath(); ctx.arc(52, -38, 4.6, 0, 7); ctx.fill(); // ปั๊มออยล์ออโต้ลูป
  ctx.strokeStyle = '#2a2d33'; ctx.lineWidth = 1; ctx.stroke();
  strokePath(ctx, [[76, -30], [86, -26], [90, -22]], 3, '#2a2d33');

  // หม้อน้ำ (KR / Serpico)
  if (liquid) {
    ctx.fillStyle = lg(ctx, 0, -80, 0, -46, [[0, '#454a54'], [1, '#1a1c21']]); rr(ctx, 111, -80, 7, 34, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(190,200,215,.4)'; ctx.lineWidth = 0.8;
    for (let y = -78; y < -47; y += 2.8) { ctx.beginPath(); ctx.moveTo(111.5, y); ctx.lineTo(117.5, y); ctx.stroke(); }
    tube(ctx, [[114, -79], [106, -68], [96, -60]], 3, '#1d3f9a');
    tube(ctx, [[114, -48], [100, -46]], 3, '#1d3f9a');
  }
  // กระบอกสูบ
  ctx.save(); ctx.translate(78, -50); ctx.rotate(-0.2);
  if (liquid) {
    ctx.fillStyle = lg(ctx, 0, -wc / 2, 0, wc / 2, [[0, '#cdd2da'], [0.5, '#8a909b'], [1, '#4d525c']]); ctx.fillRect(0, -wc / 2, Lc, wc);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
    for (const x of [Lc * 0.33, Lc * 0.66]) { ctx.beginPath(); ctx.moveTo(x, -wc / 2); ctx.lineTo(x, wc / 2); ctx.stroke(); }
    ctx.fillStyle = '#26282d'; ctx.fillRect(2, -wc / 2 - 2, 7, wc + 4);   // ปั๊มน้ำ/ท่อ
  } else {
    ctx.fillStyle = lg(ctx, 0, -wc / 2, 0, wc / 2, [[0, '#bfc4cc'], [1, '#6c727c']]); ctx.fillRect(0, -wc / 2, Lc, wc);
    for (let x = 2.5; x < Lc - 1; x += 4) {
      ctx.fillStyle = '#d6dae1'; ctx.fillRect(x, -wc / 2 - 2.6, 2.2, wc + 5.2);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 2.2, -wc / 2 - 2.6, 0.8, wc + 5.2);
    }
  }
  ctx.fillStyle = lg(ctx, 0, -wc / 2 - 2, 0, wc / 2 + 2, [[0, shade(acc, 50)], [0.5, acc], [1, shade(acc, -60)]]);
  rr(ctx, Lc, -wc / 2 - 2, 12, wc + 4, 3.5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(Lc + 2, -wc / 2 - 0.5, 3, wc - 1);
  ctx.restore();
  // หัวเทียน
  const hx = 78 + (Lc + 6) * Math.cos(-0.2), hy = -50 + (Lc + 6) * Math.sin(-0.2) - wc / 2 - 2;
  tube(ctx, [[hx + 1, hy], [hx + 4, hy - 8]], 2.4, '#2b2e34');
  rr(ctx, hx + 1, hy - 13, 6, 6, 2); ctx.fillStyle = '#111'; ctx.fill();

  // บล็อกลิ้นรีด + คาร์บู (ฝาข้างบังบางส่วน เหมือนรถจริง)
  const rcol = { v0: ['#8a8f97', '#4d525b'], v1: ['#33363d', '#0c0d10'], v2: ['#f0c24a', '#a8791f'] }[V.camId] || ['#8a8f97', '#4d525b'];
  ctx.fillStyle = lg(ctx, 0, -72, 0, -62, [[0, rcol[0]], [1, rcol[1]]]); rr(ctx, 62, -72, 13, 10, 2); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
  if (V.camId === 'v1') { ctx.strokeStyle = 'rgba(120,128,145,.5)'; ctx.lineWidth = 0.7; for (let i = 64; i < 75; i += 2.4) { ctx.beginPath(); ctx.moveTo(i, -71.5); ctx.lineTo(i - 3, -62.5); ctx.stroke(); } }
  const cv = V.carbV;
  const carbCol = cv === 'f0' ? '#8a8f97' : cv === 'f1' ? '#c0c5cc' : cv === 'f2' ? '#e5a53a' : '#22252b';
  ctx.fillStyle = lg(ctx, 0, -72, 0, -63, [[0, shade(carbCol, 40)], [1, shade(carbCol, -50)]]);
  rr(ctx, 46, -72, 17, 9, 2); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
  if (cv === 'f0') { ctx.fillStyle = lg(ctx, 0, -78, 0, -62, [[0, '#454952'], [1, '#1d1f24']]); rr(ctx, 30, -78, 17, 16, 3); ctx.fill(); }
  else if (cv === 'f3') { ctx.fillStyle = '#e11d2a'; ctx.fillRect(48, -75, 10, 2.6); ctx.fillStyle = lg(ctx, 0, -77, 0, -62, [[0, '#e8ecf2'], [1, '#8a909b']]); rr(ctx, 34, -77, 13, 14, 4); ctx.fill(); }
  else { const fc = cv === 'f2' ? '#2f6bff' : '#d6322c'; g = ctx.createRadialGradient(40, -71, 1, 40, -68, 9); g.addColorStop(0, shade(fc, 70)); g.addColorStop(1, shade(fc, -50)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(40, -68, 8, 0, 7); ctx.fill(); }
}

function drawExhaust2T(ctx, V) {
  const st = V.exhaustV || 'stock2t';
  const header = st === 'chamber3' ? '#8d98c8' : '#c4c9d1';
  tube(ctx, [[96, -46], [110, -40], [114, -28], [104, -22]], 5, header);
  if (st === 'stock2t') {
    tube(ctx, [[104, -22], [62, -24]], 5.4, header);
    ctx.save(); ctx.translate(60, -27); ctx.rotate(0.09);
    rr(ctx, -68, -9, 70, 16, 7); ctx.fillStyle = chrome(ctx, -9, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#16171a'; ctx.fillRect(-69, -5, 4, 8);
    ctx.restore();
    return;
  }
  // แชมเบอร์ทรงกรวยป่อง
  const c = new Path2D();
  c.moveTo(106, -27); c.bezierCurveTo(92, -27, 84, -39, 66, -39);
  c.bezierCurveTo(52, -39, 42, -31, 30, -29); c.lineTo(30, -23);
  c.bezierCurveTo(42, -21, 52, -11, 66, -11); c.bezierCurveTo(84, -11, 92, -19, 106, -19); c.closePath();
  const fillG = st === 'chamber3' ? lg(ctx, 0, -39, 0, -11, [[0, '#ddd5c2'], [0.35, '#a9a08a'], [0.7, '#e8e1cf'], [1, '#6d664f']]) : chrome(ctx, -39, -11);
  ctx.fillStyle = fillG; ctx.fill(c);
  ctx.save(); ctx.clip(c);
  if (st === 'chamber3') { // ไหม้สีน้ำเงิน-ม่วงใกล้คอท่อ
    ctx.fillStyle = lg(ctx, 106, 0, 80, 0, [[0, 'rgba(70,110,255,.9)'], [0.6, 'rgba(160,80,255,.45)'], [1, 'rgba(160,80,255,0)']]); ctx.fillRect(60, -45, 50, 40);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 1;   // แนวเชื่อม
  for (const x of [84, 66, 46]) { ctx.beginPath(); ctx.moveTo(x, -42); ctx.lineTo(x, -8); ctx.stroke(); }
  ctx.fillStyle = lg(ctx, 0, -39, 0, -11, [[0, 'rgba(255,255,255,.4)'], [0.3, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.35)']]); ctx.fillRect(25, -42, 85, 34);
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1; ctx.stroke(c);
  // สติงเกอร์ + กระป๋องเก็บเสียง
  tube(ctx, [[30, -26], [8, -29]], 4.4, header);
  ctx.save(); ctx.translate(8, -29); ctx.rotate(0.14);
  if (st === 'chamber') {
    rr(ctx, -20, -5, 24, 9, 4); ctx.fillStyle = chrome(ctx, -5, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#16171a'; ctx.fillRect(-21, -3, 3, 5);
  } else if (st === 'chamber2') {
    rr(ctx, -22, -5.5, 26, 10, 4.5); ctx.fillStyle = lg(ctx, 0, -5.5, 0, 4.5, [[0, '#4a4e57'], [1, '#101215']]); ctx.fill();
    ctx.fillStyle = chrome(ctx, -5, 4); ctx.fillRect(-23, -4.5, 6, 8);
  } else {
    rr(ctx, -22, -5.5, 26, 10, 4.5); ctx.fillStyle = '#16181c'; ctx.fill();
    ctx.save(); rr(ctx, -22, -5.5, 26, 10, 4.5); ctx.clip();
    ctx.strokeStyle = 'rgba(80,88,104,.7)'; ctx.lineWidth = 1.1;
    for (let x = -26; x < 6; x += 3.6) { ctx.beginPath(); ctx.moveTo(x, -7); ctx.lineTo(x + 7, 6); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = lg(ctx, 0, -5, 0, 4, [[0, '#9fb4ff'], [1, '#6a4fc9']]); ctx.fillRect(-23, -4.5, 6, 8);
  }
  ctx.restore();
}

function drawHeadlight(ctx, V) {
  const mk = V.model || 'wave', sport = (V.bodyV || 'stock') === 'stock' && (mk === 'kr' || mk === 'sp');
  const glow = (x, y, r) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,170,.18)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore(); };
  if (sport && mk === 'kr') {       // ไฟหน้าสองดวงเหลี่ยม
    for (const dy of [-103, -92]) {
      ctx.fillStyle = lg(ctx, 0, dy - 4, 0, dy + 4, [[0, '#fffde8'], [1, '#c9b35a']]);
      rr(ctx, 148, dy - 4.2, 16, 8.4, 3.4); ctx.fill(); ctx.strokeStyle = '#4a4f58'; ctx.lineWidth = 1.2; ctx.stroke();
    }
    glow(166, -97, 15);
  } else if (sport && mk === 'sp') { // ไฟหน้ากลมใหญ่ในฟิตติ้ง
    const lgr = ctx.createRadialGradient(152, -92, 1, 154, -90, 11);
    lgr.addColorStop(0, '#fffde8'); lgr.addColorStop(0.6, '#ffe9a0'); lgr.addColorStop(1, '#b89a40');
    ctx.fillStyle = lgr; ctx.beginPath(); ctx.ellipse(155, -92, 8.4, 10.6, 0.25, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5a5f68'; ctx.lineWidth = 1.8; ctx.stroke();
    glow(158, -92, 15);
  } else {
    const lgr = ctx.createRadialGradient(146, -109, 1, 147, -108, 8);
    lgr.addColorStop(0, '#fffde8'); lgr.addColorStop(0.6, '#ffe9a0'); lgr.addColorStop(1, '#b89a40');
    ctx.fillStyle = lgr; ctx.beginPath(); ctx.arc(147, -108, 7.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#6a6f78'; ctx.lineWidth = 1.6; ctx.stroke();
    glow(150, -108, 14);
  }
  ctx.fillStyle = '#ffab2e'; rr(ctx, 138, -96, 6, 4, 2); ctx.fill();
}
