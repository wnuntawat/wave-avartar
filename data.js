'use strict';
/* ============================================================
   WAVE RACE — ข้อมูลอะไหล่ / สถิติรถ / ระบบ Craft / คู่แข่ง
   ============================================================ */
const G_ACCEL = 9.81;
const QUARTER_M = 402.336;      // ¼ ไมล์ = 402.336 เมตร = 0.402 กม.
const PRIMARY = 4.058;          // อัตราทดปฐมภูมิ Wave
const WHEEL_R = 0.285;          // รัศมีล้อหลัง (เมตร)
const BASE_MASS = 98 + 62;      // รถ + คนขี่ (kg)

const SLOT_INFO = {
  engine:  { label: 'เครื่อง / บล็อก' },
  piston:  { label: 'ลูกสูบ' },
  conrod:  { label: 'ก้านสูบ' },
  cam:     { label: 'แคม' },
  carb:    { label: 'คาร์บู / หัวฉีด' },
  exhaust: { label: 'ท่อไอเสีย' },
  gearbox: { label: 'เกียร์' },
  sprocket:{ label: 'สเตอร์ (โซ่-สเตอร์)' },
  nos:     { label: 'NOS' },
  wheel:   { label: 'ล้อ' },
  tire:    { label: 'ยาง' },
  brake:   { label: 'เบรก' },
  body:    { label: 'ชุดสี / แฟริ่ง' },
};

const TABS = [
  { id: 'engine',  label: '🔧 เครื่องยนต์', slots: ['engine', 'piston', 'conrod', 'cam', 'carb', 'exhaust'] },
  { id: 'drive',   label: '⚡ ส่งกำลัง',    slots: ['gearbox', 'sprocket', 'nos'] },
  { id: 'chassis', label: '🛞 ช่วงล่าง',    slots: ['wheel', 'tire', 'brake', 'body'] },
  { id: 'craft',   label: '🔨 โรงกลึง Craft' },
  { id: 'paint',   label: '🎨 สี / ตั้งค่า' },
];

/* จุดบนตัวรถที่ไฮไลต์ตอน preview (พิกัดรถ: ล้อหลังแตะพื้นที่ 0,0) */
const SLOT_ANCHOR = {
  engine: [86, -50], piston: [100, -56], conrod: [70, -44], cam: [104, -66], carb: [92, -72],
  exhaust: [30, -26], gearbox: [62, -40], sprocket: [0, -34], nos: [8, -104],
  wheel: [150, -34], tire: [150, -3], brake: [150, -34], body: [44, -86],
};

