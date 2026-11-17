'use strict';
/* ============================================================
   WAVE RACE — โหมดแข่งทางตรง ¼ ไมล์ (0.402 กม.)
   ต้องการ (จาก main.js): SAVE, persist(), showScreen(), showModal(), closeModal(),
                          fitCanvas(), renderAll()
   ============================================================ */
const keys = { gas: false, shiftT: 0, nosT: 0 };
let RC = null, raceRaf = 0;

/* ---------- เสียง (WebAudio สังเคราะห์) ---------- */
const Snd = {
  ctx: null, on: true,
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.filt = this.ctx.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.frequency.value = 900;
      this.gain = this.ctx.createGain(); this.gain.gain.value = 0;
      this.o1 = this.ctx.createOscillator(); this.o1.type = 'sawtooth';
      this.o2 = this.ctx.createOscillator(); this.o2.type = 'square';
      this.o1.connect(this.filt); this.o2.connect(this.filt);
      this.filt.connect(this.gain); this.gain.connect(this.ctx.destination);
      this.o1.start(); this.o2.start();
    } catch (e) { this.ctx = null; }
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  engine(rpm, thr, run) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, f = 26 + rpm * 0.0135;
    this.o1.frequency.setTargetAtTime(f, t, 0.03);
    this.o2.frequency.setTargetAtTime(f * 2.01, t, 0.03);
    this.filt.frequency.setTargetAtTime(500 + rpm * 0.12, t, 0.05);
    this.gain.gain.setTargetAtTime(this.on && run ? 0.05 + 0.07 * thr : 0, t, 0.04);
  },
  beep(freq, dur) {
    if (!this.ctx || !this.on) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0.08;
    o.connect(g); g.connect(this.ctx.destination); o.start(t);
    g.gain.setTargetAtTime(0, t + dur * 0.7, 0.03); o.stop(t + dur + 0.15);
  },
  silence() { if (this.ctx) this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05); },
};

/* ---------- ฉากหลัง (สุ่มครั้งเดียว) ---------- */
const STARS = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * 0.42, r: Math.random() * 1.3 + 0.3 }));
const BLD = (() => {
  let x = 0; const a = [];
  for (let i = 0; i < 46; i++) {
    const w = 34 + Math.random() * 60, h = 40 + Math.random() * 130;
    a.push({ x, w, h, win: Array.from({ length: 16 }, () => Math.random() < 0.35) });
    x += w + Math.random() * 10;
  }
  return { a, W: x };
})();
const CROWD = [];
[-6, 35, 200, 392, 420].forEach(c => {
  for (let i = 0; i < 12; i++) CROWD.push({ m: c + (Math.random() - 0.5) * 28, h: 0.8 + Math.random() * 0.35, phone: Math.random() < 0.4, hue: Math.floor(Math.random() * 360) });
});

/* ---------- เริ่ม / ออก ---------- */
function startRace(idx) {
  const opp = OPPONENTS[idx];
  const PS = computeStats(SAVE.build, SAVE.crafted);
  const OS = computeStats(opp.build, []); OS.risk = 0;
  RC = {
    idx, opp, PS, OS,
    P: new Racer(PS, { allowBlow: true }), O: new Racer(OS, {}),
    VP: Object.assign({}, PS.visual, { color: SAVE.color, helmet: SAVE.helmet }),
    VO: Object.assign({}, OS.visual, { color: opp.color, helmet: '#ffffff', shirt: '#33343a' }),
    phase: 'tree', treeT: 0, greenAt: 2.6 + Math.random() * 0.7, t: 0,
    preRpm: 1500, rpmDisp: 1500, gasAtGreen: false, RT: 0, launchFrac: null,
    oppRT: opp.rt * (0.85 + Math.random() * 0.3), oppShift: opp.shiftPt + (Math.random() - 0.5) * 0.03,
    sweet: bestLaunchFrac(PS), particles: [], flameP: 0, flameO: 0, banner: '', bannerT: 0, bannerCol: '#fff',
    pitchP: 0, pitchO: 0, acc: 0, doneT: 0, shifts: { perfect: 0, good: 0, early: 0, late: 0 },
    shown: false, auto: SAVE.auto, beeped: 0, cam: 0, last: performance.now(),
  };
  keys.gas = false; keys.shiftT = 0; keys.nosT = 0;
  closeModal();
  showScreen('race');
  Snd.init(); Snd.resume();
  cancelAnimationFrame(raceRaf);
  raceRaf = requestAnimationFrame(raceLoop);
}
function exitRace() {
  cancelAnimationFrame(raceRaf); RC = null; Snd.silence();
  closeModal(); showScreen('garage'); renderAll();
}

