"""Original score for "One Light-Day" → music/score.wav.   python music.py events-en.json
80 BPM (beat 0.75 s, bar 3.0 s). Raga Bhairavi's scale on Sa = D (D Eb F G A Bb C), the mode of "Jaat Kahan Ho"; no melody from that recording.
A tanpura-style drone (physically modelled, with a buzzing bridge) + orchestral samples (VSCO 2 CE, VCSL: CC0) + Salamander piano (CC BY 3.0).
Theme: half A asks (ends on komal re, Eb), half B answers (falls home to Sa, D)."""
import sys, os, json, numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, limit, lp, hp
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'events-en.json'), encoding='utf-8'))
C = next(e for e in ev['ev'] if e['type'] == 'cues'); DUR = ev['dur']
LANG = os.path.basename(sys.argv[1] if len(sys.argv) > 1 else 'events-en.json').split('-')[-1].split('.')[0]
# the score is written on the film's canonical clock and mapped to this version's time (the Hinglish voice has its own pacing)
K = C.get('warp', [[0, 0], [60, 60]]); KC, KH = [k[0] for k in K], [k[1] for k in K]
def U(t): return KH[-1] + (t - KC[-1]) if t > KC[-1] else float(np.interp(t, KC, KH))
DUR_C = C.get('END', 60.0)
B = C['BEAT']; BAR = C['BAR']
S.seed(5)
E = []                                   # (t, inst, pitch, dur, vel, pan[, gain])
def n(t, inst, p, d, v, pan=0., g=1.):
    th = U(t); E.append((round(th, 4), inst, p, (U(t + d) - th) if d else d, v, pan, g))

THEME_A = [('A3', 1), ('D4', .5), ('Eb4', .5), ('F4', 1.5), ('Eb4', .5), ('D4', 1), ('Eb4', 3)]
THEME_B = [('G4', 1), ('F4', .5), ('Eb4', .5), ('D4', 1), ('C4', .5), ('Bb3', .5), ('C4', 1), ('Eb4', .5), ('D4', 2.5)]
def tr(p, oct):
    import re; m = re.match(r'([A-G][b#]?)(-?\d)', p); return f'{m.group(1)}{int(m.group(2)) + oct}'
def phrase(t0, notes, inst, vel, oct=0, beat=B, pan=0., g=1., until=None, legato=1.02):
    t = t0
    for p, b in notes:
        d = b * beat
        if until is not None and t >= until: break
        dd = d * legato if until is None else min(d * legato, until - t)
        n(t, inst, tr(p, oct), dd, vel, pan, g); t += d
    return t

# ───────── tanpura drone: Pa · Sa · Sa · low Sa, one pluck per beat (buzzing bridge = jawari)
tan = np.zeros((int((DUR + 4) * SR), 2), np.float32)
def tanpura(t0, t1, gain=1.):
    pat = [('A2', -.25), ('D3', .2), ('D3', -.1), ('D2', .1)]
    i = 0; t = t0
    while t < t1:
        p, pan = pat[i % 4]
        x = P.pluck('shamisen', p, 4.5, vel=.55, buzz=.55)
        x = lp(x, 3800) * .5
        add(tan, x.astype(np.float32), U(t) + (i % 2) * .012, gain, pan)
        i += 1; t += B
tanpura(0.0, C['stop1'] - .2, 1.0)
tanpura(C['back'], C['q'] - .3, .8)
tanpura(C['chord'] - 3.0, DUR_C + .5, .9)

# ───────── 0–9: the send, the pulse
n(0.0, 'contrabass', 'D2', 9.0, .35, 0, .7)
n(C['send'], 'hand_chimes', 'D6', 2.5, .7, .2); n(C['send'] + .02, 'glockenspiel', 'A6', 2, .35, -.2)
for k in range(int((9.0 - 3.0) / B)):                      # pizzicato pulse on the beat
    t = 3.0 + k * B
    n(t, 'cellos_pizz', 'D2' if k % 2 == 0 else 'A2', .6, .55 + .1 * (k % 4 == 0), -.1)
for t0, ch in [(3.0, ['D3', 'A3']), (6.0, ['Eb3', 'Bb3'])]:  # low string pad: Sa → komal re (tension)
    for p in ch: n(t0, 'violas' if p[-1] == '3' and p[0] in 'AB' else 'cellos', p, 3.1, .45, 0, .8)