const PARTS = {
  engine: [
    { id: 'e110', name: 'เครื่องเดิม 110cc', price: 0,     cc: 110, red: 8800,  dur: 40, wt: 0, v: 'stock', desc: 'เครื่องโรงงาน ทนทานตามสไตล์ฮอนด้า' },
    { id: 'e125', name: 'บล็อก 125cc',       price: 2500,  cc: 125, red: 9200,  dur: 42, wt: 1, v: 'b125',  desc: 'ขยายความจุ ลูกโตขึ้นเล็กน้อย' },
    { id: 'e143', name: 'บล็อก 143cc 56mm',  price: 6500,  cc: 143, red: 9700,  dur: 44, wt: 2, v: 'b143',  desc: 'ลูกโต สายซิ่งหมู่บ้าน' },
    { id: 'e150', name: 'บล็อก 150cc 58mm',  price: 11000, cc: 150, red: 10200, dur: 46, wt: 3, v: 'b150',  desc: 'ลูกโตสายแข่ง รอบจัด' },
    { id: 'e190', name: 'บล็อก 190cc 66mm',  price: 24000, cc: 190, red: 10800, dur: 52, wt: 6, v: 'b190',  desc: 'บล็อกยักษ์ แรงจนต้องกลึงใส้ในเอง' },
  ],
  piston: [
    { id: 'p0', name: 'ลูกสูบเดิม',               price: 0,    pw: 0,    dur: 30, red: 0,   v: 'cast',   col: '#a9a39a', desc: 'ลูกสูบหล่อมาตรฐาน' },
    { id: 'p1', name: 'ลูกสูบฟอร์จ',              price: 1200, pw: 0.04, dur: 34, red: 0,   v: 'forged', col: '#c9a24a', desc: 'ฟอร์จขึ้นรูป แข็งแรงขึ้น' },
    { id: 'p2', name: 'ลูกสูบแต่ง เสื้อสั้น',      price: 3200, pw: 0.07, dur: 38, red: 200, v: 'forged', col: '#e0c070', desc: 'น้ำหนักเบา ขึ้นรอบไว' },
  ],
  conrod: [
    { id: 'r0', name: 'ก้านสูบเดิม',              price: 0,    pw: 0,     dur: 30, red: 0,   col: '#8a8f97', desc: 'ก้านเดิมโรงงาน' },
    { id: 'r1', name: 'ก้านสูบเสริมเหล็ก',         price: 1000, pw: 0.015, dur: 36, red: 0,   col: '#9aa3ad', desc: 'หนาขึ้น ทนขึ้น' },
    { id: 'r2', name: 'ก้านสูบ H-beam ชุบแข็ง',    price: 2800, pw: 0.03,  dur: 44, red: 200, col: '#5aa0d6', desc: 'ทนรอบจัดและแรงดันสูง' },
  ],
  cam: [
    { id: 'm0', name: 'แคมเดิม',               price: 0,    pw: 0,    red: 0,   v: 'stock', desc: 'แคมโรงงาน' },
    { id: 'm1', name: 'แคมลูกเล็ก รอบกลาง',    price: 1500, pw: 0.06, red: 300, v: 'm1',    desc: 'ดึงรอบกลางดี ขับง่าย' },
    { id: 'm2', name: 'แคมสนาม รอบปลาย',       price: 3500, pw: 0.11, red: 600, v: 'm2',    desc: 'ไปสุดทางรอบปลาย ต้องคุมคันเร่งดีๆ' },
  ],
  carb: [
    { id: 'f0', name: 'คาร์บูเดิม',            price: 0,    pw: 0,    v: 'f0', desc: 'คาร์บูโรงงาน' },
    { id: 'f1', name: 'คาร์บู 24mm + กรองเปลือย', price: 800,  pw: 0.05, v: 'f1', desc: 'ปากใหญ่ขึ้น หายใจคล่อง' },
    { id: 'f2', name: 'PWK 28mm',              price: 2200, pw: 0.09, v: 'f2', desc: 'คาร์บูสายแข่ง ไฟแรง' },
    { id: 'f3', name: 'หัวฉีด 30mm + กล่อง ECU', price: 5200, pw: 0.13, v: 'f3', desc: 'จ่ายน้ำมันแม่นยำที่สุด' },
  ],
  exhaust: [
    { id: 'x0', name: 'ท่อเดิม',                price: 0,    pw: 0,    wt: 0,  v: 'stock',  desc: 'เงียบ สุภาพ (น่าเบื่อ)' },
    { id: 'x1', name: 'ท่อสนามปลายเปิด',        price: 1500, pw: 0.05, wt: -1, v: 'race',   desc: 'ไส้โล่ง เสียงเริ่มดัง' },
    { id: 'x2', name: 'ท่อปากแตร (ปี้นนน)',     price: 3200, pw: 0.09, wt: -2, v: 'horn',   desc: 'เสียงดังไปถึงหมู่บ้านถัดไป' },
    { id: 'x3', name: 'ท่อคาร์บอน คอไทเทเนียม', price: 6500, pw: 0.13, wt: -3, v: 'carbon', desc: 'เบา แรง คอไหม้สีรุ้ง' },
  ],
  gearbox: [
    { id: 'g0', name: 'เกียร์เดิม 4 สปีด',        price: 0,     ratios: [2.833, 1.875, 1.364, 1.043], shift: 0.17, desc: 'เข้าเกียร์นุ่ม ช้านิดนึง' },
    { id: 'g1', name: 'เกียร์ชิด 4 สปีด',          price: 2400,  ratios: [2.75, 1.95, 1.5, 1.2],        shift: 0.13, desc: 'ช่วงเกียร์ถี่ รอบไม่ตก' },
    { id: 'g2', name: 'เกียร์ 5 สปีดสายแข่ง',      price: 6000,  ratios: [2.9, 2.0, 1.55, 1.27, 1.05],  shift: 0.11, desc: 'เพิ่มอีกเกียร์ ต่อเนื่องกว่า' },
    { id: 'g3', name: 'เกียร์ซีเควนเชียล ควิกชิฟ', price: 11000, ratios: [2.9, 2.0, 1.55, 1.27, 1.05],  shift: 0.06, desc: 'ชิฟต์ไม่ต้องตัดไฟ เกือบไม่เสียเวลา' },
  ],
  sprocket: [
    { id: 's5', name: 'สเตอร์ 14/28 ปลายยาวสุด',      price: 600, final: 28 / 14, desc: 'ท็อปสปีดสูงสุด เหมาะรถแรงม้าเยอะ' },
    { id: 's6', name: 'สเตอร์ 14/30 ปลายยาว',         price: 550, final: 30 / 14, desc: 'ปลายยาว ออกตัวหนักขึ้นหน่อย' },
    { id: 's4', name: 'สเตอร์ 14/32',                 price: 500, final: 32 / 14, desc: 'ทดกลางๆ ค่อนไปทางปลายยาว' },
    { id: 's0', name: 'สเตอร์ 14/35 (เดิม)',          price: 0,   final: 35 / 14, desc: 'ทดเดิมจากโรงงาน' },
    { id: 's1', name: 'สเตอร์ 14/38',                 price: 600, final: 38 / 14, desc: 'ออกตัวไวขึ้น แต่ท็อปสปีดลด' },
    { id: 's2', name: 'สเตอร์ 14/41',                 price: 600, final: 41 / 14, desc: 'ทดต้น เหมาะรถแรงม้าน้อย' },
    { id: 's3', name: 'สเตอร์ 13/42 สนาม',            price: 800, final: 42 / 13, desc: 'ทดสุดๆ กระชากหัวทิ่ม ท็อปสปีดตัน' },
  ],
  nos: [
    { id: 'n0', name: 'ไม่มี NOS',                price: 0,    charges: 0, nosPw: 0,    nosTime: 0,   desc: 'ขับด้วยใจล้วนๆ' },
    { id: 'n1', name: 'NOS ขวดเล็ก 1 ช็อต',       price: 4000, charges: 1, nosPw: 0.25, nosTime: 2.0, desc: 'ช็อตเดียวต้องใช้ให้ถูกที่', wt: 3 },
    { id: 'n2', name: 'NOS ขวดใหญ่ 2 ช็อต',       price: 8500, charges: 2, nosPw: 0.35, nosTime: 2.5, desc: 'เครื่องต้องแข็งพอนะ', wt: 5 },
  ],
  wheel: [
    { id: 'w0', name: 'ล้อซี่ลวดเดิม',         price: 0,    wt: 0,    v: 'wire', rim: '#b8bcc4', desc: 'ล้อซี่ลวดคลาสสิก' },
    { id: 'w1', name: 'ล้อแม็ก 5 ก้าน',        price: 2500, wt: -2,   v: 'mag5', rim: '#d3d7de', desc: 'เบากว่า สวยกว่า' },
    { id: 'w2', name: 'ล้อแม็กเบา 7 ก้านสีทอง', price: 5500, wt: -3.5, v: 'mag7', rim: '#e5b53a', desc: 'ทองแวววับ น้ำหนักเบา' },
    { id: 'w3', name: 'ล้อ CNC ฟอร์จเบา',       price: 9500, wt: -5,   v: 'cnc',  rim: '#35b6ff', desc: 'ล้อสายแข่ง สีน้ำเงินอโนไดซ์' },
  ],
  tire: [
    { id: 't0', name: 'ยางเดิม',              price: 0,    mu: 0.80, v: 'stock',  desc: 'ยางถนน' },
    { id: 't1', name: 'ยางเรเดียลหน้าแคบ',    price: 1400, mu: 0.95, v: 'radial', desc: 'เกาะดีขึ้นมาก' },
    { id: 't2', name: 'ยางสลิกสนาม',           price: 3600, mu: 1.12, v: 'slick',  desc: 'เกาะสุดๆ ถ้ายางร้อน' },
    { id: 't3', name: 'ยางสลิกเรซซิ่งหลังบิ๊ก', price: 7000, mu: 1.25, v: 'slick',  desc: 'ยางแข่งตัวท็อป' },
  ],
  brake: [
    { id: 'b0', name: 'ดรัมเบรกเดิม',            price: 0,    brake: 5.2, v: 'drum',    desc: 'ชะลอแบบใจเย็น' },
    { id: 'b1', name: 'ดิสก์เดี่ยวหน้า',         price: 1500, brake: 6.8, v: 'disc',    desc: 'หยุดไวขึ้น' },
    { id: 'b2', name: 'ดิสก์เจาะรู ปั๊ม 4 พอต',   price: 3500, brake: 8.2, v: 'drilled', desc: 'ไม่ลืมเบรกหลังเส้นชัย' },
    { id: 'b3', name: 'ดิสก์คู่ หน้า-หลัง',       price: 6000, brake: 9.2, v: 'dual', wt: 1, desc: 'หยุดนิ่งแน่นอน' },
  ],
  body: [
    { id: 'k0', name: 'ชุดสีเดิม',              price: 0,    cda: 0.55, wt: 0,  v: 'stock',   desc: 'ชุดสีโรงงาน มีท้ายใหญ่' },
    { id: 'k1', name: 'ชุดสีแต่ง ท้ายสั้น',      price: 1200, cda: 0.52, wt: -2, v: 'short',   desc: 'ตัดท้าย ลดน้ำหนัก' },
    { id: 'k2', name: 'แฟริ่งเต็ม + ท้ายเป็ด',   price: 3500, cda: 0.42, wt: 1,  v: 'fairing', desc: 'ลดแรงต้านลมท้ายๆ ระยะ' },
    { id: 'k3', name: 'ชุดคาร์บอนทั้งคัน',       price: 9000, cda: 0.44, wt: -6, v: 'carbon',  desc: 'เบา แรงต้านต่ำ ลายเคฟล่า' },
  ],
};
for (const slot in PARTS) {
  PARTS[slot] = PARTS[slot].map(p => Object.assign({ pw: 0, dur: 0, red: 0, wt: 0, slot }, p));
}

