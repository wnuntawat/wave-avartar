'use strict';
/* ============================================================
   WAVE RACE — โรงรถ / ร้านอะไหล่ / Craft / เซฟเกม / เมนู
   ============================================================ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const SAVE_KEY = 'waverace_save_v1';

function defaultSave() {
  return {
    money: 3500, mats: { alu: 6, steel: 1, ti: 0 },
    owned: Object.values(DEFAULT_BUILD), crafted: [], craftSeq: 1,
    build: Object.assign({}, DEFAULT_BUILD),
    color: '#e63b1f', helmet: '#f5c518',
    best: null, wins: 0, races: 0, auto: false, sound: true, seenIntro: false,
  };
}
function loadSave() {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (j && j.build) {
      const s = Object.assign(defaultSave(), j);
      s.mats = Object.assign({ alu: 0, steel: 0, ti: 0 }, j.mats);
      s.build = Object.assign({}, DEFAULT_BUILD, j.build);
      return s;
    }
  } catch (e) { /* ignore */ }
  return defaultSave();
}
let SAVE = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* ignore */ } }

/* ---------- ยูทิลิตี้ ---------- */
function fitCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth, h = c.clientHeight;
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
let toastTimer = 0;
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
let modalAct = null;
function showModal(html, onAct) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  m.hidden = false; modalAct = onAct || null;
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; modalAct = null; }

let curScreen = 'garage';
function showScreen(name) {
  curScreen = name;
  $('#garage').hidden = name !== 'garage';
  $('#race').hidden = name !== 'race';
  $('#topbar').hidden = name === 'race';
  if (name === 'garage') startGarageLoop(); else stopGarageLoop();
}

/* ---------- วิเคราะห์สเปก (แคช) ---------- */
const cache = new Map();
function analyze(build) {
  const key = JSON.stringify(build);
  if (!cache.has(key)) {
    const S = computeStats(build, SAVE.crafted);
    const est = estimateRun(S, bestLaunchFrac(S));
    cache.set(key, { S, est });
    if (cache.size > 80) cache.delete(cache.keys().next().value);
  }
  return cache.get(key);
}

/* ---------- สถานะโรงรถ ---------- */
let curTab = 'engine', hover = null;
const craftSel = { type: 'piston', mat: 'steel', polish: false };
let craftResult = null;

function isOwned(p) { return p.price === 0 || p.crafted || SAVE.owned.includes(p.id); }
function partsFor(slot) { return PARTS[slot].concat(SAVE.crafted.filter(c => c.slot === slot)); }
function previewBuild() { return hover ? Object.assign({}, SAVE.build, { [hover.slot]: hover.id }) : SAVE.build; }

function equip(slot, id) { SAVE.build[slot] = id; hover = null; persist(); renderAll(); }
function buyPart(slot, id) {
  const p = getPart(id, SAVE.crafted);
  if (!p) return;
  if (SAVE.money < p.price) { toast('เงินไม่พอ — ไปแข่งหาเงินก่อน!'); return; }
  SAVE.money -= p.price; SAVE.owned.push(id);
  toast(`ซื้อ ${p.name} แล้ว`); equip(slot, id);
}

