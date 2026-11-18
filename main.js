'use strict';
/* ============================================================
   WAVE RACE — โรงรถ / ร้านอะไหล่ / รุ่นรถ / Craft / อันดับ / เซฟ
   ============================================================ */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const SAVE_KEY = 'waverace_save_v1';
const API = '/api/leaderboard';

function newPid() { return 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function defaultSave() {
  return {
    money: 3500, mats: { alu: 6, steel: 1, ti: 0 },
    owned: [], crafted: [], craftSeq: 1,
    model: 'wave', models: ['wave'], builds: {}, build: modelDefault('wave'),
    color: '#e63b1f', helmet: '#f5c518',
    best: null, wins: 0, races: 0, auto: false, sound: true, seenIntro: false,
    pid: newPid(), name: '', online: false, board: [], beaten: {}, theme: 'random',
  };
}
function normalizeBuild(build, modelId) {
  const M = MODELS[modelId] || MODELS.wave, d = modelDefault(M.id), out = {};
  for (const slot in d) {
    const p = getPart(build && build[slot], SAVE ? SAVE.crafted : []);
    out[slot] = p && partFits(p, M) ? p.id : d[slot];
  }
  return out;
}
let SAVE = null;
function loadSave() {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (j && j.build) {
      const s = Object.assign(defaultSave(), j);
      s.mats = Object.assign({ alu: 0, steel: 0, ti: 0 }, j.mats);
      if (!MODELS[s.model]) s.model = 'wave';
      if (!Array.isArray(s.models) || !s.models.includes('wave')) s.models = Array.from(new Set(['wave'].concat(s.models || [])));
      if (!s.models.includes(s.model)) s.models.push(s.model);
      s.builds = j.builds || {};
      s.board = Array.isArray(j.board) ? j.board : []; s.beaten = j.beaten || {};
      return s;
    }
  } catch (e) { /* ignore */ }
  return defaultSave();
}
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
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

let curScreen = 'garage';
function showScreen(name) {
  curScreen = name;
  $('#garage').hidden = name !== 'garage';
  $('#race').hidden = name !== 'race';
  $('#topbar').hidden = name === 'race';
  document.body.classList.toggle('in-race', name === 'race');
  if (name === 'garage') startGarageLoop(); else stopGarageLoop();
}

/* ---------- รุ่นรถ / บิลด์ ---------- */
const curModel = () => MODELS[SAVE.model];
function modelBuild(id) { return normalizeBuild(id === SAVE.model ? SAVE.build : (SAVE.builds[id] || modelDefault(id)), id); }
function switchModel(id) {
  if (id === SAVE.model || !MODELS[id]) return;
  SAVE.builds[SAVE.model] = SAVE.build;
  SAVE.model = id; SAVE.build = modelBuild(id);
  hover = null; persist(); renderAll();
}
function buyModel(id) {
  const M = MODELS[id];
  if (SAVE.models.includes(id)) return switchModel(id);
  if (SAVE.money < M.price) { toast('เงินไม่พอ — ไปแข่งหาเงินก่อน!'); return; }
  SAVE.money -= M.price; SAVE.models.push(id);
  toast(`ซื้อ ${M.name} แล้ว!`); switchModel(id);
}

/* ---------- วิเคราะห์สเปก (แคช) ---------- */
const cache = new Map();
function analyze(build, modelId) {
  modelId = modelId || SAVE.model;
  const key = modelId + JSON.stringify(build) + SAVE.crafted.length;
  if (!cache.has(key)) {
    const S = computeStats(build, SAVE.crafted, modelId);
    const est = estimateRun(S, bestLaunchFrac(S));
    cache.set(key, { S, est });
    if (cache.size > 120) cache.delete(cache.keys().next().value);
  }
  return cache.get(key);
}

/* ---------- สถานะโรงรถ ---------- */
let curTab = 'models', hover = null;
const craftSel = { type: 'piston', mat: 'steel', polish: false };
let craftResult = null;

