'use strict';
/* ============================================================
   WAVE RACE — รุ่นรถ / อะไหล่ / สถิติ / ระบบ Craft / ลีกบอท 15 ตัว
   (ตัวเลขทั้งหมดเป็นค่าสมมติของเกม ไม่ใช่สเปกจริงของผู้ผลิต)
   ============================================================ */
const G_ACCEL = 9.81;
const QUARTER_M = 402.336;      // ¼ ไมล์ = 402.336 เมตร = 0.402 กม.
const PRIMARY = 4.058;
const WHEEL_R = 0.285;
const RIDER_MASS = 62;
const DUR_K = 0.07125;

/* ---------------- รุ่นรถ ---------------- */
const MODELS = {
  wave: { id: 'wave', name: 'Honda Wave', short: 'Wave', type: '4T', price: 0, mass: 98, stockEngine: 'e110', stockGear: 'g0',
    desc: 'รถในตำนานเด็กแว้น 4 จังหวะ ทนทาน แต่งง่าย เริ่มต้นกำลังน้อย', tags: ['4 จังหวะ', 'ทนทาน', 'เริ่มง่าย'] },
  ls: { id: 'ls', name: 'Honda LS125', short: 'LS125', type: '2T', price: 14000, mass: 97, stockEngine: 'ls125', stockGear: 'gt0',
    desc: '2 จังหวะเสียงแหลม เบา ออกตัวไว ช่วงกำลังแคบ ต้องคุมรอบให้อยู่ในย่าน', tags: ['2 จังหวะ', 'เบา', 'ควันขาว'] },
  sp: { id: 'sp', name: 'Kawasaki Serpico 150', short: 'Serpico', type: '2T', price: 34000, mass: 111, stockEngine: 'sp150', stockGear: 'gt0',
    desc: 'สปอร์ต 2 จังหวะเครื่อง 150cc ตัวหนักแต่ล้อลอยง่าย เสียงแหลมคม', tags: ['2 จังหวะ', '150cc', 'แรงบิดดี'] },
  kr: { id: 'kr', name: 'Kawasaki KR150', short: 'KR150', type: '2T', price: 42000, mass: 106, stockEngine: 'kr150', stockGear: 'gt0',
    desc: 'ตำนานสนามสูบเดียว 2 จังหวะ แรงจนเครื่องเดิมก็ต้องระวังลูกสูบตาย', tags: ['2 จังหวะ', 'แรงสุด', 'เสี่ยงลูกตาย'] },
};
const MODEL_ORDER = ['wave', 'ls', 'sp', 'kr'];

const SLOT_INFO = {
  engine:  { label: 'เครื่อง / บล็อก' },
  crank:   { label: 'ข้อเหวี่ยง' },
  piston:  { label: 'ลูกสูบ' },
  conrod:  { label: 'ก้านสูบ' },
  cam:     { label: 'แคม', label2T: 'ลิ้นรีด (Reed Valve)' },
  carb:    { label: 'คาร์บู / หัวฉีด' },
  exhaust: { label: 'ท่อไอเสีย', label2T: 'ท่อแชมเบอร์ (Expansion Chamber)' },
  gearbox: { label: 'เกียร์' },
  clutch:  { label: 'คลัตช์' },
  sprocket:{ label: 'สเตอร์ (โซ่-สเตอร์)' },
  nos:     { label: 'NOS' },
  shock:   { label: 'โช้คอัพ หน้า-หลัง' },
  wheel:   { label: 'ล้อ' },
  tire:    { label: 'ยาง' },
  brake:   { label: 'เบรก' },
  body:    { label: 'ชุดสี / แฟริ่ง' },
};
function slotLabel(slot, type) { const s = SLOT_INFO[slot]; return type === '2T' && s.label2T ? s.label2T : s.label; }

const TABS = [
  { id: 'models',  label: '🏍️ รุ่นรถ' },
  { id: 'engine',  label: '🔧 เครื่องยนต์', slots: ['engine', 'crank', 'piston', 'conrod', 'cam', 'carb', 'exhaust'] },
  { id: 'drive',   label: '⚡ ส่งกำลัง',    slots: ['gearbox', 'clutch', 'sprocket', 'nos'] },
  { id: 'chassis', label: '🛞 ช่วงล่าง',    slots: ['shock', 'wheel', 'tire', 'brake', 'body'] },
  { id: 'craft',   label: '🔨 โรงกลึง Craft' },
  { id: 'rank',    label: '🏆 อันดับ' },
  { id: 'paint',   label: '🎨 สี / ตั้งค่า' },
];

const SLOT_ANCHOR = {
  engine: [86, -50], crank: [66, -44], piston: [100, -56], conrod: [72, -46], cam: [104, -66], carb: [92, -72],
  exhaust: [30, -26], gearbox: [62, -40], clutch: [64, -44], sprocket: [0, -34], nos: [8, -104],
  shock: [14, -62], wheel: [150, -34], tire: [150, -3], brake: [150, -34], body: [44, -86],
};

