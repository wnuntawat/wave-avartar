'use strict';
/* ============================================================
   WAVE RACE — ฟิสิกส์ทางตรง ¼ ไมล์
   ============================================================ */
class Racer {
  constructor(stats, opts) {
    this.s = stats;
    this.x = 0; this.v = 0; this.gear = 0; this.rpm = 1500;
    this.shiftT = 0; this.launched = false; this.launchT = 0; this.launchRpm = 3000;
    this.nosLeft = stats.nosCharges; this.nosT = 0; this.nosOn = false;
    this.accel = 0; this.spin = false; this.limiter = false;
    this.finished = false; this.ET = null; this.trap = null; this.finT = 0;
    this.blown = false; this.blowAt = null; this.stopped = false; this.stopX = null;
    this.wheelAngle = 0; this.RT = 0; this.events = [];
    if (opts && opts.allowBlow && Math.random() < stats.risk) this.blowAt = 120 + Math.random() * 260;
  }
  launch(rpm, rt) {
    this.launched = true; this.launchT = 0;
    this.launchRpm = Math.min(rpm, this.s.redline * 0.985);
    this.RT = rt || 0;
  }
  step(dt, inp) {
    if (!this.launched) return;
    const s = this.s;
    this.launchT += dt;
    const live = !this.blown && !this.finished;

    if (inp.nos && live && this.nosLeft > 0 && this.nosT <= 0) {
      this.nosLeft--; this.nosT = s.nosTime; this.events.push({ type: 'nos' });
    }
    this.nosOn = this.nosT > 0;
    if (this.nosOn) this.nosT -= dt;

    if (this.shiftT > 0) this.shiftT -= dt;
    if (inp.shift && live && this.shiftT <= 0 && this.gear < s.ratios.length - 1 && this.launchT > 0.15) {
      this.events.push({ type: 'shift', ratio: this.rpm / s.redline, gear: this.gear + 1 });
      this.gear++; this.shiftT = s.shiftTime;
    }

    const tot = PRIMARY * s.ratios[this.gear] * s.final;
    const rpmW = this.v / s.rw * tot * 60 / (2 * Math.PI);
    const clutch = Math.max(0, 1 - this.launchT / 0.7);
    this.rpm = Math.max(rpmW, this.launchRpm * clutch, 1800);
    this.limiter = this.rpm >= s.redline;

    if (this.blowAt !== null && !this.blown && this.x >= this.blowAt) {
      this.blown = true; this.events.push({ type: 'blown' });
    }

    let F = 0; this.spin = false;
    if (live && inp.thr && this.shiftT <= 0 && !this.limiter) {
      const P = powerAt(s, this.rpm, this.nosOn);
      const T = P * 1000 / (this.rpm * Math.PI / 30);
      F = T * tot * s.eff / s.rw * (clutch > 0 ? 0.85 : 1);
      const frac = Math.min(1, 0.52 + 0.45 * Math.max(0, this.accel) / G_ACCEL);
      const Fg = s.mu * s.mass * G_ACCEL * frac;
      if (F > Fg) { F = Fg * 0.92; this.spin = true; }
    }
    const drag = 0.6 * s.cda * this.v * this.v;
    const roll = this.v > 0.05 ? 0.02 * s.mass * G_ACCEL : 0;
    let a = (F - drag - roll) / (s.mass * 1.05);
    if (this.blown) a = -5.5 - (drag + roll) / s.mass;
    else if (this.finished) {
      a = this.finT > 0.5 ? -s.brake - drag / s.mass : -(drag + roll) / s.mass;
    }

    const px = this.x;
    this.v = Math.max(0, this.v + a * dt);
    this.x += this.v * dt;
    this.accel = a;
    this.wheelAngle += this.v / s.rw * dt;

    if (!this.finished && !this.blown && this.x >= QUARTER_M) {
      const f = (QUARTER_M - px) / ((this.x - px) || 1);
      this.ET = this.launchT - dt + f * dt;
      this.trap = this.v; this.finished = true; this.finT = 0;
      this.events.push({ type: 'finish' });
    }
    if (this.finished || this.blown) {
      this.finT += dt;
      if (this.v < 0.15 && !this.stopped) { this.stopped = true; this.stopX = this.x; }
    }
  }
}

/* ตัวควบคุมอัตโนมัติ (AI / โหมดง่าย) */
function autoInput(r, shiftPt, nosAt) {
  const s = r.s;
  return {
    thr: 1,
    shift: r.gear < s.ratios.length - 1 && r.shiftT <= 0 && r.rpm >= s.redline * shiftPt,
    nos: r.x > nosAt,
  };
}

/* จำลองการวิ่งแบบออโต้ เพื่อประเมิน ET / ความเร็วปลายทาง */
function estimateRun(stats, launchFrac) {
  const r = new Racer(stats, {});
  r.launch(stats.redline * (launchFrac || 0.6), 0);
  const dt = 1 / 200;
  let t = 0;
  while (!r.finished && t < 60) { r.step(dt, autoInput(r, 0.955, 40)); t += dt; r.events.length = 0; }
  return { et: r.finished ? r.ET : 99, trap: (r.trap || 0) * 3.6 };
}
/* หารอบออกตัวที่ดีที่สุด (ไว้โชว์โซนเขียวบนมาตรวัดรอบ) */
function bestLaunchFrac(stats) {
  let best = 0.6, bt = 1e9;
  for (let f = 0.35; f <= 0.96; f += 0.04) {
    const e = estimateRun(stats, f).et;
    if (e < bt - 1e-6) { bt = e; best = f; }
  }
  return best;
}