function raceLoop(ts) {
  if (!RC) return;
  const dt = Math.min(0.05, (ts - RC.last) / 1000 || 0.016); RC.last = ts;
  updateRace(dt);
  drawRaceFrame(ts / 1000);
  raceRaf = requestAnimationFrame(raceLoop);
}

function setBanner(txt, col, dur) { RC.banner = txt; RC.bannerCol = col || '#fff'; RC.bannerT = dur || 1.4; }

function updateRace(dt) {
  const R = RC, P = R.P, O = R.O, PS = R.PS;
  keys.shiftT = Math.max(0, keys.shiftT - dt); keys.nosT = Math.max(0, keys.nosT - dt);

  if (R.phase === 'tree') {
    R.treeT += dt;
    if (keys.gas) R.preRpm = Math.min(PS.redline * 0.985, R.preRpm + 6000 * dt);
    else R.preRpm = Math.max(1500, R.preRpm - 8000 * dt);
    R.rpmDisp = R.preRpm;
    const marks = [1.0, 1.5, 2.0];
    while (R.beeped < 3 && R.treeT >= marks[R.beeped]) { Snd.beep(700, 0.2); R.beeped++; }
    if (R.treeT >= R.greenAt) { R.phase = 'run'; R.t = 0; R.gasAtGreen = keys.gas; Snd.beep(1300, 0.5); }
  } else {
    R.t += dt;
    if (!P.launched) {
      if (R.gasAtGreen) launchPlayer(0.03 + Math.random() * 0.07, R.preRpm);
      else if (R.auto && R.t >= 0.18) launchPlayer(0.18 + Math.random() * 0.05, R.sweet * PS.redline);
      else if (keys.gas) launchPlayer(R.t, 3200);
    }
    if (!O.launched && R.t >= R.oppRT) O.launch(R.opp.launch * R.OS.redline, R.oppRT);

    R.acc += dt;
    const h = 1 / 240;
    while (R.acc >= h) {
      R.acc -= h;
      if (P.launched) {
        const thr = R.auto ? 1 : (keys.gas ? 1 : 0);
        let shift = keys.shiftT > 0;
        if (R.auto) shift = P.gear < PS.ratios.length - 1 && P.shiftT <= 0 && P.rpm >= PS.redline * 0.965;
        P.step(h, { thr, shift, nos: keys.nosT > 0 || (R.auto && P.x > 40) });
        handlePlayerEvents();
      }
      if (O.launched) {
        O.step(h, autoInput(O, R.oppShift, R.opp.nosAt));
        for (const e of O.events) if (e.type === 'shift') R.flameO = 0.8;
        O.events.length = 0;
      }
    }
    // แสดงรอบเครื่อง (นุ่มนวล)
    const target = P.launched ? P.rpm : (keys.gas ? 3200 : 1500);
    R.rpmDisp += (target - R.rpmDisp) * Math.min(1, 14 * dt);

    if (P.finished && R.phase === 'run') R.phase = 'finish';
    if (P.stopped && !R.shown) { R.doneT += dt; if (R.doneT > 1.2) showResult(); }
    if (R.t > 75 && !R.shown) showResult();
  }

  // ท่าล้อยก + เอฟเฟกต์
  const targetPitch = (P.launched && !P.blown) ? Math.max(0, Math.min(28, (P.accel / G_ACCEL - 0.28) * 55)) * (P.shiftT > 0 ? 0.6 : 1) : 0;
  R.pitchP += (targetPitch - R.pitchP) * Math.min(1, 8 * dt);
  const targetO = (O.launched && !O.blown) ? Math.max(0, Math.min(24, (O.accel / G_ACCEL - 0.28) * 50)) : 0;
  R.pitchO += (targetO - R.pitchO) * Math.min(1, 8 * dt);
  R.flameP = Math.max(0, R.flameP - dt * 5); R.flameO = Math.max(0, R.flameO - dt * 5);
  R.bannerT = Math.max(0, R.bannerT - dt);

  // ควันยาง
  if (P.spin && P.launched && Math.random() < 0.8) {
    R.particles.push({ x: P.x - 0.1, y: 0, vx: -P.v * 0.5 - Math.random() * 2, vy: -(10 + Math.random() * 30), life: 0.9, max: 0.9, size: 7 + Math.random() * 7, col: '230,230,235', near: true });
  }
  if (P.blown && Math.random() < 0.9) {
    R.particles.push({ x: P.x + 0.5, y: 0, vx: -P.v * 0.3, vy: -(25 + Math.random() * 40), life: 1.2, max: 1.2, size: 8 + Math.random() * 8, col: '40,40,45', near: true, up: 40 });
  }
  for (const p of R.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.size += 20 * dt; }
  R.particles = R.particles.filter(p => p.life > 0);

  Snd.engine(R.rpmDisp, P.launched ? (keys.gas || R.auto ? 1 : 0) : (keys.gas ? 1 : 0), true);
}

