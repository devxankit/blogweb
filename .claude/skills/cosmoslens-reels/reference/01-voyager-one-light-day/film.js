// CosmosLens Reel 01, "One Light-Day". 1080×1920, 60 s, one picture timeline, two narrations (?lang=en | ?lang=hi).
// We send a message from India and ride it for one light-day: Earth → the Moon → Neptune → twenty hours of dark → Voyager 1,
// its golden record ("Jaat Kahan Ho"), the look back (the real Pale Blue Dot), and the question back to the viewer.
import { makeGL } from './gl.js';

const W = 1080, H = 1920, END = 60.0;
const BPM = 80, BEAT = 60 / BPM, BAR = BEAT * 4;
const GOLD = '#e8b24a', GOLD2 = '#ffd27a', BLUE = '#6f97f4', INK = '#e8ecf2', DIM = '#8a93a6', BG = '#04060b';

// one slot per narration line, shared by both languages (sized to the longer read)
const VOS = {
  en: { l01: .15, l02: 4.4, l03: 10.2, l04: 13.4, l05: 16.4, l06: 24.3, l07: 31.4, l08: 38.0, l09: 44.2, l10: 49.2 },
  // Hinglish: the user's ElevenLabs recording, played as one untouched track from 0.15 s; these are where its lines fall
  hi: { l01: .17, l02: 4.24, l03: 11.36, l04: 15.39, l05: 17.75, l06: 21.5, l07: 32.96, l08: 45.19, l09: 53.43, l10: 58.31 },
};
let VO = VOS.en;
// The picture is drawn on one canonical clock (the English cut). For a narration with its own pacing, a piecewise-linear map
// moves every scene, sound and music cue to the voice: knots are [canonical time, this version's time].
const WARPS = {
  en: [[0, 0], [60, 60]],
  hi: [[0, 0], [4.4, 4.24], [10.2, 11.36], [10.95, 12.2], [13.4, 15.39], [14.0, 16.0], [16.4, 17.75], [24.0, 21.4], [24.3, 21.5],
       [31.4, 32.9], [36.55, 44.9], [37.8, 45.05], [38.0, 45.2], [44.2, 53.43], [47.9, 58.0], [48.7, 58.45], [49.2, 58.7], [55.0, 67.0], [60.0, 72.0]],
};
function pw(K, x, a, b) {
  if (x <= K[0][a]) return K[0][b] + (x - K[0][a]);
  for (let i = 1; i < K.length; i++) if (x <= K[i][a]) return K[i - 1][b] + (K[i][b] - K[i - 1][b]) * (x - K[i - 1][a]) / (K[i][a] - K[i - 1][a]);
  const n = K[K.length - 1]; return n[b] + (x - n[a]);
}
const CUE = {
  send: 2.4, pulse: 2.6, turn: 6.0, moon: 10.9, nep: 14.0, glint: 22.2, arrive: 24.0,
  record: 31.4, stop1: 36.55, back: 37.8, whip: 40.0, dot: 40.4, ring: 44.4, stop2: 47.9, q: 48.7, card: 55.0, chord: 58.5,
};
const C_KMS = 299792.458, LIGHTDAY = 86400;

const COPY = {
  en: { hello: 'Hello, Voyager', q: ['WHAT WOULD', 'YOU SEND?'], comment: 'Tell us in the comments', ifLine: 'If your message reaches it tomorrow…', qW: /what/i, where: 'Where are you going?',
        us: ["That's us.", 'All of us…', 'smaller than one pixel.'], usW: [0, 2, 5], whereW: /where/i, voyW: /voyager/i,
        stats: [['1977', 'launched'], ['22 W', 'transmitter'], ['61,000', 'km/h']], statW: [/1977|nineteen|seventy/i, /22|twenty/i, /fridge|bulb|less/i] },
  hi: { hello: 'Hello, Voyager', q: ['AAP KYA', 'BHEJENGE?'], comment: 'Comment mein batayein', ifLine: 'Agar aapka message kal pahunch sakta ho…', qW: /kya/i, where: 'Kahaan ja rahe ho?',
        us: ['Woh hum hain.', 'Hum sab…', 'ek pixel se bhi chhote.'], usW: [0, 3, 5], whereW: /^kahaan$/i, voyW: /voyager/i,
        stats: [['1977', 'launched'], ['22 W', 'transmitter'], ['61,000', 'km/h']], statW: [/1977|launch/i, /22|watt/i, /fridge|bulb|kam/i] },
};