/* ---------- วาดโรงรถ ---------- */
let gRunning = false, gLast = 0, gAng = 0, showRider = false, revT = 0, wasRev = false;
function startGarageLoop() { if (gRunning) return; gRunning = true; gLast = performance.now(); requestAnimationFrame(garageLoop); }
function stopGarageLoop() { gRunning = false; Snd.silence(); }
function garageLoop(ts) {
  if (!gRunning) return;
  const dt = Math.min(0.05, (ts - gLast) / 1000 || 0.016); gLast = ts;
  drawGarage(ts / 1000, dt);
  requestAnimationFrame(garageLoop);
}
function drawGarage(t, dt) {
  const { ctx, w, h } = fitCanvas($('#preview'));
  const A = analyze(previewBuild()), S = A.S;
  // ผนังโรงรถ
  let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#141a2b'); g.addColorStop(0.7, '#1c2238'); g.addColorStop(1, '#0d1019');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.035)';
  for (let y = 0; y < h * 0.8; y += 14) ctx.fillRect(0, y, w, 6);
  // ป้ายนีออน
  ctx.save(); ctx.textAlign = 'left';
  ctx.font = `800 ${Math.max(20, w * 0.045)}px Kanit, sans-serif`;
  ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 18 + 6 * Math.sin(t * 3); ctx.fillStyle = '#ffb066';
  ctx.fillText('WAVE RACE', w * 0.04, h * 0.12);
  ctx.shadowColor = '#19e3ff'; ctx.shadowBlur = 12; ctx.fillStyle = '#9ff3ff';
  ctx.font = `600 ${Math.max(11, w * 0.02)}px Kanit, sans-serif`;
  ctx.fillText('อู่ทริปน้ำไม่อาบ • แต่งเวฟ 24 ชม.', w * 0.04, h * 0.18);
  ctx.restore();
  // พื้น
  const gy = h * 0.82;
  g = ctx.createLinearGradient(0, gy - 6, 0, h); g.addColorStop(0, '#272b38'); g.addColorStop(1, '#10121a');
  ctx.fillStyle = g; ctx.fillRect(0, gy - 4, w, h - gy + 4);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(w * 0.2, gy + 22, 60, 8, 0, 0, 7); ctx.fill();
  // กองยาง
  ctx.fillStyle = '#0b0c10';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(w * 0.93, gy - 8 - i * 16, 34, 9, 0, 0, 7); ctx.fill(); ctx.fillRect(w * 0.93 - 34, gy - 8 - i * 16, 68, 14); }

  // รถ
  const sc = Math.min(w * 0.6 / 218, h * 0.6 / 150);
  const x0 = w / 2 - 75 * sc;
  if (revT > 0) { revT -= dt; wasRev = true; }
  const revving = revT > 0;
  gAng += (revving ? 38 : 1.4) * dt;
  const shake = revving ? Math.sin(t * 90) * 1.2 : 0;
  const V = Object.assign({}, S.visual, { color: SAVE.color, helmet: SAVE.helmet });
  drawBike(ctx, V, {
    x: x0, y: gy + shake, scale: sc, wheelAngle: gAng, rider: showRider, tuck: revving ? 1 : 0.2,
    hl: hover ? hover.slot : null, t, flame: revving ? 0.5 + Math.random() * 0.5 : 0,
  });
  if (revving) {
    const rpm = 1500 + (S.redline - 1500) * Math.min(1, (1.4 - revT) / 0.7);
    Snd.engine(rpm, 1, true);
  } else if (wasRev) { wasRev = false; Snd.silence(); }

  // inset: ภาพตัดเครื่อง + dyno
  const cc = fitCanvas($('#cutaway')); drawCutaway(cc.ctx, cc.w, cc.h, S.visual, t);
  const dc = fitCanvas($('#dyno'));
  drawDyno(dc.ctx, dc.w, dc.h, S, hover ? analyze(SAVE.build).S : null);
}