function launchPlayer(rt, rpm) {
  const R = RC;
  R.P.launch(rpm, rt); R.RT = rt; R.launchFrac = rpm / R.PS.redline;
  setBanner(`ปฏิกิริยา ${rt.toFixed(3)} วิ`, '#8fe3ff', 1.6);
}
function handlePlayerEvents() {
  const R = RC, P = R.P;
  for (const e of P.events) {
    if (e.type === 'shift') {
      keys.shiftT = 0; R.flameP = 1;
      if (!R.auto) {
        if (e.ratio > 1.03) { R.shifts.late++; setBanner('ตัดช้าไป!', '#ff9b9b'); }
        else if (e.ratio >= 0.92) { R.shifts.perfect++; setBanner('PERFECT SHIFT!', '#46f08a'); }
        else if (e.ratio >= 0.82) { R.shifts.good++; setBanner('GOOD', '#ffd36b'); }
        else { R.shifts.early++; setBanner('ชิฟต์เร็วไป', '#ff9b9b'); }
      }
    } else if (e.type === 'nos') { keys.nosT = 0; setBanner('NOS!!', '#59b8ff', 1.2); }
    else if (e.type === 'blown') setBanner('💥 เครื่องพัง!', '#ff5d5d', 3);
    else if (e.type === 'finish') setBanner(`ผ่านเส้น ${P.ET.toFixed(3)} วิ`, '#ffd36b', 2.5);
  }
  P.events.length = 0;
}

