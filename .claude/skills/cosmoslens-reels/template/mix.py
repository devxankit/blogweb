"""Foley + ambience + VO + score → out/mix-<lang>.wav.   python mix.py <lang>
Layers: ambience (deep-space rumble; a faint carrier hiss once we reach Voyager) | foley from events | VO | score (ducked under VO)."""
import sys, os, json, numpy as np, soundfile as sf, soxr
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, add, compress, limit, whoosh as sfx_whoosh, thump, click, quindar
from core.audio import sampler as S
HERE = os.path.dirname(os.path.abspath(__file__))
LANG = sys.argv[1] if len(sys.argv) > 1 else 'en'
ev = json.load(open(os.path.join(HERE, f'events-{LANG}.json'), encoding='utf-8')); E = ev['ev']; DUR = ev['dur']
C = next(e for e in E if e['type'] == 'cues')
rng = np.random.default_rng(23)
NS = int((DUR + 1) * SR)
fol, amb, vo = (np.zeros((NS, 2), np.float32) for _ in range(3))
tt = lambda d: np.arange(int(d * SR)) / SR
def db(x): return 10 ** (x / 20)
def dec(d, tau): return np.exp(-tt(d) / tau)
def nz(d): return rng.standard_normal(int(d * SR))
def ring(fs, taus, amps, d):
    x = np.zeros(int(d * SR)); t = tt(d)
    for f, ta, am in zip(fs, taus, amps): x += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / ta) * am
    return x
def mixa(*xs):
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out
def put(buf, x, t, g=1., pan=0.):
    if 0 <= t < DUR: add(buf, np.asarray(x, np.float32), t, g, pan)
def env_ad(d, a, r):
    n = int(d * SR); e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na); e[n - nr:] = np.minimum(e[n - nr:], np.linspace(1, 0, nr)); return e

# ───────── foley
def key(): return (click(rng.uniform(1.5, 2.1), .6) * .3).astype(np.float32)
def send():
    d = .32; t = tt(d); f = 700 + 1600 * (t / d) ** 2
    return mixa(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * .16, sfx_whoosh(.3, .5) * .35)
def pulse():
    # the radio pulse leaves: a clean beep (the Deep Space Network's tone family) + a low thump + air
    return mixa(quindar(.8)[:int(.35 * SR)] * .35, thump(.8, 55)[:int(.6 * SR)] * .6, lp(nz(1.2), 900) * dec(1.2, .3) * .12)
def thud(v=1.): return thump(.7, 70)[:int(.35 * SR)] * .5 * v
def tick(): return click(2.4, .8) * .22
def passby(d, v=1.):
    # a body rushing past: filtered noise swelling and falling, with a low doppler hum
    t = tt(d); e = np.exp(-((t - d * .55) / (d * .22)) ** 2)
    f = 90 * (1.25 - .5 * (t / d)); hum = np.sin(2 * np.pi * np.cumsum(f) / SR) * .3
    return (bp(nz(d), 150, 2200) * .5 + hum) * e * .5 * v
def riser(d):
    t = tt(d); k = t / d; f = 120 + 900 * k ** 2.4
    x = bp(nz(d), 400, 7000) * k ** 2.6 * .2 + np.sin(2 * np.pi * np.cumsum(f) / SR) * k ** 3 * .06
    ticks = np.zeros(int(d * SR))                       # the clock's ticks blur into a whir
    tt_ = 0.; step = .5
    while tt_ < d - .05:
        i = int(tt_ * SR); c = click(2.6, .5)[:int(.03 * SR)]; ticks[i:i + len(c)] += c[:len(ticks) - i] * .12; step = max(.02, step * .9); tt_ += step
    return x + ticks
def shimmer(v=1.):
    d = 1.8; x = np.zeros(int(d * SR))
    for k in range(9):
        f = rng.choice([1174.7, 1760, 2349.3, 2637, 3520]); o = int(rng.uniform(0, .6) * SR)
        r = ring([f, f * 2.01], [.6, .25], [1, .25], d - .6); x[o:o + len(r)] += r * rng.uniform(.4, 1)
    return x * .045 * v
def boom():
    x = thump(1., 42).astype(float); n = int(2.2 * SR); y = np.zeros(n); y[:len(x)] += x * 1.3
    y += lp(nz(2.2), 260) * dec(2.2, .45) * .5 + bp(nz(2.2), 1500, 8000) * dec(2.2, .25) * .1
    return y * .9
def carrier(d):
    # faint deep-space hiss with a soft, slowly wavering carrier tone and rare telemetry chirps
    t = tt(d); x = bp(nz(d), 1500, 6000) * .012 + np.sin(2 * np.pi * (2300 + 6 * np.sin(2 * np.pi * .2 * t)) * t) * .004
    for k in range(8):
        i = int(rng.uniform(1, d - 1) * SR); c = np.sin(2 * np.pi * rng.choice([1800, 2600, 3100]) * tt(.05)) * .015
        x[i:i + len(c)] += c
    return x * env_ad(d, .8, 1.0)
def stat(i): return mixa(click(1.4, .7) * .25, thump(.35, 110)[:int(.12 * SR)] * .35)
def needle():
    d = 2.2; x = (rng.random(int(d * SR)) < .0015) * rng.uniform(-1, 1, int(d * SR)); x = hp(x, 1500) * .5 + lp(nz(d), 300) * .01
    return mixa(thump(.3, 140)[:int(.1 * SR)] * .3, x * env_ad(d, .05, .8) * .35)