/* ---------------- อะไหล่ ---------------- */
const PARTS = {
  engine: [
    { id: 'e110', name: 'เครื่องเดิม 110cc', price: 0, cc: 110, red: 8800, dur: 40, models: ['wave'], v: 'stock', desc: 'เครื่องโรงงาน ทนทานตามสไตล์ฮอนด้า' },
    { id: 'e125', name: 'บล็อก 125cc',       price: 2500,  cc: 125, red: 9200,  dur: 42, wt: 1, models: ['wave'], v: 'b125', desc: 'ขยายความจุ ลูกโตขึ้นเล็กน้อย' },
    { id: 'e143', name: 'บล็อก 143cc 56mm',  price: 6500,  cc: 143, red: 9700,  dur: 44, wt: 2, models: ['wave'], v: 'b143', desc: 'ลูกโต สายซิ่งหมู่บ้าน' },
    { id: 'e150', name: 'บล็อก 150cc 58mm',  price: 11000, cc: 150, red: 10200, dur: 46, wt: 3, models: ['wave'], v: 'b150', desc: 'ลูกโตสายแข่ง รอบจัด' },
    { id: 'e190', name: 'บล็อก 190cc 66mm',  price: 24000, cc: 190, red: 10800, dur: 52, wt: 6, models: ['wave'], v: 'b190', desc: 'บล็อกยักษ์ แรงจนต้องกลึงใส้ในเอง' },
    // --- 2 จังหวะ: ss = สัดส่วนกำลังต่อความทนของใส้ในเดิม ---
    { id: 'ls125', name: 'LS 125cc 2T เดิม',      price: 0,     cc: 125, kpc: 0.077, red: 9500,  dur: 40, band: 3.2, fall: 5.5, ss: 0.72, models: ['ls'], v: 'b125', desc: 'เครื่อง 2 จังหวะเดิม สูบเดียว' },
    { id: 'ls150', name: 'LS บิ๊กบอร์ 150cc 60mm', price: 9000,  cc: 150, kpc: 0.080, red: 9900,  dur: 42, wt: 1.5, band: 3.3, fall: 5.5, ss: 0.9, models: ['ls'], v: 'b150', desc: 'ลูกโตขึ้น พอร์ตเดิมเริ่มไม่พอ' },
    { id: 'ls175', name: 'LS บิ๊กบอร์ 175cc 64mm', price: 18000, cc: 175, kpc: 0.083, red: 10300, dur: 44, wt: 3, band: 3.4, fall: 5.6, ss: 1.0, models: ['ls'], v: 'b190', desc: 'สุดทางของ LS ต้องใส่ใส้ในดีๆ' },
    { id: 'sp150', name: 'Serpico 150cc 2T เดิม',  price: 0,     cc: 150, kpc: 0.114, red: 10000, dur: 44, band: 3.0, fall: 5.0, ss: 0.75, models: ['sp'], v: 'b150', desc: 'เครื่องเดิม 150cc 2 จังหวะ แรงบิดดี' },
    { id: 'sp175', name: 'Serpico บิ๊กบอร์ 175cc', price: 15000, cc: 175, kpc: 0.118, red: 10400, dur: 46, wt: 2, band: 3.1, fall: 5.2, ss: 0.9, models: ['sp'], v: 'b143', desc: 'บอร์ดเพิ่ม เสียงแหลมคมขึ้นอีกขั้น' },
    { id: 'sp200', name: 'Serpico บิ๊กบอร์ 200cc', price: 30000, cc: 200, kpc: 0.122, red: 10800, dur: 50, wt: 4, band: 3.2, fall: 5.3, ss: 1.0, models: ['sp'], v: 'b190', desc: 'ลูกยักษ์ ต้องคุมเกียร์ให้อยู่ในย่านกำลัง' },
    { id: 'kr150', name: 'KR 150cc 2T เดิม',       price: 0,     cc: 150, kpc: 0.136, red: 10500, dur: 46, band: 3.5, fall: 5.8, ss: 0.8, models: ['kr'], v: 'b150', desc: 'แรงตั้งแต่เครื่องเดิม ช่วงกำลังแคบ ขึ้นแล้วพุ่ง' },
    { id: 'kr175', name: 'KR บิ๊กบอร์ 175cc',      price: 16000, cc: 175, kpc: 0.140, red: 10800, dur: 48, wt: 2, band: 3.6, fall: 6.0, ss: 0.92, models: ['kr'], v: 'b143', desc: 'บอร์ดเพิ่ม แรงขึ้นชัดเจน ลูกสูบเริ่มร้อน' },
    { id: 'kr200', name: 'KR บิ๊กบอร์ 200cc 68mm', price: 32000, cc: 200, kpc: 0.145, red: 11200, dur: 52, wt: 4, band: 3.7, fall: 6.2, ss: 1.0, models: ['kr'], v: 'b190', desc: 'ตัวแรงสุดของเกม ประคองใส้ในให้อยู่' },
  ],
  crank: [
    { id: 'q0', name: 'ข้อเหวี่ยงเดิม',               price: 0,    pw: 0,     dur: 30, red: 0,   desc: 'ข้อเหวี่ยงโรงงาน' },
    { id: 'q1', name: 'ข้อเหวี่ยงเสริมแกน',            price: 1800, pw: 0.012, dur: 36, red: 150, desc: 'แกนใหญ่ขึ้น ลดอาการสั่น' },
    { id: 'q2', name: 'ข้อเหวี่ยงชุบแข็ง บาลานซ์',      price: 4200, pw: 0.03,  dur: 44, red: 400, desc: 'บาลานซ์ละเอียด รอบขึ้นไว' },
    { id: 'q3', name: 'ข้อเหวี่ยงบิลเล็ต CNC',         price: 9000, pw: 0.05,  dur: 54, red: 700, wt: -0.5, desc: 'กลึงจากเหล็กก้อนเดียว ทนทั้งรอบทั้งกำลัง' },
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
    { id: 'm0', name: 'แคมเดิม',               price: 0,    pw: 0,    red: 0,   only: '4T', v: 'stock', desc: 'แคมโรงงาน' },
    { id: 'm1', name: 'แคมลูกเล็ก รอบกลาง',    price: 1500, pw: 0.06, red: 300, only: '4T', v: 'm1',    desc: 'ดึงรอบกลางดี ขับง่าย' },
    { id: 'm2', name: 'แคมสนาม รอบปลาย',       price: 3500, pw: 0.11, red: 600, only: '4T', v: 'm2',    desc: 'ไปสุดทางรอบปลาย ต้องคุมคันเร่งดีๆ' },
    { id: 'v0', name: 'ลิ้นรีดเดิม',            price: 0,    pw: 0,    red: 0,   bandD: 0,    only: '2T', desc: 'ลิ้นรีดเหล็กสปริงเดิม' },
    { id: 'v1', name: 'ลิ้นรีดคาร์บอนไฟเบอร์',  price: 1600, pw: 0.06, red: 150, bandD: 0.25, only: '2T', desc: 'เปิดไวขึ้น ช่วงกำลังกว้างขึ้น' },
    { id: 'v2', name: 'ลิ้นรีดคู่ แต่งพอร์ต',   price: 3800, pw: 0.11, red: 300, bandD: 0.5,  only: '2T', desc: 'แต่งพอร์ตไอดี ได้ทั้งแรงและกว้าง' },
  ],
  carb: [
    { id: 'f0', name: 'คาร์บูเดิม',            price: 0,    pw: 0,    v: 'f0', desc: 'คาร์บูโรงงาน' },
    { id: 'f1', name: 'Mikuni 24mm + กรองเปลือย', price: 800,  pw: 0.05, v: 'f1', desc: 'ปากใหญ่ขึ้น หายใจคล่อง' },
    { id: 'f2', name: 'Keihin PWK 28mm',       price: 2200, pw: 0.09, v: 'f2', desc: 'คาร์บูสายแข่ง ไฟแรง' },
    { id: 'f3', name: 'หัวฉีด 30mm + กล่อง ECU', price: 5200, pw: 0.13, v: 'f3', desc: 'จ่ายน้ำมันแม่นยำที่สุด' },
  ],
  exhaust: [
    { id: 'x0', name: 'ท่อเดิม',                price: 0,    pw: 0,    wt: 0,  only: '4T', v: 'stock',  desc: 'เงียบ สุภาพ (น่าเบื่อ)' },
    { id: 'x1', name: 'ท่อสนามปลายเปิด',        price: 1500, pw: 0.05, wt: -1, only: '4T', v: 'race',   desc: 'ไส้โล่ง เสียงเริ่มดัง' },
    { id: 'x2', name: 'ท่อปากแตร (ปี้นนน)',     price: 3200, pw: 0.09, wt: -2, only: '4T', v: 'horn',   desc: 'เสียงดังไปถึงหมู่บ้านถัดไป' },
    { id: 'x3', name: 'Akrapovič คาร์บอน คอไทเทเนียม', price: 6500, pw: 0.13, wt: -3, only: '4T', v: 'carbon', desc: 'เบา แรง คอไหม้สีรุ้ง' },
    { id: 'tx0', name: 'ท่อ 2T เดิม',                price: 0,    pw: 0,    wt: 0,    bandD: 0,    only: '2T', v: 'stock2t', desc: 'ท่อกระบอกเดิม เสียงเบา' },
    { id: 'tx1', name: 'ท่อแชมเบอร์ปลายกรวย',         price: 2400, pw: 0.08, wt: -0.5, bandD: -0.3, only: '2T', v: 'chamber', desc: 'ดึงกำลังช่วงปลาย ช่วงกำลังแคบลง' },
    { id: 'tx2', name: 'ท่อแชมเบอร์สนาม',             price: 5200, pw: 0.14, wt: -1,   bandD: -0.5, only: '2T', v: 'chamber2', desc: 'แรงสุดๆ ต้องรักษารอบให้อยู่ย่าน' },
    { id: 'tx3', name: 'แชมเบอร์ไทเทเนียม Yoshimura',  price: 9800, pw: 0.2,  wt: -2,   bandD: -0.7, only: '2T', v: 'chamber3', desc: 'เบา แรง ปลายท่อไหม้สีน้ำเงิน' },
  ],
  gearbox: [
    { id: 'g0',  name: 'เกียร์เดิม 4 สปีด',        price: 0,     only: '4T', ratios: [2.833, 1.875, 1.364, 1.043], shift: 0.17, desc: 'เข้าเกียร์นุ่ม ช้านิดนึง' },
    { id: 'gt0', name: 'เกียร์เดิม 5 สปีด 2T',      price: 0,     only: '2T', ratios: [2.6, 1.8, 1.38, 1.12, 0.95],  shift: 0.15, desc: 'เกียร์ถี่ เหมาะรักษารอบ 2 จังหวะ' },
    { id: 'g1',  name: 'เกียร์ชิด 4 สปีด',          price: 2400,  ratios: [2.75, 1.95, 1.5, 1.2],        shift: 0.13, desc: 'ช่วงเกียร์ถี่ รอบไม่ตก' },
    { id: 'g2',  name: 'เกียร์ 5 สปีดสายแข่ง',      price: 6000,  ratios: [2.9, 2.0, 1.55, 1.27, 1.05],  shift: 0.11, desc: 'เพิ่มอีกเกียร์ ต่อเนื่องกว่า' },
    { id: 'g3',  name: 'เกียร์ซีเควนเชียล ควิกชิฟ', price: 11000, ratios: [2.9, 2.0, 1.55, 1.27, 1.05],  shift: 0.06, desc: 'ชิฟต์ไม่ต้องตัดไฟ เกือบไม่เสียเวลา' },
  ],
  clutch: [
    { id: 'u0', name: 'คลัตช์เดิม',                 price: 0,    effD: 0,     shiftD: 0,     desc: 'ผ้าคลัตช์โรงงาน' },
    { id: 'u1', name: 'คลัตช์ 3 แผ่นแต่ง',          price: 1500, effD: 0.012, shiftD: 0,     desc: 'ลื่นไถลน้อยลง ส่งกำลังตรง' },
    { id: 'u2', name: 'ชุดคลัตช์สนาม ผ้าเซรามิก',    price: 3800, effD: 0.025, shiftD: -0.01, desc: 'ทนความร้อน ออกตัวหนึบ' },
    { id: 'u3', name: 'คลัตช์ Slipper ทรงแข่ง',      price: 8000, effD: 0.035, shiftD: -0.02, desc: 'ส่งกำลังเกือบ 100% ชิฟต์ไวขึ้น' },
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
  shock: [
    { id: 'z0', name: 'โช้คเดิม',                 price: 0,     grip: 0,    wt: 0,    v: 'stock',  desc: 'โช้คสปริงโรงงาน' },
    { id: 'z1', name: 'โช้ค YSS G-Sport',          price: 2800,  grip: 0.04, wt: 0,    v: 'yss',    desc: 'หลังเด้งนุ่ม น้ำหนักลงล้อหลังดีขึ้น' },
    { id: 'z2', name: 'โช้ค Showa ปรับ 2 ทาง',     price: 6500,  grip: 0.07, wt: -0.3, v: 'showa',  desc: 'ปรับความหนืดได้ ออกตัวนิ่ง' },
    { id: 'z3', name: 'โช้ค Öhlins ชุดแข่ง',       price: 14000, grip: 0.11, wt: -0.6, v: 'ohlins', desc: 'สปริงทอง ถ่ายน้ำหนักเป๊ะ กริปสูงสุด' },
  ],
  wheel: [
    { id: 'w0', name: 'ล้อซี่ลวดเดิม',         price: 0,    wt: 0,    v: 'wire', rim: '#b8bcc4', desc: 'ล้อซี่ลวดคลาสสิก' },
    { id: 'w1', name: 'ล้อแม็ก 5 ก้าน',        price: 2500, wt: -2,   v: 'mag5', rim: '#d3d7de', desc: 'เบากว่า สวยกว่า' },
    { id: 'w2', name: 'ล้อแม็กเบา 7 ก้านสีทอง', price: 5500, wt: -3.5, v: 'mag7', rim: '#e5b53a', desc: 'ทองแวววับ น้ำหนักเบา' },
    { id: 'w3', name: 'ล้อ CNC ฟอร์จเบา',       price: 9500, wt: -5,   v: 'cnc',  rim: '#35b6ff', desc: 'ล้อสายแข่ง สีน้ำเงินอโนไดซ์' },
  ],
  tire: [
    { id: 't0', name: 'ยางเดิม',                  price: 0,    mu: 0.80, v: 'stock',  desc: 'ยางถนน' },
    { id: 't1', name: 'Dunlop TT93 เรเดียล',      price: 1400, mu: 0.95, v: 'radial', desc: 'เกาะดีขึ้นมาก' },
    { id: 't2', name: 'Michelin Power สลิกสนาม',  price: 3600, mu: 1.12, v: 'slick',  desc: 'เกาะสุดๆ ถ้ายางร้อน' },
    { id: 't3', name: 'Pirelli Diablo สลิกแข่ง',  price: 7000, mu: 1.25, v: 'slick',  desc: 'ยางแข่งตัวท็อป' },
  ],
  brake: [
    { id: 'b0', name: 'ดรัมเบรกเดิม',                price: 0,     brake: 5.2, v: 'drum',    desc: 'ชะลอแบบใจเย็น' },
    { id: 'b1', name: 'ดิสก์เดี่ยว Nissin',           price: 1500,  brake: 6.8, v: 'disc',    desc: 'หยุดไวขึ้น' },
    { id: 'b2', name: 'J.Costa ดิสก์เจาะรู',          price: 2800,  brake: 7.6, v: 'drilled', desc: 'ระบายความร้อนดี ปั๊ม 2 พอต' },
    { id: 'b3', name: 'Brembo 4 พอต หน้า',            price: 6500,  brake: 8.6, v: 'brembo',  desc: 'คาลิเปอร์แดงสะใจ หยุดนิ่งแน่น' },
    { id: 'b4', name: 'Brembo Racing ดิสก์คู่ หน้า-หลัง', price: 11000, brake: 9.4, v: 'dual', wt: 1, desc: 'ชุดเบรกสนาม ไม่ลืมเบรกหลังเส้นชัย' },
  ],
  body: [
    { id: 'k0', name: 'ชุดสีเดิม',              price: 0,    cda: 0.55, wt: 0,  v: 'stock',   desc: 'ชุดสีโรงงาน' },
    { id: 'k1', name: 'ชุดสีแต่ง ท้ายสั้น',      price: 1200, cda: 0.52, wt: -2, v: 'short',   desc: 'ตัดท้าย ลดน้ำหนัก' },
    { id: 'k2', name: 'แฟริ่งเต็ม + ท้ายเป็ด',   price: 3500, cda: 0.42, wt: 1,  v: 'fairing', desc: 'ลดแรงต้านลมท้ายๆ ระยะ' },
    { id: 'k3', name: 'ชุดคาร์บอนทั้งคัน',       price: 9000, cda: 0.44, wt: -6, v: 'carbon',  desc: 'เบา แรงต้านต่ำ ลายเคฟล่า' },
  ],
};
for (const slot in PARTS) {
  PARTS[slot] = PARTS[slot].map(p => Object.assign({ pw: 0, dur: 0, red: 0, wt: 0, slot }, p));
}
// ความทนของใส้ในเดิมของเครื่อง 2T คำนวณให้พอดีกำลังเริ่มต้น (ss = stress ตอนใส้ในเดิมล้วน)
PARTS.engine.forEach(e => {
  if (e.ss) e.dcMul = (e.cc * e.kpc) / (e.ss * (e.dur + 90) * DUR_K);
  else e.dcMul = 1;
});

function partFits(p, model) {
  if (p.only && p.only !== model.type) return false;
  if (p.models && !p.models.includes(model.id)) return false;
  return true;
}
function modelDefault(modelId) {
  const M = MODELS[modelId] || MODELS.wave, t = M.type;
  return {
    engine: M.stockEngine, crank: 'q0', piston: 'p0', conrod: 'r0', cam: t === '2T' ? 'v0' : 'm0', carb: 'f0',
    exhaust: t === '2T' ? 'tx0' : 'x0', gearbox: M.stockGear, clutch: 'u0', sprocket: 's0', nos: 'n0', shock: 'z0',
    wheel: 'w0', tire: 't0', brake: 'b0', body: 'k0',
  };
}
const DEFAULT_BUILD = modelDefault('wave');

/* ---------------- ระบบ Craft ----------------
   สเปกของที่ Craft = Q/G  เช่น 95/9   (Q = คุณภาพงานกลึง %, G = เกรดวัสดุ 1–9) */
const MATERIALS = {
  alu:   { name: 'อลูมิเนียม', icon: '🥄', col: '#cfd6dd', grade: [1, 3], cost: { alu: 4 },            fee: 300,  fail: 0.03, price: 120 },
  steel: { name: 'เหล็กกล้า',  icon: '🔩', col: '#8892a0', grade: [3, 6], cost: { steel: 4, alu: 2 },   fee: 900,  fail: 0.07, price: 350 },
  ti:    { name: 'ไทเทเนียม',  icon: '💎', col: '#6ea8ff', grade: [6, 9], cost: { ti: 5, steel: 2 },    fee: 2500, fail: 0.14, price: 1300 },
};
const POLISH_FEE = 800;

const CRAFT_TYPES = {
  piston:  { icon: '🛢️', name: { '4T': 'ลูกสูบ', '2T': 'ลูกสูบ' },                pw: 0.018, d0: 24, dg: 4.2, red: 40, wt: 0,    blurb: 'เพิ่มกำลัง + ความทน' },
  conrod:  { icon: '🔗', name: { '4T': 'ก้านสูบ', '2T': 'ก้านสูบ' },               pw: 0.009, d0: 26, dg: 4.6, red: 30, wt: 0,    blurb: 'ทนรอบ ทนแรงดัน' },
  crank:   { icon: '⚙️', name: { '4T': 'ข้อเหวี่ยง', '2T': 'ข้อเหวี่ยง' },          pw: 0.012, d0: 28, dg: 4.0, red: 55, wt: -0.15, blurb: 'รอบสูงขึ้นมาก + ทน' },
  cam:     { icon: '🌀', name: { '4T': 'แคม', '2T': 'ลิ้นรีด' },                    pw: 0.016, d0: 0,  dg: 0,   red: 60, wt: 0,    blurb: '4T = แคม / 2T = ลิ้นรีด' },
  exhaust: { icon: '🔥', name: { '4T': 'ท่อไอเสีย', '2T': 'ท่อแชมเบอร์' },         pw: 0.015, d0: 0,  dg: 0,   red: 0,  wt: -0.3, blurb: 'แรงขึ้น + เบาลง' },
};
const CRAFT_ORDER = ['piston', 'conrod', 'crank', 'cam', 'exhaust'];

function makeCrafted(id, slot, mat, q, g, mtype) {
  const m = MATERIALS[mat], T = CRAFT_TYPES[slot], qf = q / 100, t = mtype || '4T';
  const pw = T.pw * g * (0.5 + 0.5 * qf);
  const dur = T.d0 ? Math.round(T.d0 + g * T.dg * (0.4 + 0.6 * qf)) : 0;
  const red = Math.round(T.red * g * qf);
  const wt = T.wt ? +(T.wt * g * qf).toFixed(2) : 0;
  const p = { id, slot, mat, q, g, crafted: true, price: 0, wt, pw, dur, red, col: m.col, v: 'crafted', only: slot === 'cam' || slot === 'exhaust' ? t : undefined,
    name: `${T.name[t]}${m.name} ${q}/${g}`, desc: `งานกลึงมือ • คุณภาพ ${q}% • เกรด ${g}`, sell: Math.round(q * g * 6) };
  if (slot === 'cam' && t === '2T') p.bandD = +(0.04 * g * qf).toFixed(2);
  if (slot === 'exhaust') {
    if (t === '2T') { p.bandD = -(0.05 * g * qf); p.v = mat === 'ti' ? 'chamber3' : mat === 'steel' ? 'chamber2' : 'chamber'; }
    else p.v = mat === 'ti' ? 'carbon' : 'race';
  }
  return p;
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
function computeStats(build, crafted, modelId) {
  const M = MODELS[modelId] || MODELS.wave, dflt = modelDefault(M.id);
  const P = {};
  for (const slot in SLOT_INFO) {
    let p = getPart(build[slot], crafted);
    if (!p || !partFits(p, M)) p = getPart(dflt[slot]);
    P[slot] = p;
  }
  const cc = P.engine.cc, kpc = P.engine.kpc || 0.066;
  const pwSum = P.piston.pw + P.conrod.pw + P.crank.pw + P.cam.pw + P.carb.pw + P.exhaust.pw;
  const powerKw = cc * kpc * (1 + pwSum);
  const redline = P.engine.red + P.cam.red + P.piston.red + P.conrod.red + P.crank.red;
  let mass = M.mass + RIDER_MASS;
  for (const s of ['engine', 'crank', 'exhaust', 'wheel', 'brake', 'body', 'nos', 'shock']) mass += P[s].wt || 0;
  const mu = P.tire.mu + (P.shock.grip || 0);
  const durCap = (P.engine.dur + P.piston.dur + P.conrod.dur + P.crank.dur) * DUR_K * (P.engine.dcMul || 1);
  const nosStress = P.nos.charges ? 1 + P.nos.nosPw * 0.4 : 1;
  const stress = powerKw * nosStress / durCap;
  const risk = Math.max(0, Math.min(0.92, (stress - 1) * 1.1));
  const is2T = M.type === '2T';
  const band = is2T ? Math.max(1.6, (P.engine.band || 3.2) - (P.cam.bandD || 0) - (P.exhaust.bandD || 0)) : 1.3;
  const S = {
    P, model: M.id, type: M.type, cc, powerKw, hp: powerKw * 1.341, redline, mass, mu,
    cda: P.body.cda, final: P.sprocket.final, ratios: P.gearbox.ratios, shiftTime: Math.max(0.04, P.gearbox.shift + (P.clutch.shiftD || 0)),
    brake: Math.min(P.brake.brake, mu * G_ACCEL * 0.95),
    nosCharges: P.nos.charges || 0, nosPw: P.nos.nosPw || 0, nosTime: P.nos.nosTime || 0,
    durCap, stress, risk, rw: WHEEL_R, eff: 0.88 + (P.clutch.effD || 0),
    band, fall: is2T ? (P.engine.fall || 5.5) : 3,
    visual: {
      model: M.id, type: M.type, camId: P.cam.id, cc, engineV: P.engine.v, camV: P.cam.v, carbV: P.carb.v, exhaustV: P.exhaust.v,
      wheelV: P.wheel.v, rimColor: P.wheel.rim || '#b8bcc4', tireV: P.tire.v, brakeV: P.brake.v, shockV: P.shock.v,
      bodyV: P.body.v, nos: P.nos.charges || 0, final: P.sprocket.final, piston: P.piston, conrod: P.conrod, crank: P.crank,
    },
  };
  S.peakTorque = 0;
  for (let r = 2500; r <= redline; r += 250) S.peakTorque = Math.max(S.peakTorque, torqueAt(S, r, false));
  return S;
}

/* เส้นโค้งกำลัง (kW) ตามรอบ — 2T: ช่วงกำลังแคบ ตกหนักเมื่อรอบหลุดย่าน */
function powerAt(s, rpm, nosOn) {
  const peak = s.redline * 0.8;
  const x = rpm / peak;
  const floor = s.type === '2T' ? 0.12 : 0.18;
  const shape = x <= 1 ? Math.max(floor, 1 - s.band * (1 - x) * (1 - x)) : Math.max(0.35, 1 - s.fall * (x - 1) * (x - 1));
  return s.powerKw * shape * (nosOn ? 1 + s.nosPw : 1);
}
function torqueAt(s, rpm, nosOn) {
  const w = Math.max(rpm, 1500) * Math.PI / 30;
  return powerAt(s, rpm, nosOn) * 1000 / w;
}

function partEffects(p, slot) {
  const o = [];
  if (p.cc) o.push(`${p.cc}cc`, p.kpc ? '2 จังหวะ' : '4 จังหวะ', `รอบตัด ${p.red}`, `ทน ${p.dur}`);
  else {
    if (p.pw) o.push(`+${(p.pw * 100).toFixed(p.pw < 0.1 ? 1 : 0)}% แรงม้า`);
    if (p.dur && ['piston', 'conrod', 'crank'].includes(slot)) o.push(`ทน ${p.dur}`);
    if (p.red) o.push(`+${p.red} rpm`);
  }
  if (p.bandD) o.push(p.bandD > 0 ? 'ช่วงกำลังกว้างขึ้น' : 'ช่วงกำลังแคบ/แรงปลาย');
  if (p.wt) o.push(`${p.wt > 0 ? '+' : ''}${p.wt} kg`);
  if (p.mu) o.push(`กริป ${p.mu.toFixed(2)}`);
  if (p.grip) o.push(`กริป +${p.grip.toFixed(2)}`);
  if (p.effD) o.push(`ถ่ายกำลัง +${(p.effD * 100).toFixed(1)}%`);
  if (p.shiftD) o.push(`ชิฟต์ ${p.shiftD}s`);
  if (p.cda) o.push(`แรงต้านลม ${p.cda}`);
  if (p.brake) o.push(`เบรก ${p.brake} m/s²`);
  if (p.ratios) o.push(`${p.ratios.length} สปีด`, `ชิฟต์ ${p.shift}s`);
  if (p.final) o.push(`ทด ${p.final.toFixed(2)}`);
  if (p.charges) o.push(`${p.charges} ช็อต`, `+${Math.round(p.nosPw * 100)}% 2–2.5s`);
  return o;
}

/* ---------------- ลีกบอท 15 ตัว ----------------
   ลำดับ/รางวัล/ฝีมือ ถูกเรียงตาม ET จริงตอนเริ่มเกม (initLadder) */
const BOTS = [
  { name: 'น้องบอม หลังโรงเรียน', tag: 'เวฟเดิมๆ ซิ่งตอนเลิกเรียน', model: 'wave', color: '#3aa0ff', build: {} },
  { name: 'ลุงจ่อย ขี่ไปตลาด', tag: 'เปลี่ยนสเตอร์แล้วคิดว่าแรง', model: 'wave', color: '#9bb0c8', build: { sprocket: 's4', carb: 'f1' } },
  { name: 'พี่แต๊ก ปากซอย', tag: 'เครื่อง 125 ท่อดังหน่อย', model: 'wave', color: '#2fd36b', build: { engine: 'e125', exhaust: 'x1', sprocket: 's6', carb: 'f1' } },
  { name: 'ป้าแจ๋ว ส่งนม', tag: 'LS125 เดิมๆ ควันขาวทั้งซอย', model: 'ls', color: '#f0f0f0', build: { sprocket: 's4' } },
  { name: 'เสือเขาใหญ่', tag: 'สายโค้งก็ซิ่งทางตรงได้', model: 'wave', color: '#f5c518', build: { engine: 'e143', piston: 'p1', conrod: 'r1', cam: 'm1', carb: 'f2', exhaust: 'x2', sprocket: 's5', wheel: 'w1', tire: 't1', brake: 'b1' } },
  { name: 'โอ๊ต ซิ่งหลังวัด', tag: 'LS บอร์ดเพิ่ม ท่อแชมเบอร์', model: 'ls', color: '#ff5d8f', build: { engine: 'ls150', exhaust: 'tx1', carb: 'f1', cam: 'v1', sprocket: 's6', tire: 't1', brake: 'b1' } },
  { name: 'เจ๊ใหญ่ สายไฟ', tag: 'Serpico เดิมแต่ไม่เคยแพ้ผู้ชาย', model: 'sp', color: '#27c5a0', build: { sprocket: 's6', tire: 't1' } },
  { name: 'หัวหน้าแก๊ง ทริปน้ำไม่อาบ', tag: 'ไม่อาบน้ำมา 3 วัน แต่เครื่องแรงมาก', model: 'wave', color: '#ff7a1a', build: { engine: 'e150', piston: 'p2', conrod: 'r2', cam: 'm2', carb: 'f2', exhaust: 'x3', gearbox: 'g2', sprocket: 's5', nos: 'n1', wheel: 'w2', tire: 't2', brake: 'b2', body: 'k1' }, nosAt: 50 },
  { name: 'เก่ง ถนนวงแหวน', tag: 'KR150 สภาพโรงงาน ใครว่าไม่แรง', model: 'kr', color: '#3dd13d', build: { sprocket: 's6', tire: 't1', brake: 'b1' } },
  { name: 'ไอ้เหลือง ซอยเก้า', tag: 'Serpico 175 แชมเบอร์ปลายแหลม', model: 'sp', color: '#ffd400', build: { engine: 'sp175', exhaust: 'tx1', carb: 'f2', cam: 'v1', piston: 'p1', sprocket: 's5', tire: 't2', brake: 'b2', shock: 'z1' } },
  { name: 'ซัน เกียร์ห้า', tag: 'LS 175 ขึ้นรอบแล้วหายไปเลย', model: 'ls', color: '#ff9f1a', build: { engine: 'ls175', exhaust: 'tx2', carb: 'f2', cam: 'v2', piston: 'p2', conrod: 'r1', crank: 'q1', gearbox: 'g2', sprocket: 's5', tire: 't2', brake: 'b2', shock: 'z1' } },
  { name: 'มังกรดำ ราชบุรี', tag: 'KR175 ท่อ Yoshimura ปลายน้ำเงิน', model: 'kr', color: '#6a5cff', build: { engine: 'kr175', exhaust: 'tx2', carb: 'f2', cam: 'v1', piston: 'p2', conrod: 'r2', crank: 'q2', gearbox: 'g2', sprocket: 's5', tire: 't2', brake: 'b3', shock: 'z2', wheel: 'w2' } },
  { name: 'พี่โจ้ นครสวรรค์', tag: 'Wave 190 บล็อกยักษ์ไม่ง้อ NOS', model: 'wave', color: '#d6322c', build: { engine: 'e190', piston: 'p2', conrod: 'r2', crank: 'q2', cam: 'm2', carb: 'f3', exhaust: 'x3', gearbox: 'g2', sprocket: 's5', wheel: 'w3', tire: 't3', brake: 'b3', body: 'k3', shock: 'z2', clutch: 'u2' } },
  { name: 'ผีซิ่งเขาย้อย', tag: 'KR200 ตัดไฟเกียร์ไม่ทัน', model: 'kr', color: '#b44bff', build: { engine: 'kr200', exhaust: 'tx3', carb: 'f3', cam: 'v2', piston: 'p2', conrod: 'r2', crank: 'q3', gearbox: 'g3', clutch: 'u2', sprocket: 's5', tire: 't3', brake: 'b3', shock: 'z3', wheel: 'w3', body: 'k1' }, nosAt: 9999 },
  { name: 'ตำนานราชดำเนิน', tag: 'KR200 ติด NOS ไม่เคยแพ้ใคร', model: 'kr', color: '#ff2d55', build: { engine: 'kr200', exhaust: 'tx3', carb: 'f3', cam: 'v2', piston: 'p2', conrod: 'r2', crank: 'q3', gearbox: 'g3', clutch: 'u3', sprocket: 's5', nos: 'n2', tire: 't3', brake: 'b4', shock: 'z3', wheel: 'w3', body: 'k3' }, nosAt: 40 },
];

/* เรียงบอทตาม ET (ช้า→เร็ว) และตั้งฝีมือ/รางวัล/ดรอปตามระดับ */
let OPPONENTS = [];
function initLadder() {
  const list = BOTS.map(b => {
    const o = Object.assign({}, b);
    o.build = Object.assign(modelDefault(b.model), b.build);
    o.nosAt = b.nosAt === undefined ? (o.build.nos !== 'n0' ? 45 : 9999) : b.nosAt;
    const S = computeStats(o.build, [], o.model);
    S.risk = 0;
    o.est = estimateRun(S, 0.6).et;
    return o;
  });
  list.sort((a, b) => b.est - a.est);
  const n = list.length;
  list.forEach((o, i) => {
    const t = i / (n - 1);
    o.id = i; o.tier = i;
    o.prize = Math.round(600 * Math.pow(1.3, i) / 50) * 50;
    o.rt = 0.30 - 0.15 * t; o.shiftPt = 0.90 + 0.07 * t; o.launch = 0.52 + 0.1 * t;
    o.drops = {
      alu: [Math.max(0, 3 - Math.floor(i / 4)), Math.max(1, 4 - Math.floor(i / 4))],
      steel: i < 3 ? [0, 0] : [Math.floor(i / 6), 1 + Math.floor(i / 5)],
      ti: i < 7 ? [0, 0] : i < 11 ? [0, 1] : [Math.floor((i - 9) / 3), 1 + Math.floor((i - 8) / 3)],
    };
  });
  OPPONENTS = list;
  return list;
}
const RANK_TITLES = ['มือใหม่หัดซิ่ง', 'เด็กซอย', 'เด็กแว้นฝึกหัด', 'สายเวฟ', 'ขาประจำปากซอย', 'นักซิ่งหน้าหมู่บ้าน', 'เจ้าถิ่นถนนวงแหวน', 'หัวหน้าแก๊ง', 'เสือสนาม', 'ผีซิ่ง', 'ราชาทางตรง', 'ตำนานราชดำเนิน'];

function fmtInt(n) { return Math.round(n).toLocaleString('th-TH'); }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