const DEFAULT_BUILD = {
  engine: 'e110', piston: 'p0', conrod: 'r0', cam: 'm0', carb: 'f0', exhaust: 'x0',
  gearbox: 'g0', sprocket: 's0', nos: 'n0', wheel: 'w0', tire: 't0', brake: 'b0', body: 'k0',
};

/* ---------------- ระบบ Craft ----------------
   สเปกของที่ Craft = Q/G  เช่น 95/9
   Q = คุณภาพงานกลึง (%)   G = เกรดวัสดุ (1–9)                */
const MATERIALS = {
  alu:   { name: 'อลูมิเนียม', icon: '🥄', col: '#cfd6dd', grade: [1, 3], cost: { alu: 4 },            fee: 300,  fail: 0.03, price: 120 },
  steel: { name: 'เหล็กกล้า',  icon: '🔩', col: '#8892a0', grade: [3, 6], cost: { steel: 4, alu: 2 },   fee: 900,  fail: 0.07, price: 350 },
  ti:    { name: 'ไทเทเนียม',  icon: '💎', col: '#6ea8ff', grade: [6, 9], cost: { ti: 5, steel: 2 },    fee: 2500, fail: 0.14, price: 1300 },
};
const POLISH_FEE = 800;   // ขัดละเอียด/อบชุบ: ดัน Q ขั้นต่ำเป็น 88%

