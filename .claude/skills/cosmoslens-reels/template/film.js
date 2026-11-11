// CosmosLens Reel __NN__, "__TITLE__". 1080×1920, 30 fps, one picture timeline, two narrations (?lang=en | ?lang=hi).
// Skeleton from the cosmoslens-reels skill. Keep the machinery (helpers, narration timing, captions, events, end card);
// replace SCENES with this reel's story. Reference implementation: .claude/skills/cosmoslens-reels/reference/01-voyager-one-light-day/film.js
// import { makeGL } from './gl.js';   // uncomment for 3D (three.js): a textured sphere and a .glb model are ready in gl.js

const W = 1080, H = 1920, END = 60.0;
const BPM = 80, BEAT = 60 / BPM, BAR = BEAT * 4;           // the music grid: cuts and hits land on it
const GOLD = '#e8b24a', GOLD2 = '#ffd27a', BLUE = '#6f97f4', INK = '#e8ecf2', DIM = '#8a93a6', BG = '#04060b';   // CosmosLens logo palette

// one start time per narration line and language (Hindi reads ~20–30 % longer: give it its own slots)
const VOS = {
  en: { l01: .15, l02: 4.4, l03: 10.0, l04: 16.0, l05: 24.0, l06: 31.0, l07: 38.0, l08: 44.0, l09: 49.2 },
  hi: { l01: .15, l02: 4.2, l03: 10.0, l04: 16.0, l05: 24.0, l06: 31.0, l07: 38.0, l08: 44.0, l09: 49.0 },
};
let VO = VOS.en;
// story beats: picture, music and mix all read these (exported as window.EV 'cues')
const CUE = { hook: 0, turn: 24.0, stop1: 36.5, back: 37.8, stop2: 47.9, q: 48.7, card: 55.0, chord: 58.5 };

// on-screen copy per language (brand words and numbers stay English)
const COPY = {
  en: { q: ['WHAT WOULD', 'YOU DO?'], comment: 'Tell us in the comments', qW: /what/i },
  hi: { q: ['AAP KYA', 'KAROGE?'], comment: 'Comment mein batao', qW: /kya/i },
};

// ───────── helpers
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo3 = k => 1 - Math.pow(1 - clamp(k), 3), ei3 = k => Math.pow(clamp(k), 3), ei2 = k => clamp(k) ** 2;
const eio = k => { k = clamp(k); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const back = k => { k = clamp(k); const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const env = (t, a, b, fi = .3, fo = .3) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const font = (px, w = 700, fam = 'Sch', it = false) => fam === 'Deva' ? `700 ${px}px Deva` : `${it ? 'italic ' : ''}${w} ${px}px ${fam}`;
const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('missing ' + src)); i.src = src; });

