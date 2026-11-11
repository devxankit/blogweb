"""Original score → music/score.wav.   python music.py events-en.json
Skeleton from the cosmoslens-reels skill: helpers (drone, phrase, ostinato, gate) + a default shape driven by the film's CUE map.
Rewrite the sections for each reel; keep the shape rules: build → hit on the turn → real silence before the peak → swell → near-silence → finale → last chord at CUE.chord.
Samples: VSCO 2 CE / VCSL (CC0), Salamander piano (CC BY 3.0, credit required). See $LIB/core/audio/INSTRUMENTS.md for every instrument.
Reference score with all of this in use: reference/01-voyager-one-light-day/music.py (raga Bhairavi on D, tanpura drone, orchestra)."""
import sys, os, re, json, numpy as np, soundfile as sf
LIB = os.environ['LIB']; sys.path.insert(0, LIB)
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add, limit, lp
HERE = os.path.dirname(os.path.abspath(__file__))
ev = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'events-en.json'), encoding='utf-8'))
C = next(e for e in ev['ev'] if e['type'] == 'cues'); DUR = ev['dur']
B = C['BEAT']; BAR = C['BAR']
S.seed(5)
E = []                                   # (t, inst, pitch, dur, vel, pan, gain)
def n(t, inst, p, d, v, pan=0., g=1.): E.append((round(t, 4), inst, p, d, v, pan, g))
def tr(p, octs):
    m = re.match(r'([A-G][b#]?)(-?\d)', p); return f'{m.group(1)}{int(m.group(2)) + octs}'
def phrase(t0, notes, inst, vel, octs=0, beat=B, pan=0., g=1., until=None, legato=1.02):
    """notes = [(pitch, beats), ...]; until= cuts the phrase mid-way (a question left hanging)"""
    t = t0
    for p, b in notes:
        if until is not None and t >= until: break
        d = b * beat; n(t, inst, tr(p, octs), d * legato if until is None else min(d * legato, until - t), vel, pan, g); t += d
    return t
def ostinato(t0, t1, inst, pattern, step, vel, pan=0., rise=0.):
    k = 0; t = t0
    while t < t1:
        n(t, inst, pattern[k % len(pattern)], step * .9, vel + rise * (t - t0) / max(1e-6, t1 - t0) + .12 * (k % 4 == 0), pan); k += 1; t += step

# a tanpura-style drone (Pa · Sa · Sa · low Sa, one pluck per beat, buzzing bridge): Indian colour without any sampled recording
drone = np.zeros((int((DUR + 4) * SR), 2), np.float32)
def tanpura(t0, t1, sa='D3', pa='A2', gain=1.):
    pat = [(pa, -.25), (sa, .2), (sa, -.1), (tr(sa, -1), .1)]; i = 0; t = t0
    while t < t1:
        p, pan = pat[i % 4]; x = lp(P.pluck('shamisen', p, 4.5, vel=.55, buzz=.55), 3800) * .5
        add(drone, x.astype(np.float32), t + (i % 2) * .012, gain, pan); i += 1; t += B

# ───────── default shape (key of D; swap scale and instruments to suit the topic)
THEME = [('A3', 1), ('D4', .5), ('Eb4', .5), ('F4', 1.5), ('Eb4', .5), ('D4', 1), ('Eb4', 3)]
tanpura(0.0, C['stop1'] - .2)
ostinato(3.0, C['turn'], 'cellos_spic', ['D3', 'D3', 'A3', 'D3', 'Eb3', 'D3', 'A3', 'D3'], B / 2, .45, .15, rise=.3)
for bt in np.arange(3.0, C['turn'], BAR): n(bt, 'timpani', 'D3', 1.2, .55, 0)
n(C['turn'] - 3.5, 'gran_cassa', 'cresc', 3.4, .65, 0)
n(C['turn'], 'bass_drum', None, None, 1.0, 0); n(C['turn'], 'gong', None, None, .6, 0); n(C['turn'], 'organ_pedal', 'D2', 4.0, .6, 0, .9)
n(C['turn'] + .5, 'violins', 'A5', 8.0, .28, -.3, .7)
phrase(C['stop1'] - 4.0, THEME, 'violin', .55, until=C['stop1'])                   # the question, cut off by the silence
phrase(C['back'] + .05, THEME, 'cellos', .55, -1)                                    # the answer after the silence
for p, inst, v in [('D3', 'cellos', .5), ('A3', 'violas', .45), ('D5', 'violins', .42), ('F4', 'horn', .42)]: n(C['back'] + 3, inst, p, C['stop2'] - C['back'] - 3.2, v, 0, .85)
n(C['stop2'], 'piano', 'D4', 2.5, .4, 0)                                             # near-silence: one note
tanpura(C['back'], C['q'] - .3, gain=.8)
a_end = phrase(C['q'] + .05, THEME[:-1] + [('Eb4', 1)], 'violins', .55, 1, pan=-.15)  # finale
phrase(C['q'] + .05, THEME[:-1] + [('Eb4', 1)], 'horn', .45, 0, pan=.15, g=.8)
for bt in np.arange(C['q'] + .05, C['chord'] - .5, BAR): n(bt, 'timpani', 'D3', 1.2, .6, 0); n(bt, 'bass_drum', None, None, .45, 0)
for p, inst, v in [('D2', 'contrabass', .6), ('D3', 'cellos', .6), ('A3', 'violas', .55), ('D4', 'horn', .5), ('D5', 'violins', .55)]: n(C['chord'], inst, p, 1.35, v, 0, .9)
n(C['chord'], 'gong', None, None, .55, 0); n(C['chord'], 'bass_drum', None, None, .8, 0)
tanpura(C['chord'] - 3.0, DUR + .5, gain=.9)                                         # the drone at the end = the drone at the start: the loop is seamless

mix = S.render(E, dur=DUR + 3)
L = min(len(mix), len(drone)); mix = mix[:L]; mix += drone[:L] * .55
mix = S.room(mix, size=.6, mix=.2)
def gate(t0, t1, fade=.12):                       # real silence, not just quiet
    a, b, f = int(t0 * SR), int(t1 * SR), int(fade * SR)
    mix[a:a + f] *= np.linspace(1, 0, f)[:, None]; mix[a + f:b] = 0
gate(C['stop1'], C['back'] - .02)
mix = limit(mix[:int(DUR * SR)], .9)
os.makedirs(os.path.join(HERE, 'music'), exist_ok=True)
sf.write(os.path.join(HERE, 'music', 'score.wav'), mix, SR)
print('score', mix.shape[0] / SR, 's  peak', float(np.abs(mix).max()))
print('\n'.join(S.credits(sorted({e[1] for e in E}))))