function makeCrafted(id, slot, mat, q, g) {
  const m = MATERIALS[mat], qf = q / 100, isP = slot === 'piston';
  const pw = (isP ? 0.018 : 0.009) * g * (0.5 + 0.5 * qf);
  const dur = Math.round(isP ? 24 + g * 4.2 * (0.4 + 0.6 * qf) : 26 + g * 4.6 * (0.4 + 0.6 * qf));
  const red = Math.round((isP ? 40 : 30) * g * qf);
  return {
    id, slot, mat, q, g, crafted: true, price: 0, wt: 0,
    name: `${isP ? 'ลูกสูบ' : 'ก้านสูบ'}${m.name} ${q}/${g}`,
    pw, dur, red, v: 'crafted', col: m.col,
    desc: `งานกลึงมือ • คุณภาพ ${q}% • เกรด ${g}`,
    sell: Math.round(q * g * 6),
  };
}
function craftRoll(slot, mat, polish) {
  const m = MATERIALS[mat];
  if (Math.random() < m.fail) return { fail: true };
  const g = m.grade[0] + Math.floor(Math.random() * (m.grade[1] - m.grade[0] + 1));
  const q = Math.round(polish ? 88 + Math.random() * 11 : 68 + Math.random() * 27);
  return { fail: false, q, g };
}