/* ---------- แผงสถิติ ---------- */
function topSpeed(S) { return S.redline / (PRIMARY * S.ratios[S.ratios.length - 1] * S.final) * 2 * Math.PI * S.rw / 60 * 3.6; }
function renderStats() {
  const A = analyze(previewBuild()), S = A.S;
  const B = hover ? analyze(SAVE.build) : null;
  const d = (v, bv, dec, goodHigher) => {
    if (!B) return '';
    const diff = v - bv; if (Math.abs(diff) < Math.pow(10, -dec) / 2) return '';
    const good = goodHigher ? diff > 0 : diff < 0;
    return `<em class="${good ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff.toFixed(dec)}</em>`;
  };
  const row = (label, val, pct, delta, cls) =>
    `<div class="st"><div class="sl">${label}</div><div class="sbar"><i class="${cls || ''}" style="width:${Math.max(2, Math.min(100, pct * 100))}%"></i></div><div class="sv">${val} ${delta}</div></div>`;
  const hp = S.hp, bhp = B ? B.S.hp : 0;
  const riskCls = S.risk > 0.4 ? 'bad' : S.risk > 0.05 ? 'warn' : 'ok';
  $('#stats').innerHTML = `
    <div class="eta">
      <div><small>ET ¼ ไมล์ (0.402 กม.) โดยประมาณ</small><b>${A.est.et.toFixed(2)} <span>วิ</span></b>${B ? d(A.est.et, B.est.et, 2, false) : ''}</div>
      <div><small>ความเร็วปลายทาง</small><b>${A.est.trap.toFixed(0)} <span>กม./ชม.</span></b>${B ? d(A.est.trap, B.est.trap, 0, true) : ''}</div>
    </div>
    ${row('แรงม้า', hp.toFixed(1) + ' hp', hp / 32, d(hp, bhp, 1, true))}
    ${row('แรงบิดสูงสุด', S.peakTorque.toFixed(1) + ' Nm', S.peakTorque / 30, d(S.peakTorque, B ? B.S.peakTorque : 0, 1, true))}
    ${row('รอบตัด', S.redline + ' rpm', S.redline / 12000, d(S.redline, B ? B.S.redline : 0, 0, true))}
    ${row('น้ำหนักรวมคนขี่', S.mass.toFixed(1) + ' กก.', 1 - (S.mass - 130) / 45, d(S.mass, B ? B.S.mass : 0, 1, false))}
    ${row('กริปยาง', S.mu.toFixed(2), S.mu / 1.4, d(S.mu, B ? B.S.mu : 0, 2, true))}
    ${row('เบรก', S.brake.toFixed(1) + ' m/s²', S.brake / 10, d(S.brake, B ? B.S.brake : 0, 1, true))}
    ${row('ท็อปสปีด (ทฤษฎี)', topSpeed(S).toFixed(0) + ' กม./ชม.', topSpeed(S) / 190, d(topSpeed(S), B ? topSpeed(B.S) : 0, 0, true))}
    ${row('เสี่ยงเครื่องพัง', Math.round(S.risk * 100) + '%', S.risk, d(S.risk * 100, B ? B.S.risk * 100 : 0, 0, false), riskCls)}
    <div class="hint">ภายในรับกำลังได้ ~${(S.durCap * 1.341).toFixed(1)} hp • กำลังเครื่อง ${hp.toFixed(1)} hp${S.nosCharges ? ' (+NOS)' : ''}</div>`;
  const tag = $('#preview-tag');
  if (hover) { const p = getPart(hover.id, SAVE.crafted); tag.textContent = `👀 ลองใส่: ${p ? p.name : ''}`; tag.classList.add('on'); }
  else tag.classList.remove('on');
}

/* ---------- แผงอะไหล่ ---------- */
function partCard(slot, p) {
  const owned = isOwned(p), eq = SAVE.build[slot] === p.id;
  const eff = partEffects(p, slot).map(e => `<span class="chip">${e}</span>`).join('');
  let btn;
  if (eq) btn = '<span class="tag eq">ติดตั้งอยู่</span>';
  else if (owned) btn = `<button data-act="equip" data-slot="${slot}" data-id="${p.id}">ติดตั้ง</button>`;
  else btn = `<button class="buy" data-act="buy" data-slot="${slot}" data-id="${p.id}" ${SAVE.money < p.price ? 'disabled' : ''}>ซื้อ ฿${fmtInt(p.price)}</button>`;
  const cr = p.crafted ? '<span class="tag cr">CRAFT</span>' : '';
  return `<div class="card ${eq ? 'eq' : ''} ${owned ? 'owned' : ''} ${hover && hover.id === p.id ? 'hov' : ''}" data-slot="${slot}" data-id="${p.id}">
    <div class="ph"><b>${p.name}</b>${cr}${btn}</div>
    <div class="pd">${p.desc || ''}</div><div class="chips">${eff}</div></div>`;
}
function renderPartsTab(tab) {
  return tab.slots.map(slot => {
    const cur = getPart(SAVE.build[slot], SAVE.crafted);
    return `<div class="slot"><h3>${SLOT_INFO[slot].label} <small>${cur ? cur.name : ''}</small></h3>
      <div class="cards">${partsFor(slot).map(p => partCard(slot, p)).join('')}</div></div>`;
  }).join('');
}