def suck(): return sfx_whoosh(.4, .7)[::-1] * .5
def servo(d):
    t = tt(d); f = 260 + 60 * np.sin(np.pi * t / d)
    x = lp((np.cumsum(f) / SR % 1) * 2 - 1, 900) * np.sin(np.pi * t / d) ** 1.5
    return x * .06
def whip(): return sfx_whoosh(.45, 1.) * .7
def shutter():
    a = click(1.1, 1.)[:int(.05 * SR)] * .3; b = click(.8, .8)[:int(.06 * SR)] * .25
    x = np.zeros(int(.2 * SR)); x[:len(a)] += a; i = int(.08 * SR); x[i:i + len(b)] += b
    return x
def logo(): return mixa(shimmer(1.3) * 1.1, sfx_whoosh(.5, .6) * .35)

for e in E:
    ty, t, pan, v = e['type'], e['t'], e.get('pan', 0), e.get('v', 1)
    if ty == 'key': put(fol, key(), t, 1, pan)
    elif ty == 'send': put(fol, send(), t, 1, .1)
    elif ty == 'pulse': put(fol, pulse(), t, 1, 0)
    elif ty == 'whoosh': put(fol, sfx_whoosh(e['dur'], 1.) * .5 * v, t, 1, pan)
    elif ty == 'thud': put(fol, thud(v), t, .5, 0)
    elif ty == 'tick': put(fol, tick(), t, 1, 0)
    elif ty == 'pass': put(fol, passby(e['dur'], v), t, 1, pan)
    elif ty == 'riser': put(fol, riser(e['dur']), t, 1, 0)
    elif ty == 'shimmer': put(fol, shimmer(v), t, 1, 0)
    elif ty == 'boom': put(fol, boom(), t, 1, 0)
    elif ty == 'carrier': put(amb, carrier(e['dur']), t, 1, 0)
    elif ty == 'stat': put(fol, stat(e['i']), t, 1, -.2)
    elif ty == 'needle': put(fol, needle(), t, 1, .1)
    elif ty == 'suck': put(fol, suck(), t, 1, 0)
    elif ty == 'servo': put(fol, servo(e['dur']), t, 1, .2)
    elif ty == 'whip': put(fol, whip(), t, 1, -.3)
    elif ty == 'shutter': put(fol, shutter(), t, 1, .1)
    elif ty == 'logo': put(fol, logo(), t, 1, 0)

# ───────── ambience: deep-space rumble (never a "room"), lifting during the ride
d = DUR + .5; t = tt(d)
rum = lp(nz(d), 110) * .03 + lp(nz(d), 400) * .004
lift = np.interp(t, [0, 4.5, 16, 23.9, 24.1, 31, C['stop1'], C['back'], C['q'], DUR], [.6, .6, 1., 1.6, .7, .6, .5, .6, .5, .4])
put(amb, rum * lift, 0, 1, 0); put(amb, np.roll(rum, 911) * lift, 0, .8, .3)
amb = S.room(amb, size=.7, mix=.35)

# ───────── VO (24k → 48k), compressed
lines = json.load(open(os.path.join(HERE, f'lines-{LANG}.json'), encoding='utf-8'))
vo_t = {e['id']: e['t'] for e in E if e['type'] == 'vo'}
vm = np.zeros(NS, np.float32)
for L in lines:
    y, sr = sf.read(os.path.join(HERE, f'voices-{LANG}', L['id'] + '.wav'))
    y = soxr.resample(y.astype(np.float32), sr, SR); i = int(vo_t[L['id']] * SR); vm[i:i + len(y)] += y[:NS - i]
vm = hp(vm, 80); vm = compress(vm / (np.abs(vm).max() + 1e-9) * .8, thr=.2, ratio=3.0, att=.004, rel=.1)
vo[:, 0] = vm; vo[:, 1] = vm
vo = vo * .9 + S.room(vo, size=.25, mix=.1) * .1

# ───────── score, ducked under speech
mus, _ = sf.read(os.path.join(HERE, 'music', 'score.wav')); mus = mus[:NS]
if len(mus) < NS: mus = np.pad(mus, ((0, NS - len(mus)), (0, 0)))
env = np.convolve(np.abs(vm), np.ones(int(.05 * SR)) / int(.05 * SR), 'same'); on = (env > .02).astype(np.float32)
att, rel = int(.06 * SR), int(.45 * SR); g = 0.; dk = np.zeros(NS, np.float32)
for j in range(0, NS, 240):
    tgt = on[j]; g += (tgt - g) * (240 / att if tgt > g else 240 / rel); dk[j:j + 240] = g
mus = mus * (1 - (1 - db(-6)) * dk)[:, None]

def rms(x): m = np.abs(x).max(1) > 1e-4; return float(np.sqrt(np.mean(x[m] ** 2))) if m.any() else 1.
vo_r, mu_r, fo_r = rms(vo), rms(mus), rms(fol)
mix = vo + mus * (vo_r / mu_r) * db(-7) + fol * (vo_r / fo_r) * db(-11) + amb * 1.4
mix = mix / (np.abs(mix).max() + 1e-9) * .95
mix = np.stack([limit(mix[:, c] * 2.2, .5) for c in range(2)], 1)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', f'mix-{LANG}.wav'), mix[:int(DUR * SR)].astype(np.float32), SR)
print(LANG, 'rms vo/music/foley', round(20 * np.log10(vo_r), 1), round(20 * np.log10(mu_r), 1), round(20 * np.log10(fo_r), 1), 'peak', round(float(np.abs(mix).max()), 3))