function isOwned(p) { return p.price === 0 || p.crafted || SAVE.owned.includes(p.id); }
function partsFor(slot) {
  const M = curModel();
  return PARTS[slot].concat(SAVE.crafted.filter(c => c.slot === slot)).filter(p => partFits(p, M));
}
/* มุมมองที่กำลังพรีวิว: ลองใส่อะไหล่ หรือ ดูรุ่นอื่น */
function view() {
  if (hover && hover.model) return { build: modelBuild(hover.model), model: hover.model };
  if (hover) return { build: Object.assign({}, SAVE.build, { [hover.slot]: hover.id }), model: SAVE.model };
  return { build: SAVE.build, model: SAVE.model };
}

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
  const vw = view(), A = analyze(vw.build, vw.model), S = A.S;
  // ผนังโรงรถ
  let g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#10162a'); g.addColorStop(0.7, '#1b2138'); g.addColorStop(1, '#0d1019');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,.03)';
  for (let y = 0; y < h * 0.8; y += 14) ctx.fillRect(0, y, w, 6);
  // ป้ายนีออน + ชื่อรุ่น
  ctx.save(); ctx.textAlign = 'left';
  ctx.font = `800 ${Math.max(20, w * 0.045)}px Kanit, sans-serif`;
  ctx.shadowColor = '#ff7a1a'; ctx.shadowBlur = 18 + 6 * Math.sin(t * 3); ctx.fillStyle = '#ffb066';
  ctx.fillText('WAVE RACE', w * 0.04, h * 0.12);
  ctx.shadowColor = '#19e3ff'; ctx.shadowBlur = 12; ctx.fillStyle = '#9ff3ff';
  ctx.font = `600 ${Math.max(11, w * 0.02)}px Kanit, sans-serif`;
  ctx.fillText(`${MODELS[vw.model].name} • ${MODELS[vw.model].type === '2T' ? '2 จังหวะ' : '4 จังหวะ'}`, w * 0.04, h * 0.18);
  ctx.restore();
  // แสงสปอตไลต์จากเพดาน
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let sg = ctx.createRadialGradient(w / 2, h * 0.2, 4, w / 2, h * 0.62, w * 0.5);
  sg.addColorStop(0, 'rgba(255,244,214,.20)'); sg.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
  ctx.restore();
  // พื้น
  const gy = h * 0.82;
  g = ctx.createLinearGradient(0, gy - 6, 0, h); g.addColorStop(0, '#2a2e3c'); g.addColorStop(1, '#0f1119');
  ctx.fillStyle = g; ctx.fillRect(0, gy - 4, w, h - gy + 4);
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, gy - 4, w, 2);
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
  const opts = { x: x0, y: gy + shake, scale: sc, wheelAngle: gAng, blur: revving ? 0.9 : 0, rider: showRider, tuck: revving ? 1 : 0.2, t };
  // เงาสะท้อนบนพื้น
  ctx.save(); ctx.beginPath(); ctx.rect(0, gy, w, h - gy); ctx.clip();
  ctx.translate(0, 2 * gy); ctx.scale(1, -1); ctx.globalAlpha = 0.2;
  drawBike(ctx, V, Object.assign({}, opts, { y: gy }));
  ctx.restore();
  const fg = ctx.createLinearGradient(0, gy, 0, h);
  fg.addColorStop(0, 'rgba(18,20,30,.3)'); fg.addColorStop(0.55, 'rgba(14,16,24,.9)'); fg.addColorStop(1, 'rgba(12,14,20,1)');
  ctx.fillStyle = fg; ctx.fillRect(0, gy, w, h - gy);
  drawBike(ctx, V, Object.assign({}, opts, { hl: hover && hover.slot ? hover.slot : null, flame: revving ? 0.5 + Math.random() * 0.5 : 0 }));
  if (revving) {
    const rpm = 1500 + (S.redline - 1500) * Math.min(1, (1.4 - revT) / 0.7);
    Snd.engine(rpm, 1, true, S.type === '2T');
    if (S.type === '2T' && Math.random() < 0.6) { ctx.fillStyle = 'rgba(240,240,245,.18)'; ctx.beginPath(); ctx.arc(x0 - 6 * sc - Math.random() * 40, gy - 30 * sc - Math.random() * 14, 3 + Math.random() * 5, 0, 7); ctx.fill(); }
  } else if (wasRev) { wasRev = false; Snd.silence(); }
  // vignette
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.4, w / 2, h * 0.55, Math.max(w, h) * 0.8);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

  // inset: ภาพตัดเครื่อง + dyno
  const cc = fitCanvas($('#cutaway')); drawCutaway(cc.ctx, cc.w, cc.h, S.visual, t);
  const dc = fitCanvas($('#dyno'));
  drawDyno(dc.ctx, dc.w, dc.h, S, hover ? analyze(SAVE.build, SAVE.model).S : null);
}