/* ---------- โรงกลึง Craft ---------- */
function craftCost(mat) {
  const m = MATERIALS[mat]; return { cost: m.cost, fee: m.fee + (craftSel.polish ? POLISH_FEE : 0) };
}
function canCraft() {
  const { cost, fee } = craftCost(craftSel.mat);
  if (SAVE.money < fee) return false;
  return Object.keys(cost).every(k => (SAVE.mats[k] || 0) >= cost[k]);
}
function renderCraft() {
  const matsHtml = Object.keys(MATERIALS).map(k => {
    const m = MATERIALS[k], sel = craftSel.mat === k;
    const cost = Object.keys(m.cost).map(c => `${MATERIALS[c].icon}${m.cost[c]}`).join(' + ');
    return `<div class="mat ${sel ? 'sel' : ''}" data-act="craft-mat" data-mat="${k}">
      <div class="mh"><b>${m.icon} ${m.name}</b><span>เกรด ${m.grade[0]}–${m.grade[1]}</span></div>
      <div class="md">ใช้ ${cost} + ฿${fmtInt(m.fee)}<br>โอกาสพัง ${Math.round(m.fail * 100)}%</div>
      <div class="have">มี ${SAVE.mats[k] || 0} • <button data-act="buy-mat" data-mat="${k}" ${SAVE.money < m.price ? 'disabled' : ''}>ซื้อ 1 หน่วย ฿${fmtInt(m.price)}</button></div></div>`;
  }).join('');
  const { cost, fee } = craftCost(craftSel.mat);
  const costTxt = Object.keys(cost).map(c => `${MATERIALS[c].icon} ${MATERIALS[c].name} ×${cost[c]}`).join(', ');
  let res = '';
  if (craftResult) {
    if (craftResult.fail) res = `<div class="cres fail"><b>💥 ชิ้นงานร้าว!</b><span>กลึงพลาด วัตถุดิบเสียหมด ลองใหม่นะ</span></div>`;
    else {
      const it = craftResult.item, jackpot = it.q >= 95 && it.g >= 9;
      res = `<div class="cres ok ${jackpot ? 'jack' : ''}"><div class="spec">${it.q}<i>/</i>${it.g}</div>
        <div><b>${it.name}</b><span>${jackpot ? '🎉 สเปกในตำนาน 95/9!' : it.desc}</span>
        <div class="chips">${partEffects(it, it.slot).map(e => `<span class="chip">${e}</span>`).join('')}</div></div></div>`;
    }
  }
  const inv = SAVE.crafted.length ? SAVE.crafted.slice().reverse().map(it => {
    const eq = SAVE.build[it.slot] === it.id;
    return `<div class="card owned ${eq ? 'eq' : ''}" data-slot="${it.slot}" data-id="${it.id}">
      <div class="ph"><b>${it.name}</b>${eq ? '<span class="tag eq">ติดตั้งอยู่</span>' : `<button data-act="equip" data-slot="${it.slot}" data-id="${it.id}">ติดตั้ง</button><button class="sell" data-act="sell" data-id="${it.id}">ขาย ฿${fmtInt(it.sell)}</button>`}</div>
      <div class="chips">${partEffects(it, it.slot).map(e => `<span class="chip">${e}</span>`).join('')}</div></div>`;
  }).join('') : '<p class="empty">ยังไม่มีของที่ Craft — ลองกลึงดูสิ</p>';
  return `
    <div class="craft">
      <div class="explain"><b>🔨 โรงกลึง</b> กลึงลูกสูบ/ก้านสูบเองด้วยวัตถุดิบ — ผลลัพธ์แสดงเป็นสเปก <b class="spec-inline">Q/G</b> เช่น <b class="spec-inline">95/9</b><br>
        <b>Q</b> = คุณภาพงานกลึง (%) &nbsp;•&nbsp; <b>G</b> = เกรดวัสดุ 1–9 &nbsp;•&nbsp; G สูง = แรงม้า/รอบ/ความทนสูง, Q สูง = ดึงศักยภาพของเกรดได้เต็มที่<br>
        อยากได้ <b>95/9</b> ต้องใช้ไทเทเนียม + ขัดละเอียด และมีดวงนิดหน่อย</div>
      <div class="ctype">
        <label class="${craftSel.type === 'piston' ? 'sel' : ''}"><input type="radio" name="ct" data-act="craft-type" data-type="piston" ${craftSel.type === 'piston' ? 'checked' : ''}> 🛢️ ลูกสูบ</label>
        <label class="${craftSel.type === 'conrod' ? 'sel' : ''}"><input type="radio" name="ct" data-act="craft-type" data-type="conrod" ${craftSel.type === 'conrod' ? 'checked' : ''}> 🔗 ก้านสูบ</label>
      </div>
      <div class="mats">${matsHtml}</div>
      <label class="polish"><input type="checkbox" data-act="craft-polish" ${craftSel.polish ? 'checked' : ''}> ✨ ขัดละเอียด/อบชุบ (+฿${fmtInt(POLISH_FEE)}) — คุณภาพขั้นต่ำ 88%</label>
      <button class="primary big" data-act="craft-go" ${canCraft() ? '' : 'disabled'}>🔥 กลึง${craftSel.type === 'piston' ? 'ลูกสูบ' : 'ก้านสูบ'}! <small>${costTxt} + ฿${fmtInt(fee)}</small></button>
      ${res}
      <h3 class="invh">คลังของ Craft</h3>
      <div class="cards">${inv}</div>
    </div>`;
}
function doCraft() {
  if (!canCraft()) { toast('วัตถุดิบหรือเงินไม่พอ'); return; }
  const { cost, fee } = craftCost(craftSel.mat);
  for (const k in cost) SAVE.mats[k] -= cost[k];
  SAVE.money -= fee;
  const roll = craftRoll(craftSel.type, craftSel.mat, craftSel.polish);
  if (roll.fail) craftResult = { fail: true };
  else {
    const id = 'c_' + (SAVE.craftSeq++);
    const item = makeCrafted(id, craftSel.type, craftSel.mat, roll.q, roll.g);
    SAVE.crafted.push(item); craftResult = { item };
  }
  persist(); renderAll();
}