/* ---------------- ค้นหาอะไหล่ ---------------- */
function getPart(id, crafted) {
  if (!id) return null;
  if (id[0] === 'c' && id[1] === '_') return (crafted || []).find(c => c.id === id) || null;
  for (const s in PARTS) { const p = PARTS[s].find(x => x.id === id); if (p) return p; }
  return null;
}

/* ---------------- คำนวณสถิติรถ ---------------- */
function computeStats(build, crafted) {
  const P = {};
  for (const slot in SLOT_INFO) P[slot] = getPart(build[slot], crafted) || PARTS[slot][0];
  const cc = P.engine.cc;
  const pwSum = P.piston.pw + P.conrod.pw + P.cam.pw + P.carb.pw + P.exhaust.pw;
  const powerKw = cc * 0.066 * (1 + pwSum);
  const redline = P.engine.red + P.cam.red + P.piston.red + P.conrod.red;
  let mass = BASE_MASS;
  for (const s of ['engine', 'exhaust', 'wheel', 'brake', 'body', 'nos']) mass += P[s].wt || 0;
  const mu = P.tire.mu;
  const durCap = (P.engine.dur + P.piston.dur + P.conrod.dur) * 0.095;   // กำลังสูงสุดที่ภายในทนได้ (kW)
  const nosStress = P.nos.charges ? 1 + P.nos.nosPw * 0.4 : 1;
  const stress = powerKw * nosStress / durCap;
  const risk = Math.max(0, Math.min(0.92, (stress - 1) * 1.1));
  const S = {
    P, cc, powerKw, hp: powerKw * 1.341, redline, mass, mu,
    cda: P.body.cda, final: P.sprocket.final, ratios: P.gearbox.ratios, shiftTime: P.gearbox.shift,
    brake: Math.min(P.brake.brake, mu * G_ACCEL * 0.95),
    nosCharges: P.nos.charges || 0, nosPw: P.nos.nosPw || 0, nosTime: P.nos.nosTime || 0,
    durCap, stress, risk, rw: WHEEL_R, eff: 0.88,
    visual: {
      cc, engineV: P.engine.v, camV: P.cam.v, carbV: P.carb.v, exhaustV: P.exhaust.v,
      wheelV: P.wheel.v, rimColor: P.wheel.rim || '#b8bcc4', tireV: P.tire.v, brakeV: P.brake.v,
      bodyV: P.body.v, nos: P.nos.charges || 0, final: P.sprocket.final,
      piston: P.piston, conrod: P.conrod,
    },
  };
  S.peakTorque = 0;
  for (let r = 2500; r <= redline; r += 250) S.peakTorque = Math.max(S.peakTorque, torqueAt(S, r, false));
  return S;
}

/* เส้นโค้งกำลัง (kW) ตามรอบ */
function powerAt(s, rpm, nosOn) {
  const peak = s.redline * 0.8;
  const x = rpm / peak;
  const shape = x <= 1 ? Math.max(0.18, 1 - 1.3 * (1 - x) * (1 - x)) : Math.max(0.35, 1 - 3 * (x - 1) * (x - 1));
  return s.powerKw * shape * (nosOn ? 1 + s.nosPw : 1);
}
function torqueAt(s, rpm, nosOn) {
  const w = Math.max(rpm, 1500) * Math.PI / 30;
  return powerAt(s, rpm, nosOn) * 1000 / w;
}