# ───────── 9–16.5: the ride: cello spiccato eighths, timpani on bars
ost = ['D3', 'D3', 'A3', 'D3', 'Eb3', 'D3', 'A3', 'D3']
for k in range(int((16.5 - 9.0) / (B / 2))):
    t = 9.0 + k * B / 2
    n(t, 'cellos_spic', ost[k % 8], .3, .55 + .15 * (k % 4 == 0), .15)
for bt in np.arange(9.0, 16.5, BAR): n(bt, 'timpani', 'D3', 1.2, .6, 0)
for t0, ch in [(9.0, ['D3', 'F3', 'A3']), (12.0, ['Eb3', 'G3', 'Bb3']), (15.0, ['C3', 'Eb3', 'G3'])]:
    for p in ch: n(t0, 'violas', p, 3.05, .4, -.2, .7)
n(C['moon'] - .05, 'bass_drum', None, None, .55, 0); n(C['moon'], 'sus_cymbal', 'hit', None, .35, .4)
n(C['nep'] - .05, 'bass_drum', None, None, .6, 0); n(C['nep'], 'sus_cymbal', 'hit', None, .4, -.4)

# ───────── 16.5–24: twenty hours: sixteenths, tremolo crescendo, roll into the arrival
for k in range(int((C['arrive'] - 16.5) / (B / 4))):
    t = 16.5 + k * B / 4; prog = (t - 16.5) / (C['arrive'] - 16.5)
    n(t, 'cellos_spic', ost[(k // 2) % 8], .18, .45 + .4 * prog, .15)
    if t > 19.5 and k % 2 == 0: n(t, 'violins_spic', tr(ost[(k // 2) % 8], 2), .16, .35 + .45 * prog, -.2)
for t0, ch in [(16.5, ['D3', 'A3']), (19.5, ['Eb3', 'Bb3']), (22.5, ['C3', 'G3'])]:
    for p in ch: n(t0, 'cellos', p, 3.05 if t0 < 22 else 1.5, .45 + .1 * (t0 > 19), 0, .8)
n(18.0, 'violins_trem', 'A4', 6.0, .45, -.25); n(18.0, 'violins_trem', 'D5', 6.0, .4, .25)
n(19.5, 'violas', 'F4', 4.5, .45, 0, .7)
n(20.5, 'gran_cassa', 'cresc', 3.6, .7, 0); n(22.0, 'sus_cymbal', 'cresc', 2.0, .6, 0)
n(22.5, 'timpani', 'A2', 1.5, .7, 0)

# ───────── 24: arrival boom, then the drone and a high halo
A = C['arrive']
n(A, 'bass_drum', None, None, 1.0, 0); n(A, 'gong', None, None, .7, 0); n(A, 'organ_pedal', 'D2', 4.5, .7, 0, .9)
n(A, 'timpani', 'D3', 2, .9, 0); n(A, 'crash', None, None, .5, 0)
for p, v in [('D3', .55), ('A3', .5), ('D4', .45)]: n(A, 'cellos' if p != 'D4' else 'violas', p, 3.5, v, 0, .8)
n(A + .5, 'violins', 'A5', 7.0, .28, -.3, .7); n(A + .5, 'violins', 'D6', 7.0, .24, .3, .6)
for k in range(int((C['record'] - (A + 3.0)) / (B * 2))):    # heartbeat under the stats
    t = A + 3.0 + k * B * 2
    n(t, 'contrabass_pizz', 'D2', .5, .55, 0); n(t + B * .5, 'contrabass_pizz', 'D2', .5, .35, 0)
n(A + 3.0, 'cellos', 'D3', C['record'] - A - 3.0, .32, 0, .7)

# ───────── 31.4–36.55: the record: harp + glockenspiel, then the solo violin asks, and stops mid-phrase
R = C['record']
for i, p in enumerate(['D4', 'Eb4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'Eb5', 'F5']): n(R + .08 + i * .07, 'harp', p, 1.6, .5, -.4 + i * .08)
n(R + .1, 'glockenspiel', 'D6', 2, .3, .3); n(C['jaatT'], 'glockenspiel', 'A6', 2, .28, -.3)
n(R, 'violas', 'D4', C['stop1'] - R, .3, 0, .6); n(R, 'cellos', 'D3', C['stop1'] - R, .3, 0, .6)
phrase(33.0, THEME_A, 'violin', .55, 0, pan=.1, g=1.1, until=C['stop1'])

# ───────── 37.8–47.9: the cello answers; the dot; the strings and horn swell
phrase(C['back'] + .05, THEME_B, 'cellos', .6, -1, pan=-.1, g=1.1)
D0 = C['dot']
for p, inst, v in [('D3', 'cellos', .5), ('A3', 'violas', .45), ('D5', 'violins', .45), ('F5', 'violins', .4), ('F4', 'horn', .45), ('A4', 'horn', .4)]:
    n(D0 + .4, inst, p, 4.0, v, 0, .85)
for p, inst, v in [('Bb2', 'cellos', .5), ('F3', 'violas', .42), ('D5', 'violins', .42), ('Bb4', 'violins', .38), ('F4', 'horn', .4)]:
    n(D0 + 4.4, inst, p, C['stop2'] - D0 - 4.6, v, 0, .8)
phrase(44.4, [('A4', 1), ('G4', .5), ('F4', .5), ('Eb4', 1.5), ('D4', 2)], 'piano', .42, 0, pan=.15, g=.9)
n(C['stop2'], 'piano', 'D4', 2.5, .4, 0)          # near-silence: one note

# ───────── 48.7–58.5: the finale: the whole theme, violins + horn + piano in octaves; drums on bars; last chord on Sa
F0 = C['q'] + .05
a_end = phrase(F0, THEME_A[:-1] + [('Eb4', 1)], 'violins', .55, 1, pan=-.15, g=1.0)
phrase(F0, THEME_A[:-1] + [('Eb4', 1)], 'horn', .45, 0, pan=.15, g=.8)
phrase(F0, THEME_A[:-1] + [('Eb4', 1)], 'piano', .45, 0, pan=0, g=.7, legato=.9)
bb = (C['chord'] - a_end) / 5.5                       # ritardando: the answer's last note lands on the chord
phrase(a_end, THEME_B[:-1], 'violins', .58, 1, beat=bb, pan=-.15)
phrase(a_end, THEME_B[:-1], 'horn', .48, 0, beat=bb, pan=.15, g=.8)
phrase(a_end, THEME_B[:-1], 'piano', .48, 0, beat=bb, g=.7, legato=.9)
for t0, ch in [(F0, ['D3', 'A3']), (F0 + 3, ['Eb3', 'Bb3']), (a_end, ['C3', 'G3']), (a_end + 2.2, ['Bb2', 'F3'])]:
    for p in ch: n(t0, 'cellos', p, 3.0, .5, 0, .8)
for bt in np.arange(F0, C['chord'] - .5, BAR): n(bt, 'timpani', 'D3', 1.2, .6, 0); n(bt, 'bass_drum', None, None, .45, 0)
X = C['chord']
for p, inst, v in [('D2', 'contrabass', .6), ('D3', 'cellos', .6), ('A3', 'violas', .55), ('D4', 'horn', .5), ('A4', 'horn', .45), ('D5', 'violins', .55), ('A5', 'violins', .45)]:
    n(X, inst, p, 1.35, v, 0, .9)
for p in ['D2', 'A2', 'D3', 'D4']: n(X, 'piano', p, 2.0, .55, 0, .8)
n(X, 'gong', None, None, .55, 0); n(X, 'bass_drum', None, None, .8, 0); n(X, 'timpani', 'D3', 1.5, .8, 0)

mix = S.render(E, dur=DUR + 3)
L = min(len(mix), len(tan)); mix = mix[:L]; mix[:, :] += tan[:L] * .55
mix = S.room(mix, size=.6, mix=.2)
# the silences are real silences
def gate(t0, t1, fade=.12):
    a, b, f = int(t0 * SR), int(t1 * SR), int(fade * SR)
    mix[a:a + f] *= np.linspace(1, 0, f)[:, None]; mix[a + f:b] = 0
gate(U(C['stop1']), U(C['back']) - .02)
mix = mix[:int(DUR * SR)]
mix = limit(mix, .9)
os.makedirs(os.path.join(HERE, 'music'), exist_ok=True)
sf.write(os.path.join(HERE, 'music', f'score-{LANG}.wav'), mix, SR)
print('score', mix.shape[0] / SR, 's  peak', float(np.abs(mix).max()))
print('\n'.join(S.credits(sorted({e[1] for e in E}))))