/* ---------- สี / ตั้งค่า ---------- */
const BIKE_COLORS = ['#e63b1f', '#1e6bff', '#f5c518', '#16a34a', '#f97316', '#a855f7', '#e5e7eb', '#111827', '#ec4899', '#06b6d4'];
function renderPaint() {
  const sw = (arr, key) => arr.map(c => `<button class="sw ${SAVE[key] === c ? 'sel' : ''}" style="background:${c}" data-act="color" data-key="${key}" data-c="${c}" aria-label="${c}"></button>`).join('');
  return `<div class="paint">
    <h3>สีตัวถัง</h3><div class="sws">${sw(BIKE_COLORS, 'color')}<input type="color" value="${SAVE.color}" data-act="color-in" data-key="color"></div>
    <h3>สีหมวก</h3><div class="sws">${sw(BIKE_COLORS, 'helmet')}<input type="color" value="${SAVE.helmet}" data-act="color-in" data-key="helmet"></div>
    <h3>ตั้งค่า</h3>
    <label class="opt"><input type="checkbox" data-act="opt-sound" ${SAVE.sound ? 'checked' : ''}> 🔊 เสียงเครื่องยนต์</label>
    <label class="opt"><input type="checkbox" data-act="opt-auto" ${SAVE.auto ? 'checked' : ''}> 🕹️ โหมดง่าย (เกียร์ออโต้ + เร่งเอง) — ไม่ได้โบนัสชิฟต์</label>
    <h3>สถิติ</h3>
    <p class="muted">แข่งทั้งหมด ${SAVE.races} ครั้ง • ชนะ ${SAVE.wins} ครั้ง • ET ดีที่สุด ${SAVE.best ? SAVE.best.toFixed(3) + ' วิ' : '—'}</p>
    <button class="danger" data-act="reset">ล้างเซฟเริ่มใหม่</button>
    <p class="muted small">⚠️ เกมสมมติเพื่อความบันเทิง — ห้ามซิ่งบนถนนจริงนะน้อง สวมหมวกกันน็อกเสมอ</p>
  </div>`;
}