/* ---------- สรุปผล ---------- */
function finalizeOpp() {
  const R = RC, O = R.O;
  if (!O.launched) O.launch(R.opp.launch * R.OS.redline, R.oppRT);
  let n = 0;
  while (!O.finished && n < 80000) { O.step(1 / 240, autoInput(O, R.oppShift, R.opp.nosAt)); n++; }
  O.events.length = 0;
}
function showResult() {
  const R = RC; if (R.shown) return; R.shown = true;
  finalizeOpp();
  const P = R.P, O = R.O, opp = R.opp;
  const pAbs = P.finished ? R.RT + P.ET : Infinity;
  const oAbs = O.finished ? R.oppRT + O.ET : Infinity;
  const win = P.finished && pAbs < oAbs;
  const overrun = (P.finished && P.stopX != null) ? P.stopX - QUARTER_M : 0;
  const crashed = P.finished && overrun > 150;
  const bonusShift = win ? R.shifts.perfect * 40 : 0;
  let prize = win ? opp.prize : Math.round(opp.prize * 0.12);
  prize += bonusShift;
  let repair = 0;
  if (P.blown) repair += 400;
  if (crashed) repair += 150;
  const before = SAVE.money;
  SAVE.money = Math.max(0, SAVE.money + prize - repair);

  const got = { alu: 0, steel: 0, ti: 0 };
  if (win) for (const k in got) got[k] = randInt(opp.drops[k][0], opp.drops[k][1]);
  else got.alu = Math.random() < 0.5 ? 1 : 0;
  for (const k in got) SAVE.mats[k] = (SAVE.mats[k] || 0) + got[k];

  SAVE.races++; if (win) SAVE.wins++;
  if (P.finished && (SAVE.best === null || P.ET < SAVE.best)) SAVE.best = P.ET;
  persist();

  const bestL = R.sweet;
  const gotTxt = Object.keys(got).filter(k => got[k] > 0).map(k => `${MATERIALS[k].icon} ${MATERIALS[k].name} ×${got[k]}`).join('  ') || '—';
  const row = (a, b, c) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`;
  const html = `
  <div class="res">
    <h2 class="${win ? 'win' : 'lose'}">${win ? '🏆 ชนะ!' : (P.blown ? '💥 เครื่องพัง!' : '😵 แพ้')}</h2>
    <p class="sub">VS ${opp.name}</p>
    <table class="rt">
      <tr><th></th><th>คุณ</th><th>คู่แข่ง</th></tr>
      ${row('ET ¼ ไมล์ (0.402 กม.)', P.finished ? P.ET.toFixed(3) + ' วิ' : 'DNF', O.finished ? O.ET.toFixed(3) + ' วิ' : 'DNF')}
      ${row('ปฏิกิริยา', R.RT ? R.RT.toFixed(3) + ' วิ' : '—', R.oppRT.toFixed(3) + ' วิ')}
      ${row('ความเร็วปลายทาง', P.finished ? (P.trap * 3.6).toFixed(1) + ' กม./ชม.' : '—', O.finished ? (O.trap * 3.6).toFixed(1) + ' กม./ชม.' : '—')}
    </table>
    <ul class="notes">
      ${R.launchFrac ? `<li>รอบออกตัว ${Math.round(R.launchFrac * 100)}% ของรอบตัด (ดีที่สุดประมาณ ${Math.round(bestL * 100)}%)</li>` : ''}
      ${!R.auto ? `<li>ชิฟต์ PERFECT ${R.shifts.perfect} • GOOD ${R.shifts.good} • เร็วไป ${R.shifts.early} • ช้าไป ${R.shifts.late}</li>` : '<li>โหมดง่าย (ออโต้) — ปิดโหมดง่ายเพื่อรับโบนัสชิฟต์</li>'}
      ${P.finished ? `<li>ระยะเบรกหลังเส้น ${Math.max(0, overrun).toFixed(0)} ม. ${crashed ? '— พุ่งลงนา! 🌾' : '— หยุดทัน ✔'}</li>` : ''}
    </ul>
    <div class="reward">
      <div>รางวัล <b>฿${fmtInt(prize)}</b>${bonusShift ? ` <small>(รวมโบนัสชิฟต์ ฿${bonusShift})</small>` : ''}</div>
      ${repair ? `<div class="bad">ค่าซ่อม −฿${fmtInt(repair)}${before + prize < repair ? ' (เงินไม่พอ หักจนหมดกระเป๋า)' : ''}</div>` : ''}
      <div>วัตถุดิบที่ได้: ${gotTxt}</div>
    </div>
    <div class="btns"><button class="primary" data-act="again">🔁 แข่งซ้ำ</button><button data-act="home">🏠 กลับโรงรถ</button></div>
  </div>`;
  showModal(html, act => { if (act === 'again') startRace(R.idx); else if (act === 'home') exitRace(); });
}

/* ---------- วาดฉาก ---------- */
function drawRaceFrame(t) {
  const R = RC; if (!R) return;
  const { ctx, w: W, h: H } = fitCanvas(document.getElementById('race-canvas'));
  const P = R.P, O = R.O;
  const sc = Math.max(0.6, Math.min(1.15, W / 1000));
  const ppm = 58 * sc;
  const roadTop = H * 0.5, farY = H * 0.69, nearY = H * 0.87;
  const px = W * 0.3;
  R.cam += (P.x - R.cam) * 0.35;
  const camM = R.cam;
  const X = m => px + (m - camM) * ppm;

  // ท้องฟ้า
  let g = ctx.createLinearGradient(0, 0, 0, roadTop);
  g.addColorStop(0, '#070b1f'); g.addColorStop(0.6, '#2a1650'); g.addColorStop(1, '#ff7a3d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, roadTop + 2);
  ctx.fillStyle = '#fff';
  for (const s of STARS) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + s.x * 40); ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.14, 22 * sc, 0, 7); ctx.fill();

  // ตึกไกลๆ
  const tileW = BLD.W * sc, off = (camM * ppm * 0.05) % tileW;
  for (let rep = -1; rep < Math.ceil(W / tileW) + 2; rep++) {
    for (const b of BLD.a) {
      const x = rep * tileW + b.x * sc - off;
      if (x > W || x + b.w * sc < 0) continue;
      ctx.fillStyle = '#10162e'; ctx.fillRect(x, roadTop - b.h * sc, b.w * sc, b.h * sc);
      ctx.fillStyle = 'rgba(255,214,120,.65)';
      b.win.forEach((on, i) => { if (on) ctx.fillRect(x + 6 * sc + (i % 4) * 12 * sc, roadTop - b.h * sc + 8 * sc + Math.floor(i / 4) * 14 * sc, 5 * sc, 7 * sc); });
    }
  }
  // เสาไฟฟ้า + สายไฟ (พารัลแลกซ์กลาง)
  const sp = 220 * sc, offM = (camM * ppm * 0.3) % sp;
  ctx.strokeStyle = '#07090f'; ctx.lineWidth = 3 * sc;
  for (let i = -1; i < W / sp + 2; i++) {
    const x = i * sp - offM;
    ctx.beginPath(); ctx.moveTo(x, roadTop + 2); ctx.lineTo(x, roadTop - 95 * sc); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 16 * sc, roadTop - 88 * sc); ctx.lineTo(x + 16 * sc, roadTop - 88 * sc); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (const dy of [-88, -80]) { ctx.beginPath(); ctx.moveTo(x, roadTop + dy * sc); ctx.quadraticCurveTo(x + sp / 2, roadTop + (dy + 18) * sc, x + sp, roadTop + dy * sc); ctx.stroke(); }
    ctx.lineWidth = 3 * sc;
  }

  // ถนน
  g = ctx.createLinearGradient(0, roadTop, 0, H);
  g.addColorStop(0, '#171922'); g.addColorStop(1, '#2b2e3a');
  ctx.fillStyle = g; ctx.fillRect(0, roadTop, W, H - roadTop);

  // ฝูงชน + ราวกั้น (เด็กแว้นมาดูทริป)
  const m0 = camM - px / ppm - 5, m1 = camM + (W - px) / ppm + 5;
  for (const c of CROWD) {
    if (c.m < m0 || c.m > m1) continue;
    const x = X(c.m), hh = 24 * sc * c.h;
    ctx.fillStyle = `hsl(${c.hue},45%,28%)`; ctx.fillRect(x - 4 * sc, roadTop - 8 * sc - hh, 8 * sc, hh);
    ctx.fillStyle = '#c99366'; ctx.beginPath(); ctx.arc(x, roadTop - 11 * sc - hh, 4.5 * sc, 0, 7); ctx.fill();
    if (c.phone) { ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillRect(x + 4 * sc, roadTop - 8 * sc - hh - 6 * sc, 3 * sc, 4 * sc); }
  }
  ctx.fillStyle = '#9aa0ae'; ctx.fillRect(0, roadTop - 8 * sc, W, 8 * sc);
  ctx.fillStyle = '#5a6070'; ctx.fillRect(0, roadTop - 3 * sc, W, 3 * sc);

  // เสาไฟ (ล็อกกับโลก ทุก 40 ม.)
  for (let m = Math.floor(m0 / 40) * 40; m < m1 + 40; m += 40) {
    const x = X(m);
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(x - 2 * sc, roadTop - 135 * sc, 4 * sc, 135 * sc);
    ctx.fillRect(x, roadTop - 135 * sc, 26 * sc, 3 * sc);
    ctx.fillStyle = '#fff3c4'; ctx.fillRect(x + 20 * sc, roadTop - 133 * sc, 10 * sc, 4 * sc);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createRadialGradient(x + 25 * sc, roadTop + 40 * sc, 5, x + 25 * sc, roadTop + 40 * sc, 170 * sc);
    gg.addColorStop(0, 'rgba(255,220,140,.16)'); gg.addColorStop(1, 'rgba(255,220,140,0)');
    ctx.fillStyle = gg; ctx.fillRect(x - 150 * sc, roadTop - 60 * sc, 360 * sc, 300 * sc);
    ctx.restore();
  }
  // ป้ายระยะ ทุก 100 ม.
  ctx.font = `700 ${11 * sc}px Kanit, sans-serif`; ctx.textAlign = 'center';
  for (let m = Math.max(100, Math.floor(m0 / 100) * 100); m < Math.min(QUARTER_M - 5, m1); m += 100) {
    const x = X(m);
    ctx.fillStyle = '#15803d'; rr(ctx, x - 20 * sc, roadTop - 40 * sc, 40 * sc, 22 * sc, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText((m / 1000).toFixed(1) + ' กม.', x, roadTop - 25 * sc);
    ctx.fillStyle = '#444'; ctx.fillRect(x - 1, roadTop - 18 * sc, 2, 10 * sc);
  }
  // เส้นเลน
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let m = Math.floor(m0 / 6) * 6; m < m1; m += 6) ctx.fillRect(X(m), H * 0.78 - 1.5 * sc, 3 * ppm, 3 * sc);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, roadTop + 8 * sc, W, 2 * sc);

  // เส้นสตาร์ท
  const sx = X(0);
  if (sx > -30 && sx < W + 30) {
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(sx - 4 * sc, roadTop + 8 * sc, 8 * sc, H - roadTop);
    ctx.fillStyle = '#fff'; ctx.font = `800 ${14 * sc}px Kanit, sans-serif`; ctx.fillText('START', sx, roadTop - 50 * sc);
  }
  // เส้นชัย + ป้ายใหญ่
  const fx = X(QUARTER_M);
  if (fx > -120 && fx < W + 120) {
    const cell = 12 * sc;
    for (let y = roadTop + 8 * sc, i = 0; y < H; y += cell, i++) {
      ctx.fillStyle = i % 2 ? '#fff' : '#111'; ctx.fillRect(fx - cell, y, cell, cell);
      ctx.fillStyle = i % 2 ? '#111' : '#fff'; ctx.fillRect(fx, y, cell, cell);
    }
    ctx.fillStyle = '#0a0c12'; ctx.fillRect(fx - 66 * sc, roadTop - 160 * sc, 4 * sc, 160 * sc); ctx.fillRect(fx + 62 * sc, roadTop - 160 * sc, 4 * sc, 160 * sc);
    const bg = ctx.createLinearGradient(fx - 70 * sc, 0, fx + 70 * sc, 0); bg.addColorStop(0, '#ff6a00'); bg.addColorStop(1, '#ff2d55');
    ctx.fillStyle = bg; rr(ctx, fx - 70 * sc, roadTop - 160 * sc, 140 * sc, 44 * sc, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${18 * sc}px Kanit, sans-serif`; ctx.fillText('FINISH', fx, roadTop - 138 * sc);
    ctx.font = `600 ${11 * sc}px Kanit, sans-serif`; ctx.fillText('¼ ไมล์ = 0.402 กม.', fx, roadTop - 123 * sc);
  }

  // รถคู่แข่ง (เลนไกล) → รถผู้เล่น (เลนใกล้)
  const bscP = 0.92 * sc, bscO = 0.82 * sc;
  drawBike(ctx, R.VO, { x: X(O.x), y: farY, scale: bscO, pitch: R.pitchO * Math.PI / 180, wheelAngle: O.wheelAngle, rider: true, tuck: Math.min(1, O.v / 25), flame: R.flameO, nosFlame: O.nosOn });
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `600 ${11 * sc}px Kanit, sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(R.opp.name, X(O.x) + 70 * bscO, farY - 130 * bscO);
  drawBike(ctx, R.VP, { x: X(P.x), y: nearY, scale: bscP, pitch: R.pitchP * Math.PI / 180, wheelAngle: P.wheelAngle, rider: true, tuck: Math.min(1, P.v / 25), flame: R.flameP, nosFlame: P.nosOn && !P.blown });
  // ควัน
  for (const p of R.particles) {
    ctx.fillStyle = `rgba(${p.col},${Math.max(0, p.life / p.max) * 0.5})`;
    ctx.beginPath(); ctx.arc(X(p.x), nearY - 4 * sc + p.y, p.size * sc, 0, 7); ctx.fill();
  }
  // เส้นความเร็ว
  if (P.v > 18) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.25, (P.v - 18) / 120)})`; ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const y = roadTop + ((i * 97.3 + t * 40) % (H - roadTop)), x = ((i * 211 - t * P.v * 60) % W + W) % W;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 + P.v * 2, y); ctx.stroke();
    }
  }
  drawHUD(ctx, W, H, t);
}