// ───────── helpers
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = k => 1 - Math.pow(1 - clamp(k), 3), ei3 = k => Math.pow(clamp(k), 3), ei2 = k => clamp(k) ** 2;
const eio = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const ss = k => { k = clamp(k); return k * k * (3 - 2 * k); };
const back = k => { k = clamp(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const env = (t, a, b, fi = .3, fo = .3) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const font = (px, w = 700, fam = 'Sch', it = false) => fam === 'Deva' ? `700 ${px}px Deva` : `${it ? 'italic ' : ''}${w} ${px}px ${fam}`;
const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('missing ' + src)); i.src = src; });
const fmtClock = s => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = Math.floor(s) % 60, cs = Math.floor((s % 1) * 100);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}.${String(cs).padStart(2, '0')}`; };
function fmtKm(km) {
  if (km < 1) return '0 km';
  if (km < 1e6) return Math.round(km).toLocaleString('en-US') + ' km';
  if (km < 1e9) return (km / 1e6).toFixed(km < 1e8 ? 1 : 0) + ' million km';
  return (km / 1e9).toFixed(1) + ' billion km';
}

// every text drawn goes through txt(): it draws and, while collecting, records the box for readcheck
let COLLECT = null;
function txt(c, s, x, y, { px = 40, w = 700, fam = 'Sch', it = false, col = INK, align = 'center', id = null, shadow = 0, ls = 0, pass = false } = {}) {
  c.font = font(px, w, fam, it); c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col;
  if ('letterSpacing' in c) c.letterSpacing = ls + 'px';
  if (shadow) { c.save(); c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = shadow; c.shadowOffsetY = shadow / 5; c.fillText(s, x, y); c.restore(); }
  else c.fillText(s, x, y);
  const wd = c.measureText(s).width;
  if (COLLECT && id !== null && c.globalAlpha > .5) {
    const x0 = align === 'center' ? x - wd / 2 : align === 'right' ? x - wd : x;
    const T = c.getTransform(), P = [[x0, y - px * .6], [x0 + wd, y + px * .6]].map(([a, b]) => [T.a * a + T.c * b + T.e, T.b * a + T.d * b + T.f]);
    COLLECT.push({ id, text: s, pass, x0: Math.min(P[0][0], P[1][0]), y0: Math.min(P[0][1], P[1][1]), x1: Math.max(P[0][0], P[1][0]), y1: Math.max(P[0][1], P[1][1]) });
  }
  if ('letterSpacing' in c) c.letterSpacing = '0px';
  return wd;
}
function glow(c, x, y, r, col, a) {
  if (a <= 0 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(.35, `rgba(${col},${a * .35})`); g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
function vignette(c, k = .7) {
  const g = c.createRadialGradient(W / 2, H * .46, H * .25, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}

export async function build(lang = 'en', opt = {}) {
  const L = COPY[lang] || COPY.en; VO = VOS[lang] || VOS.en;
  const K = WARPS[lang] || WARPS.en, toC = x => pw(K, x, 1, 0), toH = x => pw(K, x, 0, 1), ENDL = toH(END);
  const I = {};
  await Promise.all(['earth-india', 'neptune', 'pale-blue-dot', 'stars-forward', 'launch-1977'].map(async n => I[n] = await load(`img/${n}.jpg`)));
  I.logo = await load('img/logo.svg');
  const G = await makeGL(W, H);

  // narration: lines + durations + word timings from the speech check (fallback: even spacing, for style frames before the voice exists)
  const lines = await fetch(`lines-${lang}.json`).then(r => r.json());
  let dur = {}, words = {};
  try { dur = await fetch(`voices-${lang}/dur.json`).then(r => { if (!r.ok) throw 0; return r.json(); }); words = await fetch(`voices-${lang}/words.json`).then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch { for (const l of lines) dur[l.id] = (l.sub || l.roman || l.text).split(/\s+/).length * .36 + .3; }

  // display words for each line, timed: Whisper word times when the counts match, else spread by length between the first and last spoken word
  const W8 = {};
  for (const l of lines) {
    const show = (lang === 'hi' ? l.roman : (l.sub || l.text)).split(/\s+/).filter(Boolean);
    const ww = words[l.id], t0 = VO[l.id];
    let times;
    if (ww && ww.length === show.length) times = ww.map(w => [t0 + Math.max(0, w[1]), t0 + w[2]]);
    else {
      const a = ww?.length ? Math.max(0, ww[0][1]) : 0, b = ww?.length ? ww[ww.length - 1][2] : dur[l.id];
      const len = show.map(s => s.length + 2), tot = len.reduce((p, q) => p + q, 0); let acc = 0;
      times = len.map(n => { const s = t0 + a + (b - a) * acc / tot; acc += n; return [s, t0 + a + (b - a) * acc / tot]; });
    }
    W8[l.id] = show.map((w, i) => ({ w, t0: times[i][0], t1: times[i][1] }));
  }
  const findW = (id, re, fb) => { const w = W8[id]?.find(w => re.test(w.w)); return w ? w.t0 : fb; };
  const lineEnd = id => VO[id] + (dur[id] || 2);

  // caption cards: 1–4 words, break after punctuation or at ~16 characters
  const CARDS = [];
  for (const l of lines) {
    const ws = W8[l.id]; let cur = [];
    const flush = () => { if (cur.length) CARDS.push({ id: l.id, ws: cur }); cur = []; };
    ws.forEach((w, i) => { const len = cur.reduce((p, q) => p + q.w.length + 1, 0); if (cur.length && (len + w.w.length > 16 || cur.length >= 4)) flush(); cur.push(w); if (/[.,?!:…]$/.test(w.w) && len + w.w.length > 6) flush(); });
    flush();
  }
  CARDS.forEach((cd, i) => { cd.t0 = cd.ws[0].t0 - .06; const nx = CARDS[i + 1]; const endL = lineEnd(cd.id) + .35;
    cd.t1 = nx && nx.id === cd.id ? nx.ws[0].t0 - .06 : Math.min(endL, nx ? nx.ws[0].t0 - .1 : ENDL); });
  CARDS[0].t0 = 0;   // the hook is on screen from the first frame
  // lines that are shown as big titles instead of captions
  const NOCAP = new Set(['l09', 'l10']);
  const whereT = findW('l07', L.whereW, VO.l07 + 3.6);
  const qT = Math.max(VO.l10 + 1.2, findW('l10', L.qW, VO.l10 + 2.4) - .1);
  const subs = lines.map((l, i) => {
    const t0 = VO[l.id], next = i + 1 < lines.length ? VO[lines[i + 1].id] : ENDL;
    return { t0, t1: Math.min(next - .05, Math.max(t0 + (dur[l.id] || 2) + .45, t0 + 1.8)), text: lang === 'hi' ? l.roman : (l.sub || l.text) };
  });

  // timed beats taken from the voice
  const statT = L.statW.map((re, i) => findW('l06', re, VO.l06 + 1.4 + i * 1.6) - .1);
  statT[2] = Math.min(statT[2], statT[1] + .9);
  const jaatT = findW('l07', /jaat|जात/i, VO.l07 + 2.6) - .45;
  const usT = L.usW.map(i => (W8.l09[Math.min(i, W8.l09.length - 1)]?.t0 ?? VO.l09 + i * .5) - .25);
  // the same moments on the picture's canonical clock
  const statC = statT.map(toC), jaatC = toC(jaatT), whereC = toC(whereT), usC = usT.map(toC), qC = toC(qT), l10C = toC(VO.l10);

  // ───────── light-time clock: film time → seconds of light travel (real values at the landmarks)
  function lightT(t) {
    if (t < CUE.pulse) return 0;
    if (t < CUE.moon) return 1.282 * ei2(seg(t, CUE.pulse, CUE.moon)) * .35 + 1.282 * .65 * seg(t, CUE.pulse, CUE.moon);
    if (t < CUE.nep) return Math.exp(lerp(Math.log(1.282), Math.log(14400), ei2(seg(t, CUE.moon, CUE.nep))));
    if (t < CUE.arrive) return LIGHTDAY - (LIGHTDAY - 14400) * Math.pow(1 - seg(t, CUE.nep, CUE.arrive), 3);
    return LIGHTDAY;
  }
  // forward speed (for star streaks) and the distance travelled, integrated once
  const speed = t => t < 4.6 ? 0 : t < 6.6 ? ss(seg(t, 4.6, 6.6)) * .8 : t < 16.4 ? .8 + .5 * seg(t, 6.6, 16.4) : t < CUE.arrive ? 1.3 + 5.2 * ei2(seg(t, 16.4, 23.5)) - 5.0 * ei3(seg(t, 23.4, CUE.arrive)) : Math.max(.03, .3 * (1 - seg(t, 24, 25.5)));
  const DT = 1 / 120, DIST = [0];
  for (let i = 1; i <= END / DT + 2; i++) DIST.push(DIST[i - 1] + speed(i * DT) * DT);
  const dist = t => { const f = clamp(t, 0, END) / DT, i = Math.floor(f); return lerp(DIST[i], DIST[i + 1] ?? DIST[i], f - i); };

  // ───────── events for the mixer
  const ev = [];
  // events are written on the canonical clock and mapped to this version's time; raw: already in this version's time (voice-timed)
  const E = (t, type, o = {}) => { const th = o.raw ? t : toH(t); if (o.dur && !o.raw) o.dur = +(toH(t + o.dur) - th).toFixed(3); ev.push({ t: +th.toFixed(3), type, ...o }); };
  for (const id in VO) E(VO[id], 'vo', { id, raw: 1 });
  const typeT0 = .45, typeT1 = 1.75, hello = L.hello;
  [...hello].forEach((ch, i) => ch !== ' ' && E(typeT0 + (typeT1 - typeT0) * i / hello.length, 'key', { pan: .05 }));
  E(CUE.send, 'send'); E(CUE.pulse, 'pulse');
  E(CUE.turn - .2, 'whoosh', { dur: .8, v: .8 });
  E(6.9, 'thud', { v: .8 }); E(7.6, 'tick'); E(8.2, 'tick');
  E(CUE.moon - .6, 'pass', { dur: 1.3, pan: -.7 }); E(CUE.nep - .4, 'pass', { dur: 1.2, pan: .7, v: .8 });
  E(16.4, 'riser', { dur: CUE.arrive - 16.4 });
  E(CUE.glint, 'shimmer', { v: .6 }); E(CUE.arrive, 'boom'); E(CUE.arrive + .05, 'carrier', { dur: 13.7 });
  statT.forEach((t, i) => E(t, 'stat', { i, raw: 1 }));
  E(CUE.record - .3, 'whoosh', { dur: .5, v: .6 }); E(CUE.record + .1, 'needle'); E(jaatT, 'shimmer', { v: .8, raw: 1 });
  E(CUE.back, 'suck'); E(39.0, 'servo', { dur: 1.0 }); E(CUE.whip - .25, 'whip'); E(CUE.dot + .3, 'shutter');
  E(usT[0], 'thud', { v: .5, raw: 1 }); E(CUE.q + .1, 'whoosh', { dur: .6, v: .8 }); E(CUE.q + .7, 'thud', { v: .9 });
  E(CUE.card, 'whoosh', { dur: .5, v: .7 }); E(CUE.card + .3, 'logo');

  // ───────── scenery: real star field + procedural near stars for parallax and streaks
  const R0 = rng(11);
  const NEAR = Array.from({ length: 420 }, () => ({ x: (R0() - .5) * 2.4, y: (R0() - .5) * 4.2, z: R0() * 6 + .2, b: .3 + R0() * .7, g: R0() }));
  const VP = [540, 860];                 // vanishing point of the forward ride
  const STARF = { fx: .525, fy: .375 };   // Voyager's direction inside stars-forward.jpg
  function sky(c, t, { z = 1, a = 1, dx = 0, dy = 0, rot = 0 } = {}) {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    if (a <= 0) return;
    const img = I['stars-forward'], s = Math.max(W / img.width, H / img.height) * 1.25 * z;
    c.save(); c.globalAlpha = a; c.translate(VP[0] + dx, VP[1] + dy); c.rotate(rot);
    c.drawImage(img, -STARF.fx * img.width * s, -STARF.fy * img.height * s, img.width * s, img.height * s);
    c.restore();
  }
  function nearStars(c, t, a = 1, gold = 0) {
    if (a <= 0) return;
    const d = dist(t), sp = speed(t), F = 700;
    c.save(); c.lineCap = 'round';
    for (const s of NEAR) {
      const zz = ((s.z - d * 1.6) % 6 + 6) % 6 + .15, zp = zz + Math.min(1.2, sp * .1);
      const x = VP[0] + s.x / zz * F, y = VP[1] + s.y / zz * F, xp = VP[0] + s.x / zp * F, yp = VP[1] + s.y / zp * F;
      if (x < -50 || x > W + 50 || y < -50 || y > H + 50) continue;
      const br = clamp((1 - zz / 6) * s.b * 1.4) * a;
      c.strokeStyle = s.g < gold * .2 ? `rgba(255,214,140,${br})` : `rgba(225,232,255,${br})`;
      c.lineWidth = .8 + (1 - zz / 6) * 2.2;
      c.beginPath(); c.moveTo(xp, yp); c.lineTo(x + .01, y); c.stroke();
    }
    c.restore();
  }
  // the message: a gold point with a soft halo, and expanding rings when it leaves
  function pulseDot(c, x, y, r, a = 1) {
    glow(c, x, y, r * 9, '232,178,74', .28 * a); glow(c, x, y, r * 3.2, '255,214,140', .75 * a);
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = `rgba(255,240,205,${a})`; c.fill();
  }
  function rings(c, x, y, t0, t, n = 3, maxR = 900, a = 1) {
    for (let i = 0; i < n; i++) {
      const k = seg(t, t0 + i * .18, t0 + i * .18 + 1.6); if (k <= 0 || k >= 1) continue;
      c.beginPath(); c.arc(x, y, 10 + eo3(k) * maxR, 0, 7); c.strokeStyle = `rgba(232,178,74,${(1 - k) * .85 * a})`; c.lineWidth = 6 * (1 - k) + 1; c.stroke();
    }
  }

  // Earth (EPIC, 20 Apr 2026): disc centre/radius in the cropped image, and India inside it
  const EA = { img: I['earth-india'], cx: .5, cy: .5, r: .4935, ix: .535, iy: .43 };
  function earth(c, x, y, r, a = 1) {
    if (a <= 0 || r < .5) return;
    c.save(); c.globalAlpha = a;
    glow(c, x, y, r * 1.35, '111,151,244', .22);
    const s = r / (EA.r * EA.img.width);
    c.beginPath(); c.arc(x, y, r * .995, 0, 7); c.clip();
    c.drawImage(EA.img, x - EA.cx * EA.img.width * s, y - EA.cy * EA.img.height * s, EA.img.width * s, EA.img.height * s);
    c.restore();
  }
  const indiaXY = (x, y, r) => [x + (EA.ix - EA.cx) * EA.img.width * r / (EA.r * EA.img.width), y + (EA.iy - EA.cy) * EA.img.height * r / (EA.r * EA.img.width)];

  // Neptune (Voyager 2, 1989)
  const NE = { img: I.neptune, cx: .5104, cy: .4961, r: .4641 };
  function neptune(c, x, y, r, a = 1) {
    if (a <= 0 || r < .5) return;
    c.save(); c.globalAlpha = a; const s = r / (NE.r * NE.img.width);
    c.beginPath(); c.arc(x, y, r, 0, 7); c.clip();
    c.drawImage(NE.img, x - NE.cx * NE.img.width * s, y - NE.cy * NE.img.height * s, NE.img.width * s, NE.img.height * s);
    c.restore();
  }

  // the golden record (drawn: the real one is a gold-plated copper disc, played at 16⅔ rpm)
  function record(c, x, y, R, t, a = 1) {
    if (a <= 0 || R < 1) return;
    c.save(); c.globalAlpha = a; c.translate(x, y);
    glow(c, 0, 0, R * 1.7, '232,178,74', .22);
    const g = c.createRadialGradient(-R * .3, -R * .3, R * .1, 0, 0, R); g.addColorStop(0, '#f6d48a'); g.addColorStop(.55, '#c9922f'); g.addColorStop(1, '#8a5a17');
    c.beginPath(); c.arc(0, 0, R, 0, 7); c.fillStyle = g; c.fill();
    const rot = t * TAU_ * 16.667 / 60;
    const cg = c.createConicGradient(rot, 0, 0);
    [[0, .0], [.08, .55], [.16, 0], [.5, 0], [.58, .5], [.66, 0], [1, 0]].forEach(([p, v]) => cg.addColorStop(p, `rgba(255,246,220,${v})`));
    c.fillStyle = cg; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
    c.lineWidth = 1.1;
    for (let rr = R * .37; rr < R * .985; rr += R * .0085) { c.beginPath(); c.arc(0, 0, rr, 0, 7); c.strokeStyle = `rgba(70,40,5,${.16 + .1 * Math.sin(rr * .7)})`; c.stroke(); }
    [.37, .62, .8].forEach(f => { c.beginPath(); c.arc(0, 0, R * f, 0, 7); c.strokeStyle = 'rgba(255,236,190,.35)'; c.lineWidth = 2; c.stroke(); });
    const lg = c.createRadialGradient(0, 0, 0, 0, 0, R * .34); lg.addColorStop(0, '#e9c475'); lg.addColorStop(1, '#b07e2a');
    c.beginPath(); c.arc(0, 0, R * .34, 0, 7); c.fillStyle = lg; c.fill();
    c.beginPath(); c.arc(0, 0, R * .03, 0, 7); c.fillStyle = '#2a1a06'; c.fill();
    c.beginPath(); c.arc(0, 0, R, 0, 7); c.strokeStyle = 'rgba(255,240,200,.7)'; c.lineWidth = 3; c.stroke();
    c.restore();
  }
  const TAU_ = Math.PI * 2;

  // the Pale Blue Dot (NASA/JPL, 1990, remastered 2020): Earth is at pixel (1141, 986)
  const PB = { img: I['pale-blue-dot'], dx: 1141.5, dy: 986.5 };
  const PBY = H * .52;   // the dot's height on screen: with the photo's dot 52 % down, this keeps the frame covered at z ≥ 1
  function paleBlueDot(c, z, a = 1, cx = W / 2, cy = PBY) {
    if (a <= 0) return 0;
    const img = PB.img, s = Math.max(W / img.width, H / img.height) * z;
    c.save(); c.globalAlpha = a; c.imageSmoothingEnabled = s < 6;
    c.drawImage(img, cx - PB.dx * s, cy - PB.dy * s, img.width * s, img.height * s);
    c.restore();
    return s;
  }
  // the photo in a round window (the circle grammar: message, record, ring, window)
  function porthole(c, cx, cy, R, z, a = 1, rim = 1) {
    if (a <= 0 || R < 2) return;
    c.save(); c.globalAlpha = a;
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.save(); c.clip(); paleBlueDot(c, z, 1, cx, cy); c.restore();
    if (rim > 0) { c.globalAlpha = a * rim; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.strokeStyle = GOLD; c.lineWidth = 4; c.stroke(); glow(c, cx, cy, R * 1.25, '232,178,74', .12 * rim); }
    c.restore();
  }

  // ───────── HUD: the light-time clock
  function clock(c, t, a, { done = false, reset = false } = {}) {
    if (a <= 0) return;
    const lt = reset ? 0 : lightT(t), y = 268;
    c.save(); c.globalAlpha = a;
    txt(c, done ? 'ARRIVED · ONE LIGHT-DAY' : 'LIGHT TRAVEL TIME', W / 2, y - 16, { px: 27, w: 700, col: done ? GOLD : DIM, ls: 5, id: 'clockL', pass: true });
    c.font = font(78, 800); c.fontVariantNumeric = 'tabular-nums';
    const s = fmtClock(lt);
    txt(c, s, W / 2, y + 48, { px: 78, w: 800, col: lt >= LIGHTDAY ? GOLD2 : INK, id: 'clock', pass: true, shadow: 18 });
    // progress: Earth → Voyager, linear in distance
    const x0 = 150, x1 = 930, yb = y + 112, k = lt / LIGHTDAY;
    c.strokeStyle = 'rgba(232,236,242,.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, yb); c.lineTo(x1, yb); c.stroke();
    c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, yb); c.lineTo(lerp(x0, x1, k), yb); c.stroke();
    c.beginPath(); c.arc(x0, yb, 7, 0, 7); c.fillStyle = BLUE; c.fill();
    c.beginPath(); c.arc(x1, yb, 6, 0, 7); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    if (k > 0 && k < 1) pulseDot(c, lerp(x0, x1, k), yb, 5, 1);
    txt(c, 'EARTH', x0, yb + 32, { px: 23, w: 700, col: DIM, ls: 3, align: 'center', id: 'hudE', pass: true });
    txt(c, 'VOYAGER 1', x1, yb + 32, { px: 23, w: 700, col: DIM, ls: 3, align: 'center', id: 'hudV', pass: true });
    if (lt > 0) txt(c, fmtKm(lt * C_KMS), W / 2, yb + 34, { px: 32, w: 700, col: INK, id: 'km', pass: true });
    c.restore();
  }

  // ───────── captions: word by word, the spoken word in gold
  function captions(c, t) {
    if (opt.nosubs) return;
    const cd = CARDS.find(k => t >= k.t0 && t < k.t1 && !NOCAP.has(k.id) && !(k.id === 'l07' && k.t0 >= jaatT - .15));   // the title carries the raga's name and its meaning
    if (!cd) return;
    const k = cd.t0 <= 0 ? 1 : seg(t, cd.t0, cd.t0 + .14), y = (t > CUE.arrive && t < CUE.back) ? 1480 : 1400;
    c.save(); c.globalAlpha = k;
    c.font = font(68, 800); const parts = cd.ws.map(w => w.w.toUpperCase()), sp = 18;
    const widths = parts.map(p => c.measureText(p).width); let total = widths.reduce((a, b) => a + b, 0) + sp * (parts.length - 1);
    let sc = Math.min(1, 940 / total); c.translate(W / 2, y + (1 - eo3(k)) * 16); c.scale(sc * (.96 + .04 * back(k)), sc * (.96 + .04 * back(k)));
    let x = -total / 2;
    parts.forEach((p, i) => {
      const w = cd.ws[i], on = t >= w.t0 - .03;
      txt(c, p, x, 0, { px: 68, w: 800, col: on && t < w.t1 + .25 ? GOLD2 : on ? '#ffffff' : 'rgba(255,255,255,.55)', align: 'left', shadow: 22, id: 'cap' + cd.id, pass: true });
      x += widths[i] + sp;
    });
    c.restore();
  }

  // ───────── the render
  function render(c, tr) {
    const t = toC(tr);   // picture on the canonical clock; captions on the voice's clock
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    let hud = 1, done = false, reset = false, gl = null;

    if (t < CUE.turn + .6) {
      // 1–2. Earth, the message, the send; then we pull away with the pulse
      const pull = eio(seg(t, 4.5, 6.4)), tilt = eio(seg(t, CUE.turn - .2, CUE.turn + .6));
      sky(c, t, { z: 1 + .05 * t / 6, a: .55 + .45 * pull, dy: tilt * -260 });
      const er = lerp(lerp(400, 430, seg(t, 0, 4.4)), 26, pull), ey = lerp(860, 1180, pull) + tilt * 1500;
      earth(c, 540, ey, er);
      const [ix, iy] = indiaXY(540, ey, er);
      // message bubble
      const bk = seg(t, .25, .55), col = seg(t, CUE.send - .25, CUE.send + .05);
      if (t < CUE.send + .1 && bk > 0) {
        const n = Math.floor(seg(t, typeT0, typeT1) * hello.length), s = hello.slice(0, n);
        c.save(); c.globalAlpha = (1 - col) * bk; c.font = font(46, 700);
        const bw = Math.max(140, c.measureText(hello).width + 80), bx = 540 - bw / 2, by = 1150 + (1 - eo3(bk)) * 30;
        c.beginPath(); c.roundRect(bx, by, bw, 92, 46); c.fillStyle = 'rgba(232,178,74,.95)'; c.fill();
        txt(c, s + ((t * 2) % 1 < .55 && n < hello.length ? '|' : ''), bx + 40, by + 47, { px: 46, w: 700, col: '#1a1206', align: 'left', id: 'hello', pass: true });
        c.restore();
      }
      // the bubble becomes a gold point that flies to India and leaves as a pulse
      const fly = seg(t, CUE.send - .05, CUE.pulse);
      if (t >= CUE.send - .05 && t < CUE.pulse) { const p = eio(fly); pulseDot(c, lerp(540, ix, p), lerp(1196, iy, p) - Math.sin(p * Math.PI) * 120, 9); }
      if (t >= CUE.pulse) {
        rings(c, ix, iy, CUE.pulse, t, 3, 700);
        const up = eio(seg(t, CUE.pulse + .3, 6.2));
        const px = lerp(ix, VP[0], up), py = lerp(iy, VP[1] - 120, up) + tilt * 0;
        c.strokeStyle = 'rgba(232,178,74,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(ix, iy); c.lineTo(px, py); c.stroke();
        pulseDot(c, px, py, 8);
      }
      vignette(c, .55);
    } else if (t < CUE.arrive + .05) {
      // 2–5. the ride: forward view toward Voyager's real direction (Ophiuchus, by the Milky Way's core)
      const zf = 1 + .35 * seg(t, CUE.turn, CUE.arrive) ** 1.6, rot = -.04 + .06 * seg(t, CUE.turn, CUE.arrive);
      sky(c, t, { z: zf, a: 1, dy: (1 - eo3(seg(t, CUE.turn, CUE.turn + .8))) * 360, rot });
      nearStars(c, t, clamp(seg(t, CUE.turn, CUE.turn + 1)));
      // Moon (3D, LRO colour map) passing at the left
      let S = null;
      if (t > 9.0 && t < 11.26) {
        // constant speed past a Moon 1.5 radii to the left: it grows, slides left and whooshes out of frame (its centre leaves at 10.95 s = 1.28 light-seconds)
        const zz = -8.7 - (10.95 - t) * 18.6;
        S = { moon: { pos: [-1.5, 0, zz], rot: 2.4 + t * .05 }, sun: [6, 1.5, 6], cam: { pos: [0, 0, 0], look: [0, 0, -1], fov: 34 } };
      }
      if (S && G.render(S)) { c.save(); c.globalAlpha = seg(t, 9.95, 10.25); c.drawImage(G.canvas, 0, 0); c.restore(); }
      const ml = env(t, 10.1, 13.1, .2, .4);
      if (ml > 0) { c.save(); c.globalAlpha = ml; txt(c, 'THE MOON', 700, 760, { px: 34, w: 800, col: INK, align: 'left', ls: 4, id: 'moon', shadow: 14 }); txt(c, '1.3 light-seconds', 700, 804, { px: 30, w: 600, col: DIM, align: 'left', id: 'moon2', shadow: 14 }); c.restore(); }
      // Neptune (Voyager 2's 1989 photograph) passing at the right
      if (t > 12.6 && t < 15.2) {
        const r = lerp(8, 560, ei2(seg(t, 12.6, 14.4))) * (1 + 1.2 * ei3(seg(t, 14.3, 15.2))), x = VP[0] + 60 + r * .95 + 900 * ei3(seg(t, 14.3, 15.2)), y = VP[1] + 40 + r * .25;
        neptune(c, x, y, r, clamp(seg(t, 12.6, 13.0)));
      }
      const la = env(t, 13.2, 16.6, .2, .4);
      if (la > 0) { c.save(); c.globalAlpha = la; txt(c, 'NEPTUNE', 110, 1130, { px: 40, w: 800, col: INK, align: 'left', ls: 4, id: 'nep', shadow: 14 }); txt(c, '≈ 4 light-hours', 110, 1180, { px: 30, w: 600, col: DIM, align: 'left', id: 'nep2', shadow: 14 }); c.restore(); }
      // the message ahead of us
      const pa = 1 - seg(t, CUE.arrive - .25, CUE.arrive);
      c.save(); c.globalCompositeOperation = 'lighter'; pulseDot(c, VP[0], VP[1] - 120 + 120 * seg(t, CUE.turn, CUE.turn + 1.2), 8 + 2 * Math.sin(t * 9), pa); c.restore();
      // Voyager glint ahead, then contact
      if (t > CUE.glint) { const k = seg(t, CUE.glint, CUE.arrive); glow(c, VP[0], VP[1], 40 + 160 * k, '220,230,255', .5 * k); c.beginPath(); c.arc(VP[0], VP[1], 2 + 3 * k, 0, 7); c.fillStyle = '#fff'; c.fill(); }
      // 2. the milestone card
      const ca = env(t, 6.75, 10.0, .25, .35);
      if (ca > 0) {
        c.save(); c.globalAlpha = ca; const y0 = 760 + (1 - eo3(seg(t, 6.75, 7.2))) * 40;
        txt(c, '1 LIGHT-DAY', W / 2, y0, { px: 168, w: 900, col: GOLD2, id: 'ld', shadow: 30, ls: -3 });
        txt(c, '= 25.9 BILLION KM', W / 2, y0 + 118, { px: 58, w: 800, col: INK, id: 'ld2', shadow: 20, ls: 1 });
        const cy = y0 + 210, ck = seg(t, 7.5, 7.9);
        c.globalAlpha = ca * ck; c.beginPath(); c.roundRect(W / 2 - 170, cy - 32, 340, 64, 32); c.strokeStyle = GOLD; c.lineWidth = 2.5; c.stroke();
        txt(c, '18 NOV 2026', W / 2, cy + 2, { px: 34, w: 800, col: GOLD2, id: 'date', ls: 4 });
        c.restore();
      }
      // "twenty hours of nothing": the clock is the only thing moving
      vignette(c, .6);
    } else if (t < CUE.record + .45 || (t >= CUE.back && t < CUE.whip + .05)) {
      // 6. Voyager 1 (NASA 3D model): the dish faces home, so it faces us. 9. later: it turns around
      done = true;
      const ws = t >= CUE.back ? ei3(seg(t, CUE.whip - .3, CUE.whip + .05)) : 0;   // the whip: this shot streaks off to the right
      c.save(); c.translate(ws * W * 1.15, 0);
      sky(c, t, { z: 1.35 + .02 * (t - 24), a: 1, rot: .02 });
      nearStars(c, t, .6);
      const k = eo3(seg(t, CUE.arrive, 27.0)), turning = t >= CUE.back;
      const turnK = turning ? eio(seg(t, 38.3, 39.9)) : 0, pushOut = turning ? eio(seg(t, CUE.back, 38.6)) : 0;
      const zz = lerp(-30, -1.75, k) + (turning ? 0 : Math.max(0, t - 27) * .035) - pushOut * .25;
      const yaw = -1.15 + .05 * Math.min(t - 24, 8) + turnK * Math.PI;
      const S = { voy: { pos: [.12, .1, zz], rot: [Math.PI / 2 - .55, yaw, .18], off: [0, .14, .25] },
        sun: [-2, 1.2, 5], cam: { pos: [0, 0, 0], look: [0, .02, -1], fov: 32 } };
      if (G.render(S)) { c.drawImage(G.canvas, 0, 0); for (let i = 1; i <= 4 && ws > 0; i++) { c.save(); c.globalAlpha = .22; c.drawImage(G.canvas, -i * 80 * ws, 0); c.restore(); } }
      // arrival flash
      if (t < CUE.arrive + 1.2) { const f = seg(t, CUE.arrive, CUE.arrive + 1.2); rings(c, VP[0], VP[1], CUE.arrive, t, 3, 1100); glow(c, VP[0], VP[1], 900, '255,226,170', .55 * (1 - f) ** 2); }
      // stats, on the words
      if (!turning) L.stats.forEach(([big, small], i) => {
        const a = seg(t, statC[i], statC[i] + .25) * (1 - seg(t, CUE.record, CUE.record + .35)); if (a <= 0) return;
        const y = 1150 + i * 96; c.save(); c.globalAlpha = a; c.translate((1 - eo3(seg(t, statC[i], statC[i] + .35))) * -40, 0);
        const bw = txt(c, big, 110, y, { px: 76, w: 900, col: GOLD2, align: 'left', id: 'stat' + i, shadow: 20 });
        txt(c, small, 110 + bw + 24, y + 6, { px: i === 1 ? 30 : 36, w: 600, col: INK, align: 'left', id: 'statL' + i, shadow: 16 });
        c.restore();
      });
      // into the record: a gold circle opens from the side of the bus
      if (t > CUE.record - .3 && t < CUE.record + .45) { const k2 = eio(seg(t, CUE.record - .3, CUE.record + .45)); record(c, 540, 780, lerp(30, 380, k2), t, k2); }
      // 9. the turn: back from the record, then it swings round to face the Sun
      if (turning && t < 38.4) { const k2 = 1 - eio(seg(t, CUE.back, 38.4)); record(c, 540, 780, lerp(30, 380, k2), t, k2); }
      const wh = turning ? 1 - seg(t, 39.0, 39.4) : 0; hud = 1 - wh;   // the question stays over the turn; the clock returns after it
      if (wh > 0) { c.save(); c.globalAlpha = wh; txt(c, L.where, W / 2, 330, { px: 88, w: 500, fam: 'NewsD', it: true, col: INK, id: 'where', shadow: 26 }); c.restore(); }
      c.restore();
      // ...and the Pale Blue Dot streaks in from the left, with motion-blur ghosts
      if (ws > 0) for (let i = 4; i >= 0; i--) paleBlueDot(c, 1.03, i ? .2 : 1, W / 2 + (ws - 1) * W * 1.15 - i * 90 * (1 - ws));
      vignette(c, .6);
    } else if (t < CUE.back) {
      // 7–8. the golden record, and its Indian raga
      hud = .0; done = true;
      sky(c, t, { z: 1.4, a: .45 });
      const rk = 1 + .04 * seg(t, CUE.record, CUE.back);
      record(c, 540, 780, 380 * rk, t);
      const ja = seg(t, jaatC, jaatC + .4);
      if (ja > 0) {
        c.save(); c.globalAlpha = ja; const y = 1330 + (1 - eo3(ja)) * 20;
        txt(c, 'जात कहाँ हो', W / 2, y - 30, { px: 104, fam: 'Deva', col: '#fff2d6', id: 'jaat', shadow: 26 });
        txt(c, 'KESARBAI KERKAR  ·  RAAG BHAIRAVI', W / 2, y + 62, { px: 28, w: 700, col: GOLD, ls: 4, id: 'kk', shadow: 14 });
        c.restore();
      }
      const wa = seg(t, whereC - .05, whereC + .35);
      if (wa > 0) { c.save(); c.globalAlpha = wa; txt(c, L.where, W / 2, 330, { px: 88, w: 500, fam: 'NewsD', it: true, col: INK, id: 'where', shadow: 26 }); c.restore(); }
      vignette(c, .65);
    } else if (t < CUE.q) {
      // 9–10. the real Pale Blue Dot; push to the pixel
      done = true; hud = 1 - seg(t, CUE.dot, CUE.dot + .6);
      const wk = seg(t, CUE.dot - .05, CUE.dot + .35);
      const z = 1.03 * Math.exp(Math.log(15.5) * eio(seg(t, 41.2, CUE.stop2)));
      const s = paleBlueDot(c, z, 1);
      const dx = W / 2, dy = PBY;
      // pixel grid around the dot: one cell = one pixel of Voyager's camera frame
      const ga = seg(t, 45.8, 46.6);
      if (ga > 0 && s > 8) {
        c.save(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
        const ox = dx - (PB.dx % 1) * s, oy = dy - (PB.dy % 1) * s, N = 5;
        for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
          const f = clamp(1 - Math.hypot(i + .5, j + .5) / (N + .5)); if (f <= 0) continue;
          c.globalAlpha = ga * .5 * f; c.strokeRect(ox + i * s, oy + j * s, s, s);
        }
        c.globalAlpha = ga; c.strokeStyle = GOLD2; c.lineWidth = 3; c.strokeRect(ox + 4 * s, oy - 4 * s, s, s);
        txt(c, '= 1 pixel', ox + 5.4 * s, oy - 3.5 * s, { px: 32, w: 700, col: GOLD2, align: 'left', id: 'px1', shadow: 14 });
        c.restore();
      }
      // the gold ring: "that's us"
      const ra = seg(t, usC[0] - .1, usC[0] + .5);
      if (ra > 0) { c.save(); c.globalAlpha = ra; c.beginPath(); c.arc(dx, dy, lerp(170, Math.max(52, s * 1.7), eo3(ra)), 0, 7); c.strokeStyle = GOLD2; c.lineWidth = 4; c.stroke(); c.restore(); }
      // credit + date
      const la = env(t, 41.4, 45.6, .4, .4);
      if (la > 0) { c.save(); c.globalAlpha = la; txt(c, 'REAL PHOTO · 14 FEB 1990 · 6 BILLION KM', W / 2, 400, { px: 30, w: 700, col: INK, ls: 3, id: 'pbd', shadow: 16 }); txt(c, 'Voyager 1 · NASA / JPL-Caltech', W / 2, 446, { px: 26, w: 600, col: DIM, id: 'pbd2', shadow: 12 }); c.restore(); }
      // "That's us. All of us… smaller than one pixel." as titles
      L.us.forEach((s_, i) => {
        const a = seg(t, usC[i], usC[i] + .35); if (a <= 0) return;
        c.save(); c.globalAlpha = a; txt(c, s_, W / 2, 1270 + i * 92 + (1 - eo3(a)) * 14, { px: i === 0 ? 96 : 76, w: 500, fam: 'NewsD', it: true, col: i === 0 ? '#ffffff' : INK, id: 'us' + i, shadow: 26 }); c.restore();
      });
      vignette(c, .5);
    } else {
      // 11–12. the photo closes into a round window; the question; the end card; the loop back to frame one
      reset = true; hud = seg(t, CUE.q + .3, CUE.q + .9);
      sky(c, t, { z: 1 + .02 * (t - CUE.q), a: .8 });
      const k = eio(seg(t, CUE.q, CUE.q + 1.0)), pa = 1 - seg(t, CUE.card - .3, CUE.card + .4);
      porthole(c, W / 2, lerp(PBY, 640, k), lerp(1400, 220, k), Math.exp(lerp(Math.log(16), Math.log(2.4), k)), pa, k);
      if (k > .6) { c.save(); c.globalAlpha = pa * seg(k, .6, 1); c.beginPath(); c.arc(W / 2, 640, 30, 0, 7); c.strokeStyle = GOLD2; c.lineWidth = 3; c.stroke(); c.restore(); }
      const ia = seg(t, l10C - .05, l10C + .35) * pa;
      if (ia > 0) { c.save(); c.globalAlpha = ia; txt(c, L.ifLine, W / 2, 960, { px: 58, w: 500, fam: 'NewsD', it: true, col: INK, id: 'if', shadow: 22 }); c.restore(); }
      const qa = seg(t, qC - .05, qC + .3) * pa;
      if (qa > 0) {
        c.save(); c.globalAlpha = qa; const kb = back(seg(t, qC - .05, qC + .45));
        c.translate(W / 2, 1140); c.scale(.9 + .1 * kb, .9 + .1 * kb);
        txt(c, L.q[0], 0, -66, { px: 124, w: 900, col: INK, id: 'q0', shadow: 30, ls: -2 });
        txt(c, L.q[1], 0, 62, { px: 124, w: 900, col: GOLD2, id: 'q1', shadow: 30, ls: -2 });
        c.restore();
        // the empty message bubble, waiting (the opening, unsent)
        const ba = seg(t, qC + .05, qC + .35) * pa;
        c.save(); c.globalAlpha = ba; c.beginPath(); c.roundRect(W / 2 - 200, 1330, 400, 84, 42); c.fillStyle = 'rgba(232,178,74,.95)'; c.fill();
        if ((t * 1.6) % 1 < .55) { c.fillStyle = '#1a1206'; c.fillRect(W / 2 - 200 + 42, 1352, 4, 40); }
        txt(c, L.comment, W / 2, 1468, { px: 38, w: 700, col: INK, id: 'cmt', shadow: 16 });
        c.restore();
      }
      const ea = seg(t, CUE.card, CUE.card + .7) * (1 - seg(t, 58.9, 59.6));
      if (ea > 0) {
        c.save(); c.globalAlpha = ea; const k = eo3(seg(t, CUE.card, CUE.card + .9));
        const ls = 190; c.drawImage(I.logo, W / 2 - ls / 2, 600 + (1 - k) * 30, ls, ls);
        txt(c, 'CosmosLens', W / 2, 900, { px: 124, w: 600, fam: 'NewsD', col: '#ffffff', id: 'brand', shadow: 24 });
        txt(c, 'The sky, explained.', W / 2, 990, { px: 42, w: 500, col: DIM, id: 'tag' });
        c.strokeStyle = 'rgba(232,178,74,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 60, 1060); c.lineTo(W / 2 + 60, 1060); c.stroke();
        txt(c, 'Follow for more space stories', W / 2, 1130, { px: 40, w: 700, col: INK, id: 'fol' });
        txt(c, 'link in bio  ·  cosmoslens.com', W / 2, 1186, { px: 38, w: 700, col: GOLD2, id: 'url' });
        c.restore();
      }
      // loop: the last half-second becomes frame one
      const la = seg(t, 59.0, 59.95);
      if (la > 0) { c.save(); c.globalAlpha = la; sky(c, 0, { z: 1, a: .55 }); earth(c, 540, 860, 400); c.restore(); }
      vignette(c, .55);
    }

    clock(c, t, hud * (t < .0 ? 0 : 1), { done, reset });
    captions(c, tr);
  }

  return {
    dur: +ENDL.toFixed(3), ev, subs,
    cues: { BPM, BEAT, BAR, ...CUE, END, warp: K, statT: statC, jaatT: jaatC, whereT: whereC, usT: usC, qT: qC },   // canonical clock + the map
    texts: t => { COLLECT = []; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; render(cv.getContext('2d'), t); const r = COLLECT; COLLECT = null; return r; },
    render,
  };
}