/* ---------- แผงสถิติ ---------- */
function topSpeed(S) { return S.redline / (PRIMARY * S.ratios[S.ratios.length - 1] * S.final) * 2 * Math.PI * S.rw / 60 * 3.6; }
function renderStats() {
  const vw = view(), A = analyze(vw.build, vw.model), S = A.S;
  const B = hover ? analyze(SAVE.build, SAVE.model) : null;
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
  const bandTxt = S.type === '2T' ? ` • ช่วงกำลัง${S.band < 2.4 ? 'กว้าง' : S.band < 3.3 ? 'ปานกลาง' : 'แคบ'} (คุมรอบให้ใกล้ ${Math.round(S.redline * 0.8)} rpm)` : '';
  $('#stats').innerHTML = `
    <div class="eta">
      <div><small>ET ¼ ไมล์ (0.402 กม.) โดยประมาณ</small><b>${A.est.et.toFixed(2)} <span>วิ</span></b>${B ? d(A.est.et, B.est.et, 2, false) : ''}</div>
      <div><small>ความเร็วปลายทาง</small><b>${A.est.trap.toFixed(0)} <span>กม./ชม.</span></b>${B ? d(A.est.trap, B.est.trap, 0, true) : ''}</div>
    </div>
    ${row('แรงม้า', hp.toFixed(1) + ' hp', hp / 55, d(hp, bhp, 1, true))}
    ${row('แรงบิดสูงสุด', S.peakTorque.toFixed(1) + ' Nm', S.peakTorque / 50, d(S.peakTorque, B ? B.S.peakTorque : 0, 1, true))}
    ${row('รอบตัด', S.redline + ' rpm', S.redline / 12000, d(S.redline, B ? B.S.redline : 0, 0, true))}
    ${row('น้ำหนักรวมคนขี่', S.mass.toFixed(1) + ' กก.', 1 - (S.mass - 130) / 60, d(S.mass, B ? B.S.mass : 0, 1, false))}
    ${row('กริป (ยาง+โช้ค)', S.mu.toFixed(2), S.mu / 1.4, d(S.mu, B ? B.S.mu : 0, 2, true))}
    ${row('เบรก', S.brake.toFixed(1) + ' m/s²', S.brake / 10, d(S.brake, B ? B.S.brake : 0, 1, true))}
    ${row('ท็อปสปีด (ทฤษฎี)', topSpeed(S).toFixed(0) + ' กม./ชม.', topSpeed(S) / 190, d(topSpeed(S), B ? topSpeed(B.S) : 0, 0, true))}
    ${row(S.type === '2T' ? 'เสี่ยงลูกสูบตาย' : 'เสี่ยงเครื่องพัง', Math.round(S.risk * 100) + '%', S.risk, d(S.risk * 100, B ? B.S.risk * 100 : 0, 0, false), riskCls)}
    <div class="hint">ใส้ในรับกำลังได้ ~${(S.durCap * 1.341).toFixed(1)} hp • กำลังเครื่อง ${hp.toFixed(1)} hp${S.nosCharges ? ' (+NOS)' : ''}${bandTxt}</div>`;
  const tag = $('#preview-tag');
  if (hover && hover.model) { tag.textContent = `👀 ดูรุ่น: ${MODELS[hover.model].name}`; tag.classList.add('on'); }
  else if (hover) { const p = getPart(hover.id, SAVE.crafted); tag.textContent = `👀 ลองใส่: ${p ? p.name : ''}`; tag.classList.add('on'); }
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
    <div class="ph"><b>${esc(p.name)}</b>${cr}${btn}</div>
    <div class="pd">${esc(p.desc || '')}</div><div class="chips">${eff}</div></div>`;
}
function renderPartsTab(tab) {
  return tab.slots.map(slot => {
    const list = partsFor(slot); if (!list.length) return '';
    const cur = getPart(SAVE.build[slot], SAVE.crafted);
    return `<div class="slot"><h3>${slotLabel(slot, curModel().type)} <small>${cur ? esc(cur.name) : ''}</small></h3>
      <div class="cards">${list.map(p => partCard(slot, p)).join('')}</div></div>`;
  }).join('');
}

/* ---------- แท็บรุ่นรถ ---------- */
function renderModels() {
  return `<div class="explain">เลือกรุ่นรถ — อะไหล่ที่ซื้อแล้ว <b>ย้ายข้ามรุ่นได้</b> (ยกเว้นของเฉพาะ 4T/2T) แต่ละรุ่นมีบิลด์ของตัวเอง<br>
    <b>2 จังหวะ</b>: แรงต่อซีซีสูง น้ำหนักเบา แต่ช่วงกำลังแคบ ต้องคุมเกียร์/รอบให้อยู่ย่านกำลัง และลูกสูบตายง่ายถ้าใส้ในไม่พอ</div>
    <div class="cards">${MODEL_ORDER.map(id => {
      const M = MODELS[id], own = SAVE.models.includes(id), cur = SAVE.model === id;
      const b = modelBuild(id), a = analyze(b, id);
      const btn = cur ? '<span class="tag eq">กำลังใช้</span>' : own ? `<button data-act="use-model" data-id="${id}">ใช้รุ่นนี้</button>`
        : `<button class="buy" data-act="buy-model" data-id="${id}" ${SAVE.money < M.price ? 'disabled' : ''}>ซื้อ ฿${fmtInt(M.price)}</button>`;
      return `<div class="card model ${cur ? 'eq' : ''}" data-model="${id}">
        <div class="ph"><b>${M.name}</b><span class="tag ${M.type === '2T' ? 'two' : 'cr'}">${M.type === '2T' ? '2 จังหวะ' : '4 จังหวะ'}</span>${btn}</div>
        <div class="pd">${M.desc}</div>
        <div class="chips"><span class="chip">${a.S.hp.toFixed(0)} hp</span><span class="chip">${a.S.mass.toFixed(0)} กก.</span><span class="chip">ET ≈ ${a.est.et.toFixed(1)} วิ</span><span class="chip">รอบตัด ${a.S.redline}</span>${M.tags.map(t => `<span class="chip dim">${t}</span>`).join('')}</div></div>`;
    }).join('')}</div>`;
}

/* ---------- โรงกลึง Craft ---------- */
function craftCost(mat) { const m = MATERIALS[mat]; return { cost: m.cost, fee: m.fee + (craftSel.polish ? POLISH_FEE : 0) }; }
function canCraft() {
  const { cost, fee } = craftCost(craftSel.mat);
  if (SAVE.money < fee) return false;
  return Object.keys(cost).every(k => (SAVE.mats[k] || 0) >= cost[k]);
}
function renderCraft() {
  const T = curModel().type;
  const typesHtml = CRAFT_ORDER.map(k => {
    const c = CRAFT_TYPES[k];
    return `<label class="${craftSel.type === k ? 'sel' : ''}" title="${c.blurb}"><input type="radio" name="ct" data-act="craft-type" data-type="${k}" ${craftSel.type === k ? 'checked' : ''}><span>${c.icon}</span> ${c.name[T]}</label>`;
  }).join('');
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
        <div><b>${esc(it.name)}</b><span>${jackpot ? '🎉 สเปกในตำนาน 95/9!' : it.desc}</span>
        <div class="chips">${partEffects(it, it.slot).map(e => `<span class="chip">${e}</span>`).join('')}</div></div></div>`;
    }
  }
  const M = curModel();
  const inv = SAVE.crafted.length ? SAVE.crafted.slice().reverse().map(it => {
    const eq = SAVE.build[it.slot] === it.id, fits = partFits(it, M);
    const btn = eq ? '<span class="tag eq">ติดตั้งอยู่</span>' : fits ? `<button data-act="equip" data-slot="${it.slot}" data-id="${it.id}">ติดตั้ง</button>` : `<span class="tag dim">ใช้กับ ${it.only} เท่านั้น</span>`;
    const sell = eq ? '' : `<button class="sell" data-act="sell" data-id="${it.id}">ขาย ฿${fmtInt(it.sell)}</button>`;
    return `<div class="card owned ${eq ? 'eq' : ''}" ${fits ? `data-slot="${it.slot}" data-id="${it.id}"` : ''}>
      <div class="ph"><b>${esc(it.name)}</b>${btn}${sell}</div>
      <div class="chips">${partEffects(it, it.slot).map(e => `<span class="chip">${e}</span>`).join('')}</div></div>`;
  }).join('') : '<p class="empty">ยังไม่มีของที่ Craft — ลองกลึงดูสิ</p>';
  const T0 = CRAFT_TYPES[craftSel.type];
  return `
    <div class="craft">
      <div class="explain"><b>🔨 โรงกลึง</b> กลึงชิ้นส่วนเองด้วยวัตถุดิบ — ผลลัพธ์แสดงเป็นสเปก <b class="spec-inline">Q/G</b> เช่น <b class="spec-inline">95/9</b><br>
        <b>Q</b> = คุณภาพงานกลึง (%) &nbsp;•&nbsp; <b>G</b> = เกรดวัสดุ 1–9 &nbsp;•&nbsp; G สูง = แรงม้า/รอบ/ความทนสูง, Q สูง = ดึงศักยภาพของเกรดได้เต็มที่<br>
        ชิ้นที่กลึงได้: ลูกสูบ • ก้านสูบ • <b>ข้อเหวี่ยง</b> • แคม/<b>ลิ้นรีด</b> • <b>ท่อไอเสีย/แชมเบอร์</b><br>
        อยากได้ <b>95/9</b> ต้องใช้ไทเทเนียม + ขัดละเอียด และมีดวงนิดหน่อย</div>
      <div class="ctype">${typesHtml}</div>
      <div class="muted small" style="margin:-4px 0 8px">${T0.icon} ${T0.name[T]}: ${T0.blurb}</div>
      <div class="mats">${matsHtml}</div>
      <label class="polish"><input type="checkbox" data-act="craft-polish" ${craftSel.polish ? 'checked' : ''}> ✨ ขัดละเอียด/อบชุบ (+฿${fmtInt(POLISH_FEE)}) — คุณภาพขั้นต่ำ 88%</label>
      <button class="primary big" data-act="craft-go" ${canCraft() ? '' : 'disabled'}>🔥 กลึง${T0.name[T]}! <small>${costTxt} + ฿${fmtInt(fee)}</small></button>
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
    const item = makeCrafted(id, craftSel.type, craftSel.mat, roll.q, roll.g, curModel().type);
    SAVE.crafted.push(item); craftResult = { item };
  }
  persist(); renderAll();
}

/* ---------- อันดับ / ลีก ---------- */
function bestEt() { if (SAVE.board.length) return SAVE.board[0].et; return SAVE.best; }
function ladderRank(et) {
  if (et === null || et === undefined) return null;
  return 1 + OPPONENTS.filter(o => o.est < et).length;
}
function titleFor(rank) {
  const total = OPPONENTS.length + 1;
  const p = (total - rank) / (total - 1);
  return RANK_TITLES[Math.min(RANK_TITLES.length - 1, Math.floor(p * RANK_TITLES.length))];
}
function recordRun(r) {
  const prev = SAVE.board.length ? SAVE.board[0].et : null;
  const prevRank = prev === null ? null : ladderRank(prev);
  SAVE.board.push({ et: +r.et.toFixed(3), trap: +r.trap.toFixed(1), model: r.model, hp: +r.hp.toFixed(1), opp: r.opp, win: !!r.win, date: Date.now() });
  SAVE.board.sort((a, b) => a.et - b.et); SAVE.board = SAVE.board.slice(0, 15);
  const best = SAVE.board[0].et, rank = ladderRank(best);
  const pb = prev === null || r.et < prev - 1e-9;
  submitOnline(r);
  return { pb, rank, total: OPPONENTS.length + 1, rankUp: prevRank && prevRank > rank ? prevRank - rank : 0, title: titleFor(rank) };
}
const online = { status: 'idle', rows: [], t: 0, model: 'all', msg: '' };
async function submitOnline(r) {
  if (!SAVE.online || !SAVE.name) return;
  try {
    const res = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pid: SAVE.pid, name: SAVE.name, et: +r.et.toFixed(3), trap: +r.trap.toFixed(1), model: r.model, hp: +r.hp.toFixed(1) }) });
    online.t = 0;
    if (!res.ok) online.msg = 'ส่งสถิติไม่สำเร็จ (' + res.status + ')';
  } catch (e) { online.msg = 'ออฟไลน์ — ส่งสถิติไม่ได้'; }
}
async function fetchOnline(force) {
  if (!force && Date.now() - online.t < 30000 && online.status === 'ok') return;
  online.status = 'loading'; if (curTab === 'rank') renderPanel();
  try {
    const res = await fetch(API + '?model=' + encodeURIComponent(online.model));
    if (!res.ok) throw new Error(res.status);
    const j = await res.json();
    online.rows = j.rows || []; online.status = 'ok'; online.t = Date.now(); online.msg = '';
  } catch (e) { online.status = 'off'; online.msg = 'กระดานออนไลน์ยังไม่เปิดใช้งาน (ต้อง deploy พร้อม /api และตั้งค่า Upstash)'; }
  if (curTab === 'rank') renderPanel();
}
function renderRank() {
  const best = bestEt(), rank = ladderRank(best), total = OPPONENTS.length + 1;
  const rows = OPPONENTS.map(o => ({ name: o.name, model: o.model, et: o.est, bot: true, id: o.id, color: o.color, beaten: SAVE.beaten[o.name] }));
  if (best !== null) rows.push({ name: (SAVE.name || 'คุณ') + ' (คุณ)', model: SAVE.board[0] ? SAVE.board[0].model : SAVE.model, et: best, me: true });
  rows.sort((a, b) => a.et - b.et);
  const ladder = rows.map((r, i) => `<div class="lrow ${r.me ? 'me' : ''}">
      <span class="lrk">${i + 1}</span>
      <span class="lnm"><b>${esc(r.name)}</b><small>${MODELS[r.model].short}${r.beaten ? ' • ชนะแล้ว ✔' : ''}</small></span>
      <span class="let">${r.et.toFixed(2)}s</span>
      ${r.bot ? `<button data-act="race" data-i="${r.id}">ท้า</button>` : '<span></span>'}</div>`).join('');
  const local = SAVE.board.length ? SAVE.board.map((b, i) => `<div class="lrow"><span class="lrk">${i + 1}</span><span class="lnm"><b>${b.et.toFixed(3)} วิ</b><small>${MODELS[b.model] ? MODELS[b.model].short : ''} • ${b.hp} hp • ${b.trap} กม./ชม. • vs ${esc(b.opp)}</small></span><span class="let">${b.win ? '🏆' : ''}</span><span></span></div>`).join('')
    : '<p class="empty">ยังไม่มีสถิติ — ลงสนามเลย!</p>';
  let onl;
  if (online.status === 'loading') onl = '<p class="empty">กำลังโหลดกระดานออนไลน์…</p>';
  else if (online.status === 'ok') onl = online.rows.length ? online.rows.map((r, i) => `<div class="lrow ${r.pid && r.pid === SAVE.pid ? 'me' : ''}"><span class="lrk">${i + 1}</span><span class="lnm"><b>${esc(r.name)}</b><small>${MODELS[r.model] ? MODELS[r.model].short : r.model} • ${r.hp} hp • ${r.trap} กม./ชม.</small></span><span class="let">${(+r.et).toFixed(3)}s</span><span></span></div>`).join('') : '<p class="empty">ยังไม่มีใครบนกระดาน — เป็นคนแรกเลย!</p>';
  else onl = `<p class="empty">${online.msg || 'กดรีเฟรชเพื่อดูกระดานออนไลน์'}</p>`;
  const modelOpts = ['all'].concat(MODEL_ORDER).map(m => `<option value="${m}" ${online.model === m ? 'selected' : ''}>${m === 'all' ? 'ทุกรุ่น' : MODELS[m].name}</option>`).join('');
  return `<div class="rank">
    <div class="mine">
      <div class="big">${rank ? `#${rank}<small>/${total}</small>` : '—'}</div>
      <div><b>${rank ? titleFor(rank) : 'ยังไม่มีอันดับ'}</b><span>ET ดีที่สุด ${best ? best.toFixed(3) + ' วิ' : '—'} • ชนะ ${SAVE.wins}/${SAVE.races} ครั้ง</span></div>
    </div>
    <h3>🏁 ลีกบอท ${OPPONENTS.length} ตัว</h3>
    <div class="explain small">ตารางจัดอันดับจาก ET ¼ ไมล์ ยิ่งเร็วยิ่งอยู่สูง — ชนะบอทและทำเวลาดีขึ้นเพื่อไต่อันดับ</div>
    <div class="ladder">${ladder}</div>
    <h3>⏱️ สถิติส่วนตัว (Top ${SAVE.board.length || 0})</h3>
    <div class="ladder">${local}</div>
    <h3>🌐 กระดานออนไลน์</h3>
    <div class="onl">
      <input type="text" id="player-name" maxlength="16" placeholder="ชื่อผู้เล่น (ไม่เกิน 16 ตัวอักษร)" value="${esc(SAVE.name)}" data-act="name-in">
      <label class="opt"><input type="checkbox" data-act="opt-online" ${SAVE.online ? 'checked' : ''}> ส่งสถิติของฉันขึ้นกระดานออนไลน์ (ส่งเฉพาะชื่อ รุ่นรถ ET ความเร็ว)</label>
      <div class="onlbar"><select data-act="online-model">${modelOpts}</select><button data-act="online-refresh">🔄 รีเฟรช</button></div>
      ${online.msg && online.status !== 'off' ? `<p class="muted small">${esc(online.msg)}</p>` : ''}
      <div class="ladder">${onl}</div>
    </div></div>`;
}

/* ---------- สี / ตั้งค่า ---------- */
const BIKE_COLORS = ['#e63b1f', '#1e6bff', '#f5c518', '#16a34a', '#f97316', '#a855f7', '#e5e7eb', '#111827', '#ec4899', '#06b6d4'];
function renderPaint() {
  const sw = (arr, key) => arr.map(c => `<button class="sw ${SAVE[key] === c ? 'sel' : ''}" style="background:${c}" data-act="color" data-key="${key}" data-c="${c}" aria-label="${c}"></button>`).join('');
  const themeOpts = [['random', '🎲 สุ่มทุกครั้ง']].concat(THEMES.map(t => [t.id, t.name])).map(([id, n]) => `<option value="${id}" ${SAVE.theme === id ? 'selected' : ''}>${n}</option>`).join('');
  return `<div class="paint">
    <h3>สีตัวถัง</h3><div class="sws">${sw(BIKE_COLORS, 'color')}<input type="color" value="${SAVE.color}" data-act="color-in" data-key="color"></div>
    <h3>สีหมวก</h3><div class="sws">${sw(BIKE_COLORS, 'helmet')}<input type="color" value="${SAVE.helmet}" data-act="color-in" data-key="helmet"></div>
    <h3>ตั้งค่า</h3>
    <label class="opt">🌄 ฉากหลังตอนแข่ง <select data-act="opt-theme">${themeOpts}</select></label>
    <label class="opt"><input type="checkbox" data-act="opt-sound" ${SAVE.sound ? 'checked' : ''}> 🔊 เสียงเครื่องยนต์</label>
    <label class="opt"><input type="checkbox" data-act="opt-auto" ${SAVE.auto ? 'checked' : ''}> 🕹️ โหมดง่าย (เกียร์ออโต้ + เร่งเอง) — ไม่ได้โบนัสชิฟต์</label>
    <h3>สถิติ</h3>
    <p class="muted">แข่งทั้งหมด ${SAVE.races} ครั้ง • ชนะ ${SAVE.wins} ครั้ง • ET ดีที่สุด ${bestEt() ? bestEt().toFixed(3) + ' วิ' : '—'}</p>
    <h3>สำรองเซฟ</h3>
    <p class="muted small">เซฟอัตโนมัติในเบราว์เซอร์เครื่องนี้ — ส่งออกเป็นไฟล์เก็บไว้ หรือย้ายไปเล่นอีกเครื่องได้</p>
    <div class="sws"><button data-act="export">💾 ส่งออกไฟล์เซฟ</button><button data-act="import">📂 นำเข้าไฟล์เซฟ</button></div>
    <input type="file" id="import-file" accept=".json,application/json" hidden>
    <p></p><button class="danger" data-act="reset">ล้างเซฟเริ่มใหม่</button>
    <p class="muted small">⚠️ เกมสมมติเพื่อความบันเทิง — ห้ามซิ่งบนถนนจริงนะน้อง สวมหมวกกันน็อกเสมอ<br>ชื่อยี่ห้ออะไหล่/รุ่นรถในเกมใช้เพื่ออ้างอิงบรรยากาศเท่านั้น สเปกทั้งหมดเป็นค่าสมมติ</p>
  </div>`;
}

/* ---------- เรนเดอร์รวม ---------- */
function renderTopbar() {
  $('#money').textContent = fmtInt(SAVE.money);
  $('#m-alu').textContent = SAVE.mats.alu || 0; $('#m-steel').textContent = SAVE.mats.steel || 0; $('#m-ti').textContent = SAVE.mats.ti || 0;
  const r = ladderRank(bestEt());
  $('#rec').textContent = `🏆 ${SAVE.wins}/${SAVE.races}` + (bestEt() ? ` • ⏱ ${bestEt().toFixed(2)}s` : '') + (r ? ` • #${r}` : '');
  $('#btn-sound').textContent = SAVE.sound ? '🔊' : '🔇';
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(t => `<button class="${curTab === t.id ? 'on' : ''}" data-tab="${t.id}">${t.label}</button>`).join('');
}
function renderPanel() {
  const tab = TABS.find(t => t.id === curTab);
  const el = $('#panel'), keep = el.scrollTop;
  const ae = document.activeElement, typing = ae && ae.id === 'player-name';
  if (typing) return;
  el.innerHTML = curTab === 'craft' ? renderCraft() : curTab === 'paint' ? renderPaint() : curTab === 'rank' ? renderRank() : curTab === 'models' ? renderModels() : renderPartsTab(tab);
  el.scrollTop = keep;
}
function renderAll() { renderTopbar(); renderTabs(); renderPanel(); renderStats(); }