// every text goes through txt(): it draws and, while collecting, records its box for readcheck.mjs
// pass: true = not meant to be read in full (typing animations, HUD numbers, word-by-word captions)
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
function vignette(c, k = .6) {
  const g = c.createRadialGradient(W / 2, H * .46, H * .25, W / 2, H * .5, H * .78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
// an image drawn to cover the frame around a focal point, with zoom (Ken Burns)
function cover(c, img, z = 1, fx = .5, fy = .5, a = 1) {
  const s = Math.max(W / img.width, H / img.height) * z;
  c.save(); c.globalAlpha = a; c.drawImage(img, W / 2 - fx * img.width * s, H / 2 - fy * img.height * s, img.width * s, img.height * s); c.restore();
}

export async function build(lang = 'en', opt = {}) {
  const L = COPY[lang] || COPY.en; VO = VOS[lang] || VOS.en;
  const I = {};
  // await Promise.all(['earth', 'stars'].map(async n => I[n] = await load(`img/${n}.jpg`)));
  I.logo = await load('img/logo.svg');
  // const G = await makeGL(W, H);

  // narration: durations + Whisper word timings (written by tts.py / asr_check.py); before the voice exists, an even estimate
  const lines = await fetch(`lines-${lang}.json`).then(r => r.json());
  let dur = {}, words = {};
  try { dur = await fetch(`voices-${lang}/dur.json`).then(r => { if (!r.ok) throw 0; return r.json(); }); words = await fetch(`voices-${lang}/words.json`).then(r => { if (!r.ok) throw 0; return r.json(); }); }
  catch { for (const l of lines) dur[l.id] = (l.sub || l.roman || l.text).split(/\s+/).length * .36 + .3; }

  // display words, timed: Whisper's times when the word counts match (English), else spread by length (Hinglish: Whisper hears Devanagari)
  const W8 = {};
  for (const l of lines) {
    const show = (lang === 'hi' ? l.roman : (l.sub || l.text)).split(/\s+/).filter(Boolean);
    const ww = words[l.id], t0 = VO[l.id] ?? 0;
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
    let cur = [];
    const flush = () => { if (cur.length) CARDS.push({ id: l.id, ws: cur }); cur = []; };
    W8[l.id].forEach(w => { const len = cur.reduce((p, q) => p + q.w.length + 1, 0); if (cur.length && (len + w.w.length > 16 || cur.length >= 4)) flush(); cur.push(w); if (/[.,?!:…]$/.test(w.w) && len + w.w.length > 6) flush(); });
    flush();
  }
  CARDS.forEach((cd, i) => { cd.t0 = cd.ws[0].t0 - .06; const nx = CARDS[i + 1]; const endL = lineEnd(cd.id) + .35;
    cd.t1 = nx && nx.id === cd.id ? nx.ws[0].t0 - .06 : Math.min(endL, nx ? nx.ws[0].t0 - .1 : END); });
  if (CARDS.length) CARDS[0].t0 = 0;                    // the hook is readable on frame one (and in the thumbnail)
  const NOCAP = new Set(['l09']);                       // lines shown as big titles instead of captions
  const qT = Math.max(VO.l09 + 1.0, findW('l09', L.qW, VO.l09 + 2.2) - .1);
  const subs = lines.map((l, i) => {
    const t0 = VO[l.id], next = i + 1 < lines.length ? VO[lines[i + 1].id] : END;
    return { t0, t1: Math.min(next - .05, Math.max(t0 + (dur[l.id] || 2) + .45, t0 + 1.8)), text: lang === 'hi' ? l.roman : (l.sub || l.text) };
  });

  // ───────── events for the mixer (every visible action gets a sound)
  const ev = [];
  const E = (t, type, o = {}) => ev.push({ t: +t.toFixed(3), type, ...o });
  for (const id in VO) E(VO[id], 'vo', { id });
  E(CUE.turn, 'boom'); E(CUE.q + .1, 'whoosh', { dur: .6, v: .8 }); E(CUE.card, 'whoosh', { dur: .5, v: .7 }); E(CUE.card + .3, 'logo');

  // ───────── captions: word by word, the spoken word in gold (most Reels are watched muted)
  function captions(c, t) {
    if (opt.nosubs) return;
    const cd = CARDS.find(k => t >= k.t0 && t < k.t1 && !NOCAP.has(k.id));
    if (!cd) return;
    const k = cd.t0 <= 0 ? 1 : seg(t, cd.t0, cd.t0 + .14), y = 1400;   // safe zone: nothing key below 1540 or above 220
    c.save(); c.globalAlpha = k;
    c.font = font(68, 800); const parts = cd.ws.map(w => w.w.toUpperCase()), sp = 18;
    const widths = parts.map(p => c.measureText(p).width), total = widths.reduce((a, b) => a + b, 0) + sp * (parts.length - 1);
    const sc = Math.min(1, 940 / total); c.translate(W / 2, y + (1 - eo3(k)) * 16); c.scale(sc * (.96 + .04 * back(k)), sc * (.96 + .04 * back(k)));
    let x = -total / 2;
    parts.forEach((p, i) => {
      const w = cd.ws[i], on = t >= w.t0 - .03;
      txt(c, p, x, 0, { px: 68, w: 800, col: on && t < w.t1 + .25 ? GOLD2 : on ? '#ffffff' : 'rgba(255,255,255,.55)', align: 'left', shadow: 22, id: 'cap' + cd.id, pass: true });
      x += widths[i] + sp;
    });
    c.restore();
  }

  // ───────── scenes: replace with the story. Each draws the full frame for its window.
  const SCENES = [
    { t0: 0, t1: CUE.turn, draw(c, t) {
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1424'); g.addColorStop(1, BG); c.fillStyle = g; c.fillRect(0, 0, W, H);
      glow(c, W / 2, 860, 380 + 20 * Math.sin(t), '232,178,74', .35);
      txt(c, 'HOOK GOES HERE', W / 2, 860, { px: 96, w: 900, col: GOLD2, id: 'hook', shadow: 30 });
      vignette(c, .55);
    } },
    { t0: CUE.turn, t1: CUE.q, draw(c, t) {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      glow(c, W / 2, 860, 520, '111,151,244', .3 * env(t, CUE.turn, CUE.q, .6, .6));
      vignette(c, .55);
    } },
    { t0: CUE.q, t1: END, draw(c, t) {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      const pa = 1 - seg(t, CUE.card - .3, CUE.card + .4);
      const qa = seg(t, qT - .05, qT + .3) * pa;
      if (qa > 0) {   // the question back to the viewer: it earns comments
        c.save(); c.globalAlpha = qa; const kb = back(seg(t, qT - .05, qT + .45));
        c.translate(W / 2, 1000); c.scale(.9 + .1 * kb, .9 + .1 * kb);
        txt(c, L.q[0], 0, -66, { px: 124, w: 900, col: INK, id: 'q0', shadow: 30, ls: -2 });
        txt(c, L.q[1], 0, 62, { px: 124, w: 900, col: GOLD2, id: 'q1', shadow: 30, ls: -2 });
        c.restore();
        c.save(); c.globalAlpha = seg(t, qT + .25, qT + .55) * pa; txt(c, L.comment, W / 2, 1220, { px: 38, w: 700, col: INK, id: 'cmt', shadow: 16 }); c.restore();
      }
      endCard(c, t);
    } },
  ];

  // the end card (≥ 4 s). Never promise a "full story" unless that article exists on cosmoslens.com
  function endCard(c, t) {
    const ea = seg(t, CUE.card, CUE.card + .7) * (1 - seg(t, 58.9, 59.6));
    if (ea <= 0) return;
    c.save(); c.globalAlpha = ea; const k = eo3(seg(t, CUE.card, CUE.card + .9));
    const ls = 190; c.drawImage(I.logo, W / 2 - ls / 2, 600 + (1 - k) * 30, ls, ls);
    txt(c, 'CosmosLens', W / 2, 900, { px: 124, w: 600, fam: 'NewsD', col: '#ffffff', id: 'brand', shadow: 24 });
    txt(c, 'The sky, explained.', W / 2, 990, { px: 42, w: 500, col: DIM, id: 'tag' });
    c.strokeStyle = 'rgba(232,178,74,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 60, 1060); c.lineTo(W / 2 + 60, 1060); c.stroke();
    txt(c, 'Follow for more space stories', W / 2, 1130, { px: 40, w: 700, col: INK, id: 'fol' });
    txt(c, 'link in bio  ·  cosmoslens.com', W / 2, 1186, { px: 38, w: 700, col: GOLD2, id: 'url' });
    c.restore();
  }

  function render(c, t) {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    const sc = SCENES.find(s => t >= s.t0 && t < s.t1) || SCENES[SCENES.length - 1];
    sc.draw(c, t);
    // loop: the last half-second becomes frame one, so the Reel replays seamlessly
    const la = seg(t, 59.0, 59.95);
    if (la > 0 && sc !== SCENES[0]) { c.save(); c.globalAlpha = la; SCENES[0].draw(c, 0); c.restore(); }
    captions(c, t);
  }

  return {
    dur: END, ev, subs,
    cues: { BPM, BEAT, BAR, ...CUE, qT },
    texts: t => { COLLECT = []; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; render(cv.getContext('2d'), t); const r = COLLECT; COLLECT = null; return r; },
    render,
  };
}