/* ---------- HUD ---------- */
function drawTach(ctx, cx, cy, r, rpm, red, sweet, showSweet, hs) {
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, maxR = red * 1.08;
  const A = v => a0 + Math.min(1, v / maxR) * (a1 - a0);
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,14,.75)'; ctx.beginPath(); ctx.arc(cx, cy, r + 14 * hs, 0, 7); ctx.fill();
  ctx.lineWidth = 10 * hs; ctx.lineCap = 'butt';
  ctx.strokeStyle = '#1f2633'; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.stroke();
  ctx.strokeStyle = '#e5313b'; ctx.beginPath(); ctx.arc(cx, cy, r, A(red * 0.92), a1); ctx.stroke();
  if (showSweet) { ctx.strokeStyle = '#27e06a'; ctx.beginPath(); ctx.arc(cx, cy, r, A(red * (sweet - 0.05)), A(red * (sweet + 0.05))); ctx.stroke(); }
  ctx.strokeStyle = '#8b93a3'; ctx.lineWidth = 2; ctx.fillStyle = '#c8cedb';
  ctx.font = `600 ${11 * hs}px Kanit, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let k = 0; k * 1000 <= maxR; k++) {
    const a = A(k * 1000), c = Math.cos(a), s = Math.sin(a);
    ctx.beginPath(); ctx.moveTo(cx + c * (r - 9 * hs), cy + s * (r - 9 * hs)); ctx.lineTo(cx + c * (r - 15 * hs), cy + s * (r - 15 * hs)); ctx.stroke();
    if (k % 2 === 0) ctx.fillText(String(k), cx + c * (r - 26 * hs), cy + s * (r - 26 * hs));
  }
  const a = A(rpm);
  ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 3.5 * hs; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 6 * hs), cy + Math.sin(a) * (r - 6 * hs)); ctx.stroke();
  ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(cx, cy, 6 * hs, 0, 7); ctx.fill();
  ctx.restore();
}

function drawHUD(ctx, W, H, t) {
  const R = RC, P = R.P, O = R.O, PS = R.PS;
  const hs = Math.max(0.8, Math.min(1.15, W / 900));
  ctx.textBaseline = 'alphabetic';

  // ไฟสตาร์ท
  const lights = R.phase === 'tree' ? [R.treeT >= 1.0, R.treeT >= 1.5, R.treeT >= 2.0, false] : [false, false, false, true];
  const showTree = R.phase === 'tree' || R.t < 1.6;
  if (showTree) {
    const ty = 64 * hs, gap = 30 * hs;
    ctx.fillStyle = 'rgba(6,8,14,.75)'; rr(ctx, W / 2 - 2.5 * gap, ty - 22 * hs, 5 * gap, 44 * hs, 10); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const on = lights[i], col = i < 3 ? '#ffb020' : '#27e06a';
      ctx.fillStyle = on ? col : '#2a2f3a'; ctx.beginPath(); ctx.arc(W / 2 + (i - 1.5) * gap, ty, 10 * hs, 0, 7); ctx.fill();
      if (on) { ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.fill(); ctx.restore(); }
    }
    if (R.phase === 'tree') {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `600 ${15 * hs}px Kanit, sans-serif`;
      ctx.fillText(R.auto ? 'โหมดง่าย: รถจะออกตัวเอง รอไฟเขียว!' : 'ค้าง GAS เพื่อเร่งเครื่อง (เข็มให้อยู่ในโซนเขียว) แล้วรอไฟเขียว', W / 2, ty + 42 * hs);
    }
  }

  // แถบความคืบหน้า 0 → 0.402 กม.
  const bx = W * 0.22, bw = W * 0.56, by = 118 * hs;
  if (!showTree || R.phase !== 'tree') {
    ctx.fillStyle = 'rgba(6,8,14,.6)'; rr(ctx, bx - 10, by - 12, bw + 20, 24, 8); ctx.fill();
    ctx.strokeStyle = '#3a4152'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.stroke();
    const dot = (m, col, rad) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx + Math.min(1, m / QUARTER_M) * bw, by, rad, 0, 7); ctx.fill(); };
    dot(O.x, R.opp.color, 5 * hs); dot(P.x, '#ff7a1a', 6.5 * hs);
    ctx.fillStyle = '#fff'; ctx.font = `600 ${11 * hs}px Kanit, sans-serif`; ctx.textAlign = 'left'; ctx.fillText('0', bx - 4, by - 14);
    ctx.textAlign = 'right'; ctx.fillText('0.402 กม.', bx + bw + 8, by - 14);
  }

  // เวลา / ระยะ (ซ้ายบน)
  const et = P.finished ? P.ET : (P.launched ? P.launchT : 0);
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(6,8,14,.7)'; rr(ctx, 12, 12, 190 * hs, 78 * hs, 10); ctx.fill();
  ctx.fillStyle = '#ffd36b'; ctx.font = `700 ${30 * hs}px Kanit, sans-serif`; ctx.fillText(et.toFixed(3) + ' s', 24, 46 * hs);
  ctx.fillStyle = '#e6e9f2'; ctx.font = `500 ${14 * hs}px Kanit, sans-serif`;
  ctx.fillText(`ระยะ ${(Math.min(P.x, QUARTER_M) / 1000).toFixed(3)} / 0.402 กม.`, 24, 70 * hs);
  ctx.fillStyle = '#8fe3ff'; ctx.font = `500 ${12 * hs}px Kanit, sans-serif`;
  ctx.fillText(P.finished ? `ความเร็วปลายทาง ${(P.trap * 3.6).toFixed(1)} กม./ชม.` : 'เวลา ET (ไม่รวมปฏิกิริยา)', 24, 85 * hs);

  // มาตรวัดรอบ + ความเร็ว (ซ้ายล่าง)
  const r = 78 * hs, cx = 24 + r + 18 * hs, cy = H - r - 30 * hs;
  drawTach(ctx, cx, cy, r, R.rpmDisp, PS.redline, R.sweet, R.phase === 'tree' || !P.launched, hs);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = `800 ${34 * hs}px Kanit, sans-serif`; ctx.fillText(String(Math.round(P.v * 3.6)), cx, cy + 8 * hs);
  ctx.font = `500 ${11 * hs}px Kanit, sans-serif`; ctx.fillStyle = '#9aa3b5'; ctx.fillText('กม./ชม.', cx, cy + 24 * hs);
  ctx.fillStyle = '#ff7a1a'; ctx.font = `800 ${22 * hs}px Kanit, sans-serif`; ctx.fillText('เกียร์ ' + (P.gear + 1), cx, cy + r * 0.62);
  if (P.launched && !P.finished && !R.auto && P.gear < PS.ratios.length - 1 && P.rpm >= PS.redline * 0.9) {
    const blink = Math.sin(t * 24) > 0;
    ctx.fillStyle = blink ? '#ff3b3b' : '#7a1d1d'; ctx.font = `900 ${26 * hs}px Kanit, sans-serif`; ctx.fillText('SHIFT!', cx, cy - r - 24 * hs);
  }

  // NOS (กลางล่าง)
  if (PS.nosCharges > 0) {
    ctx.textAlign = 'center'; ctx.font = `700 ${16 * hs}px Kanit, sans-serif`; ctx.fillStyle = '#59b8ff';
    ctx.fillText('NOS ' + '⚡'.repeat(P.nosLeft) + '▫'.repeat(PS.nosCharges - P.nosLeft), W / 2, H - 28 * hs);
    if (P.nosOn) { ctx.fillStyle = '#59b8ff'; ctx.fillRect(W / 2 - 60 * hs, H - 20 * hs, 120 * hs * Math.max(0, P.nosT / PS.nosTime), 5 * hs); }
  }

  // แบนเนอร์กลางจอ
  if (R.bannerT > 0) {
    ctx.globalAlpha = Math.min(1, R.bannerT * 2);
    ctx.textAlign = 'center'; ctx.font = `900 ${32 * hs}px Kanit, sans-serif`;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(R.banner, W / 2, H * 0.3);
    ctx.fillStyle = R.bannerCol; ctx.fillText(R.banner, W / 2, H * 0.3);
    ctx.globalAlpha = 1;
  }
  // หมวดคุมเสียง/ออก ใช้ DOM แล้ว
}

/* ---------- ปุ่มควบคุม (คีย์บอร์ด + สัมผัส) ---------- */
function initRaceControls() {
  const down = e => {
    if (!RC) return;
    const c = e.code;
    if (c === 'Space' || c === 'KeyW') { keys.gas = true; e.preventDefault(); }
    else if (c === 'ArrowUp' || c === 'KeyE' || c === 'ShiftLeft' || c === 'ShiftRight' || c === 'Enter') { if (!e.repeat) keys.shiftT = 0.15; e.preventDefault(); }
    else if (c === 'KeyN' || c === 'ArrowDown' || c === 'KeyQ') { if (!e.repeat) keys.nosT = 0.15; e.preventDefault(); }
    else if (c === 'Escape') { if (!RC.shown) exitRace(); }
  };
  const up = e => { if (!RC) return; if (e.code === 'Space' || e.code === 'KeyW') { keys.gas = false; e.preventDefault(); } };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { keys.gas = false; });

  const bind = (id, on, off) => {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('pointerdown', e => { e.preventDefault(); el.classList.add('down'); Snd.init(); Snd.resume(); on(); });
    const end = () => { el.classList.remove('down'); if (off) off(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointerleave', end); el.addEventListener('pointercancel', end);
  };
  bind('btn-gas', () => { keys.gas = true; }, () => { keys.gas = false; });
  bind('btn-shift', () => { keys.shiftT = 0.15; });
  bind('btn-nos', () => { keys.nosT = 0.15; });
  const quit = document.getElementById('btn-quit');
  if (quit) quit.addEventListener('click', () => { if (RC) exitRace(); });
}