/* ---------- เรนเดอร์รวม ---------- */
function renderTopbar() {
  $('#money').textContent = fmtInt(SAVE.money);
  $('#m-alu').textContent = SAVE.mats.alu || 0; $('#m-steel').textContent = SAVE.mats.steel || 0; $('#m-ti').textContent = SAVE.mats.ti || 0;
  $('#rec').textContent = `🏆 ${SAVE.wins}/${SAVE.races}` + (SAVE.best ? ` • ⏱ ${SAVE.best.toFixed(2)}s` : '');
  $('#btn-sound').textContent = SAVE.sound ? '🔊' : '🔇';
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(t => `<button class="${curTab === t.id ? 'on' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');
}
function renderPanel() {
  const tab = TABS.find(t => t.id === curTab);
  const el = $('#panel'), keep = el.scrollTop;
  el.innerHTML = curTab === 'craft' ? renderCraft() : curTab === 'paint' ? renderPaint() : renderPartsTab(tab);
  el.scrollTop = keep;
}
function renderAll() { renderTopbar(); renderTabs(); renderPanel(); renderStats(); }

function setHover(h) {
  if ((hover && h && hover.id === h.id) || (!hover && !h)) return;
  hover = h;
  $$('#panel .card').forEach(c => c.classList.toggle('hov', !!h && c.dataset.id === h.id));
  renderStats();
}

/* ---------- เลือกคู่แข่ง ---------- */
function openRaceSelect() {
  const me = analyze(SAVE.build);
  const rows = OPPONENTS.map(o => {
    const a = analyze(o.build);
    return `<div class="opp" style="--c:${o.color}">
      <div><b>${o.name}</b><small>${o.tag}</small>
        <div class="chips"><span class="chip">ET ≈ ${a.est.et.toFixed(2)} วิ</span><span class="chip">${a.S.hp.toFixed(0)} hp</span><span class="chip">${a.S.nosCharges ? 'มี NOS' : 'ไม่มี NOS'}</span></div></div>
      <div class="oppr"><div class="prize">฿${fmtInt(o.prize)}</div><button class="primary" data-act="race" data-i="${o.id}">ลงสนาม</button></div></div>`;
  }).join('');
  showModal(`<h2>🏁 เลือกคู่ต่อสู้</h2>
    <p class="muted">รถคุณ ET ≈ <b>${me.est.et.toFixed(2)} วิ</b> • เสี่ยงเครื่องพัง <b>${Math.round(me.S.risk * 100)}%</b> • สนาม ¼ ไมล์ = 0.402 กม.</p>
    <label class="opt"><input type="checkbox" id="auto-chk" ${SAVE.auto ? 'checked' : ''}> 🕹️ โหมดง่าย (เกียร์ออโต้ + เร่งเอง)</label>
    <div class="opps">${rows}</div>
    <div class="btns"><button data-act="close">ปิด</button></div>`,
  (act, el) => {
    if (act === 'close') closeModal();
    else if (act === 'race') { SAVE.auto = $('#auto-chk').checked; persist(); startRace(+el.dataset.i); }
  });
}

function showIntro() {
  showModal(`<div class="intro">
    <h1>WAVE<span>RACE</span></h1><p class="tagline">ทริปน้ำไม่อาบ • ซิ่งเวฟทางตรง ¼ ไมล์</p>
    <p>เริ่มจากเวฟเดิมๆ หาเงินจากการแข่ง <b>ซื้ออะไหล่แต่ง</b> หรือ <b>กลึง Craft ลูกสูบ/ก้านสูบ</b> สเปกสุดโหดอย่าง <b>95/9</b> แล้วไปล้มตำนานราชดำเนิน</p>
    <ul>
      <li>🔧 เลือกอะไหล่แล้ว <b>ดูตัวรถเปลี่ยนจริง</b> (เอาเมาส์ชี้เพื่อลองใส่)</li>
      <li>🏁 ค้าง <b>Space</b> เร่งเครื่องตอนไฟแดง → ปล่อยตอนไฟเขียว → กด <b>↑ / Shift</b> เปลี่ยนเกียร์ตอนเข็มเข้าโซนแดง</li>
      <li>⚡ กด <b>N</b> ใช้ NOS • บนมือถือมีปุ่มบนจอ</li>
    </ul>
    <p class="muted small">⚠️ เกมสมมติเพื่อความบันเทิง ห้ามซิ่งบนถนนจริง</p>
    <div class="btns"><button class="primary big" data-act="start">เข้าอู่ 🛵</button></div></div>`,
  () => { SAVE.seenIntro = true; persist(); Snd.init(); Snd.resume(); closeModal(); });
}

/* ---------- เหตุการณ์ ---------- */
function bindEvents() {
  $('#modal').addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (el && modalAct) modalAct(el.dataset.act, el);
  });
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    curTab = b.dataset.tab; hover = null; renderAll();
  });
  const panel = $('#panel');
  panel.addEventListener('mouseover', e => {
    const c = e.target.closest('.card[data-slot]');
    if (c && !c.classList.contains('eq')) setHover({ slot: c.dataset.slot, id: c.dataset.id }); else if (c) setHover(null);
  });
  panel.addEventListener('mouseleave', () => setHover(null));
  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (btn) {
      const a = btn.dataset.act;
      if (a === 'equip') equip(btn.dataset.slot, btn.dataset.id);
      else if (a === 'buy') buyPart(btn.dataset.slot, btn.dataset.id);
      else if (a === 'craft-mat') { craftSel.mat = btn.dataset.mat; renderPanel(); }
      else if (a === 'craft-go') doCraft();
      else if (a === 'buy-mat') {
        const m = MATERIALS[btn.dataset.mat]; e.stopPropagation();
        if (SAVE.money >= m.price) { SAVE.money -= m.price; SAVE.mats[btn.dataset.mat]++; persist(); renderAll(); }
      } else if (a === 'sell') {
        const it = SAVE.crafted.find(c => c.id === btn.dataset.id);
        if (it && SAVE.build[it.slot] !== it.id) { SAVE.money += it.sell; SAVE.crafted = SAVE.crafted.filter(c => c !== it); persist(); toast(`ขาย ${it.name} ได้ ฿${fmtInt(it.sell)}`); renderAll(); }
      } else if (a === 'color') { SAVE[btn.dataset.key] = btn.dataset.c; persist(); renderPanel(); }
      else if (a === 'reset') { if (confirm('ล้างเซฟทั้งหมดและเริ่มใหม่?')) { SAVE = defaultSave(); SAVE.seenIntro = true; cache.clear(); persist(); hover = null; curTab = 'engine'; renderAll(); } }
      return;
    }
    const card = e.target.closest('.card[data-slot]');
    if (card && !card.classList.contains('eq')) setHover({ slot: card.dataset.slot, id: card.dataset.id });
  });
  panel.addEventListener('change', e => {
    const el = e.target, a = el.dataset.act; if (!a) return;
    if (a === 'craft-type') { craftSel.type = el.dataset.type; craftResult = null; renderPanel(); }
    else if (a === 'craft-polish') { craftSel.polish = el.checked; renderPanel(); }
    else if (a === 'color-in') { SAVE[el.dataset.key] = el.value; persist(); }
    else if (a === 'opt-sound') { SAVE.sound = el.checked; Snd.on = SAVE.sound; persist(); renderTopbar(); }
    else if (a === 'opt-auto') { SAVE.auto = el.checked; persist(); }
  });
  panel.addEventListener('input', e => { if (e.target.dataset.act === 'color-in') { SAVE[e.target.dataset.key] = e.target.value; } });

  $('#btn-race').addEventListener('click', openRaceSelect);
  $('#btn-sound').addEventListener('click', () => { SAVE.sound = !SAVE.sound; Snd.on = SAVE.sound; if (!SAVE.sound) Snd.silence(); persist(); renderTopbar(); });
  $('#btn-rider').addEventListener('click', e => { showRider = !showRider; e.currentTarget.classList.toggle('on', showRider); });
  $('#btn-rev').addEventListener('pointerdown', () => { Snd.init(); Snd.resume(); revT = 1.4; });
}

function boot() {
  Snd.on = SAVE.sound;
  bindEvents(); initRaceControls();
  showScreen('garage'); renderAll();
  if (!SAVE.seenIntro) showIntro();
}
window.addEventListener('DOMContentLoaded', boot);