function setHover(h) {
  const same = (hover && h && hover.id === h.id && hover.model === h.model) || (!hover && !h);
  if (same) return;
  hover = h;
  $$('#panel .card').forEach(c => c.classList.toggle('hov', !!h && ((h.id && c.dataset.id === h.id) || (h.model && c.dataset.model === h.model))));
  renderStats();
}

/* ---------- เลือกคู่แข่ง ---------- */
function openRaceSelect() {
  const me = analyze(SAVE.build, SAVE.model);
  const rows = OPPONENTS.map(o => {
    const a = analyze(o.build, o.model);
    return `<div class="opp" style="--c:${o.color}">
      <div><b>${o.id + 1}. ${esc(o.name)}</b>${SAVE.beaten[o.name] ? ' <span class="tag eq">ชนะแล้ว ✔</span>' : ''}<small>${esc(o.tag)}</small>
        <div class="chips"><span class="chip">${MODELS[o.model].short}</span><span class="chip">ET ≈ ${o.est.toFixed(2)} วิ</span><span class="chip">${a.S.hp.toFixed(0)} hp</span>${a.S.nosCharges ? '<span class="chip">มี NOS</span>' : ''}</div></div>
      <div class="oppr"><div class="prize">฿${fmtInt(o.prize)}</div><button class="primary" data-act="race" data-i="${o.id}">ลงสนาม</button></div></div>`;
  }).join('');
  const r = ladderRank(bestEt());
  showModal(`<h2>🏁 เลือกคู่ต่อสู้</h2>
    <p class="muted">${curModel().name} ET ≈ <b>${me.est.et.toFixed(2)} วิ</b> • เสี่ยง${curModel().type === '2T' ? 'ลูกสูบตาย' : 'เครื่องพัง'} <b>${Math.round(me.S.risk * 100)}%</b>${r ? ` • อันดับ <b>#${r}</b>/${OPPONENTS.length + 1}` : ''}</p>
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
    <h1>WAVE<span>RACE</span></h1><p class="tagline">ทริปน้ำไม่อาบ • ซิ่งทางตรง ¼ ไมล์</p>
    <p>เริ่มจาก <b>Honda Wave</b> หาเงินจากการแข่ง ซื้ออะไหล่ (โช้ค Öhlins, เบรก Brembo ฯลฯ) หรือกลึง Craft ชิ้นส่วนสเปกโหด <b>95/9</b> แล้วซื้อรถ 2 จังหวะ <b>LS125 / Serpico / KR150</b> ไปไต่ลีกบอท 15 ตัว!</p>
    <ul>
      <li>🔧 เลือกอะไหล่แล้ว <b>ดูตัวรถเปลี่ยนจริง</b> (ชี้เมาส์/แตะเพื่อลองใส่)</li>
      <li>🏁 ค้าง <b>Space</b> เร่งเครื่องตอนไฟแดง → ปล่อยตอนไฟเขียว → <b>↑ / Shift</b> เปลี่ยนเกียร์ตอนเข็มเข้าโซนแดง</li>
      <li>⚡ กด <b>N</b> ใช้ NOS • บนมือถือมีปุ่มบนจอ</li>
    </ul>
    <p class="muted small">⚠️ เกมสมมติเพื่อความบันเทิง ห้ามซิ่งบนถนนจริง</p>
    <div class="btns"><button class="primary big" data-act="start">เข้าอู่ 🛵</button></div></div>`,
  () => { SAVE.seenIntro = true; persist(); Snd.init(); Snd.resume(); closeModal(); });
}

/* ---------- สำรอง / กู้เซฟ ---------- */
function exportSave() {
  const blob = new Blob([JSON.stringify({ game: 'wave-race', v: 2, save: SAVE }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'wave-race-save.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('ส่งออกไฟล์เซฟแล้ว');
}
function importSave(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const j = JSON.parse(rd.result), s = j && j.save;
      if (!j || j.game !== 'wave-race' || !s || !s.build || typeof s.money !== 'number') throw new Error('bad');
      localStorage.setItem(SAVE_KEY, JSON.stringify(s)); SAVE = loadSave();
      SAVE.build = normalizeBuild(SAVE.build, SAVE.model);
      SAVE.seenIntro = true; cache.clear(); hover = null; persist(); renderAll(); toast('นำเข้าเซฟสำเร็จ');
    } catch (e) { toast('ไฟล์เซฟไม่ถูกต้อง'); }
  };
  rd.readAsText(file);
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
    if (curTab === 'rank') fetchOnline(false);
  });
  const panel = $('#panel');
  panel.addEventListener('mouseover', e => {
    const c = e.target.closest('.card[data-slot],.card[data-model]');
    if (!c) return;
    if (c.dataset.model) { if (c.dataset.model !== SAVE.model) setHover({ model: c.dataset.model }); else setHover(null); }
    else if (!c.classList.contains('eq')) setHover({ slot: c.dataset.slot, id: c.dataset.id }); else setHover(null);
  });
  panel.addEventListener('mouseleave', () => setHover(null));
  panel.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (btn && btn.tagName !== 'INPUT' && btn.tagName !== 'SELECT') {
      const a = btn.dataset.act;
      if (a === 'equip') equip(btn.dataset.slot, btn.dataset.id);
      else if (a === 'buy') buyPart(btn.dataset.slot, btn.dataset.id);
      else if (a === 'buy-model') buyModel(btn.dataset.id);
      else if (a === 'use-model') switchModel(btn.dataset.id);
      else if (a === 'craft-mat') { craftSel.mat = btn.dataset.mat; renderPanel(); }
      else if (a === 'craft-go') doCraft();
      else if (a === 'race') startRace(+btn.dataset.i);
      else if (a === 'online-refresh') fetchOnline(true);
      else if (a === 'buy-mat') {
        const m = MATERIALS[btn.dataset.mat]; e.stopPropagation();
        if (SAVE.money >= m.price) { SAVE.money -= m.price; SAVE.mats[btn.dataset.mat]++; persist(); renderAll(); }
      } else if (a === 'sell') {
        const it = SAVE.crafted.find(c => c.id === btn.dataset.id);
        if (it && SAVE.build[it.slot] !== it.id) { SAVE.money += it.sell; SAVE.crafted = SAVE.crafted.filter(c => c !== it); persist(); toast(`ขาย ${it.name} ได้ ฿${fmtInt(it.sell)}`); renderAll(); }
      } else if (a === 'color') { SAVE[btn.dataset.key] = btn.dataset.c; persist(); renderPanel(); }
      else if (a === 'export') exportSave();
      else if (a === 'import') $('#import-file').click();
      else if (a === 'reset') { if (confirm('ล้างเซฟทั้งหมดและเริ่มใหม่?')) { const keepName = SAVE.name; SAVE = defaultSave(); SAVE.name = keepName; SAVE.seenIntro = true; cache.clear(); persist(); hover = null; curTab = 'models'; renderAll(); } }
      return;
    }
    const card = e.target.closest('.card[data-slot],.card[data-model]');
    if (card) {
      if (card.dataset.model) { if (card.dataset.model !== SAVE.model) setHover({ model: card.dataset.model }); }
      else if (!card.classList.contains('eq')) setHover({ slot: card.dataset.slot, id: card.dataset.id });
    }
  });
  panel.addEventListener('change', e => {
    const el = e.target, a = el.dataset.act;
    if (el.id === 'import-file') { importSave(el.files[0]); el.value = ''; return; }
    if (!a) return;
    if (a === 'craft-type') { craftSel.type = el.dataset.type; craftResult = null; renderPanel(); }
    else if (a === 'craft-polish') { craftSel.polish = el.checked; renderPanel(); }
    else if (a === 'color-in') { SAVE[el.dataset.key] = el.value; persist(); }
    else if (a === 'opt-sound') { SAVE.sound = el.checked; Snd.on = SAVE.sound; persist(); renderTopbar(); }
    else if (a === 'opt-auto') { SAVE.auto = el.checked; persist(); }
    else if (a === 'opt-theme') { SAVE.theme = el.value; persist(); }
    else if (a === 'opt-online') { SAVE.online = el.checked; persist(); if (el.checked && !SAVE.name) toast('ใส่ชื่อผู้เล่นก่อนนะ'); }
    else if (a === 'online-model') { online.model = el.value; fetchOnline(true); }
    else if (a === 'name-in') { SAVE.name = el.value.replace(/[<>]/g, '').trim().slice(0, 16); persist(); renderTopbar(); }
  });
  panel.addEventListener('input', e => {
    const a = e.target.dataset.act;
    if (a === 'color-in') SAVE[e.target.dataset.key] = e.target.value;
    else if (a === 'name-in') { SAVE.name = e.target.value.replace(/[<>]/g, '').slice(0, 16); persist(); }
  });
  panel.addEventListener('focusout', e => { if (e.target.id === 'player-name') renderPanel(); });

  $('#btn-race').addEventListener('click', openRaceSelect);
  $('#btn-sound').addEventListener('click', () => { SAVE.sound = !SAVE.sound; Snd.on = SAVE.sound; if (!SAVE.sound) Snd.silence(); persist(); renderTopbar(); });
  $('#btn-rider').addEventListener('click', e => { showRider = !showRider; e.currentTarget.classList.toggle('on', showRider); });
  $('#btn-rev').addEventListener('pointerdown', () => { Snd.init(); Snd.resume(); revT = 1.4; });
}

function boot() {
  SAVE = loadSave();
  SAVE.build = normalizeBuild(SAVE.build, SAVE.model);
  initLadder();
  Snd.on = SAVE.sound;
  bindEvents(); initRaceControls();
  showScreen('garage'); renderAll();
  if (!SAVE.seenIntro) showIntro();
}
window.addEventListener('DOMContentLoaded', boot);