/* ข้อความคุณสมบัติของอะไหล่ */
function partEffects(p, slot) {
  const o = [];
  if (p.cc) o.push(`${p.cc}cc`, `รอบตัด ${p.red}`, `ทน ${p.dur}`);
  else {
    if (p.pw) o.push(`+${(p.pw * 100).toFixed(p.pw < 0.1 ? 1 : 0)}% แรงม้า`);
    if (p.dur && (slot === 'piston' || slot === 'conrod')) o.push(`ทน ${p.dur}`);
    if (p.red) o.push(`+${p.red} rpm`);
  }
  if (p.wt) o.push(`${p.wt > 0 ? '+' : ''}${p.wt} kg`);
  if (p.mu) o.push(`กริป ${p.mu.toFixed(2)}`);
  if (p.cda) o.push(`แรงต้านลม ${p.cda}`);
  if (p.brake) o.push(`เบรก ${p.brake} m/s²`);
  if (p.ratios) o.push(`${p.ratios.length} สปีด`, `ชิฟต์ ${p.shift}s`);
  if (p.final) o.push(`ทด ${p.final.toFixed(2)}`);
  if (p.charges) o.push(`${p.charges} ช็อต`, `+${Math.round(p.nosPw * 100)}% 2–2.5s`);
  return o;
}

/* ---------------- คู่แข่ง ---------------- */
const OPPONENTS = [
  { id: 0, name: 'น้องบอม หลังโรงเรียน', tag: 'เวฟเดิมๆ ซิ่งตอนเลิกเรียน', color: '#3aa0ff', prize: 600, rt: 0.30, shiftPt: 0.90, launch: 0.50, nosAt: 9999,
    build: {}, drops: { alu: [1, 3], steel: [0, 0], ti: [0, 0] } },
  { id: 1, name: 'พี่แต๊ก ปากซอย', tag: 'เครื่อง 125 ท่อดังหน่อย', color: '#2fd36b', prize: 1500, rt: 0.24, shiftPt: 0.93, launch: 0.55, nosAt: 9999,
    build: { engine: 'e125', exhaust: 'x1', sprocket: 's6', carb: 'f1' }, drops: { alu: [2, 4], steel: [0, 1], ti: [0, 0] } },
  { id: 2, name: 'เสือเขาใหญ่', tag: 'สายโค้งก็ซิ่งทางตรงได้', color: '#f5c518', prize: 3400, rt: 0.20, shiftPt: 0.95, launch: 0.58, nosAt: 9999,
    build: { engine: 'e143', piston: 'p1', conrod: 'r1', cam: 'm1', carb: 'f2', exhaust: 'x2', sprocket: 's5', wheel: 'w1', tire: 't1', brake: 'b1' },
    drops: { alu: [1, 3], steel: [1, 2], ti: [0, 0] } },
  { id: 3, name: 'หัวหน้าแก๊ง ทริปน้ำไม่อาบ', tag: 'ไม่อาบน้ำมา 3 วัน แต่เครื่องแรงมาก', color: '#ff7a1a', prize: 7500, rt: 0.17, shiftPt: 0.96, launch: 0.60, nosAt: 50,
    build: { engine: 'e150', piston: 'p2', conrod: 'r2', cam: 'm2', carb: 'f2', exhaust: 'x3', gearbox: 'g2', sprocket: 's5', nos: 'n1', wheel: 'w2', tire: 't2', brake: 'b2', body: 'k1' },
    drops: { alu: [0, 2], steel: [2, 3], ti: [0, 1] } },
  { id: 4, name: 'ตำนานราชดำเนิน', tag: '190cc ติด NOS ไม่เคยแพ้ใคร', color: '#b44bff', prize: 16000, rt: 0.15, shiftPt: 0.97, launch: 0.62, nosAt: 40,
    build: { engine: 'e190', piston: 'p2', conrod: 'r2', cam: 'm2', carb: 'f3', exhaust: 'x3', gearbox: 'g3', sprocket: 's5', nos: 'n2', wheel: 'w3', tire: 't3', brake: 'b3', body: 'k3' },
    drops: { alu: [0, 0], steel: [1, 3], ti: [1, 3] } },
];
OPPONENTS.forEach(o => { o.build = Object.assign({}, DEFAULT_BUILD, o.build); });

function fmtInt(n) { return Math.round(n).toLocaleString('th-TH'); }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
