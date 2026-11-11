# Lessons and fixes from reel 01

## Rendering

- **`main.js` loads `film.js` dynamically.** A static import is hoisted, so any other module a page needs first must load before it.
- **Throwing in `main.js` kills `still.mjs`,** which exits on page errors. Use branches, not `throw`.
- **three.js:** `index.html` needs an import map `{"three": "/node_modules/three/build/three.module.js"}`, because examples import the bare `three` specifier.
- **Draco `.glb`:**
  ```js
  const draco = new DRACOLoader(); draco.setDecoderPath('/node_modules/three/examples/jsm/libs/draco/gltf/');
  new GLTFLoader().setDRACOLoader(draco)
  ```
- **The GL canvas:** render to an offscreen WebGL canvas with `preserveDrawingBuffer: true`, then `c.drawImage(G.canvas, 0, 0)`. To fade it, wrap the call in `c.save(); c.globalAlpha = a; … c.restore()`.
- **Model framing:** normalise the model by its bounding box, then offset to the part you want centred (Voyager: the dish/bus sat at about (0, −0.14, −0.25) of the normalised box). A ¾ view reads better than a face-on dish.
- **Windows Python** can't open `/e/...` paths. Use `E:/...`.
- **Timing:** a full 60 s render at 1080×1920 with 4 workers takes about 3 min per language; `build.sh` for both takes about 10 min. The Bash tool times out at 10 min, so run builds with `run_in_background`.
- **Masters run about 127 MB** (17 Mbps). The upload copies (CRF 19, maxrate 12M, AAC 192k, faststart) run about 75 MB.

## Motion that failed, and the fix

- **Moon fly-by "pop."** A sphere 0.6 radii off-axis approached on an eased curve. It went from medium to filling the screen in 2 frames and covered the clock.
  - **Fix:** constant speed, a lateral offset of 1.5 radii, and a stop before z ≈ −3. Then it grows, slides off the edge, and never covers the centre.
  - Code: `zz = -8.7 - (10.95 - t) * 18.6; pos [-1.5, 0, zz]`.
- **Whip transition.** Horizontal stripes plus the photo sliding in alone over black looked broken.
  - **Fix:** in the outgoing scene, `translate(ws * W * 1.15)` and draw 4 ghost copies offset by `-i*80*ws`. In the same frames, draw the incoming image at `W/2 + (ws-1)*W*1.15` with ghosts. The next scene then starts with the image already in place.
- **Pale Blue Dot crop.** The dot is 52 % down the photo. With the dot at screen 46 %, a black band showed at the bottom.
  - **Fix:** put the dot at `H*.52`, with zoom ≥ 1.03.
- **Pixel grid.** Lines across the whole frame looked like scanlines.
  - **Fix:** draw only an 11×11 window of cells around the subject, fading with distance, and highlight one cell labelled "= 1 pixel".
- **Ending card.** The full photo pulled back showed its rectangle.
  - **Fix:** close the photo into a round gold-rimmed porthole (circle grammar).
- **Collisions.** Voyager's boom overlapped the stats and the clock. Place the 3D subject toward one side and the stats on the other; check every caption scene at y 1400 vs 1480.

## Text and voice

- **readcheck:** hold time ≈ letters ÷ 15 + 1.5 s. Fixes that worked:
  - fewer words on stat labels ("transmitter", not "transmitter, less than a fridge bulb", which the voice already says);
  - landmark labels drawn outside the subject's `if` so they can linger;
  - a title carried into the next shot ("Where are you going?" stays over Voyager's turn);
  - titles that appear 0.3–0.45 s before the word is spoken.
- **Duplicates:** when a spoken line also appears as a big title, suppress its caption (`NOCAP`, or a time-based filter).
- **Hook on frame 0:** set `CARDS[0].t0 = 0` and full alpha when `t0 <= 0`.
- **Whisper (small model):**
  - EN: it writes "18th" and "1977" for spelled-out words, and phonetic spellings for Hindi words. Accept with an `"asr"` field after listening.
  - HI: it confuses aspirates (भीस for बीस) and writes numbers as digits. Accept the same way.
  - On the final mix, a long Hindi transcript can skip lines; transcribe that stretch alone before worrying.
- **Hindi length:** reel 01's Hindi ran 20–30 % longer. Fixes, in order:
  1. shorten the words ("Message... Chaand tak, bas ek second mein");
  2. give Hindi its own slots;
  3. speed ≤ 1.15.

## Honesty checks

- **End card:** "Follow for the full story" was wrong because no article existed. Now it's "Follow for more space stories".
- **Precision:** NASA's crossing time (06:16 UTC) and our Horizons geometric crossing (~10 UTC) differed by hours. The reel says only the date.
- **Original calculation, reel 01:** after crossing, Voyager 1 never returns within 1 light-day of Earth; the minimum is 1.001 LD in Apr 2027. It went in the caption and FACTS.md.

## The user's own voiceover (reel 01, Hinglish)

- **The ask:** the user sent an ElevenLabs Hindi read (64.8 s, reworded and longer than the script) and asked that the **video adjust to the voice, not the voice be cut**.
- **The fix:** a piecewise-linear time map (`WARPS.hi` in film.js, knots `[canonical, voice time]`).
  - `render(c, tr)` draws the picture at `toC(tr)` and the captions at the raw `tr`.
  - `E()` maps canonical sound events with `toH()`; voice-timed ones are passed with `raw: 1`.
  - Word-keyed moments get canonical copies (`statC`, `jaatC`, `usC`, `qC`) for the picture.
  - The `cues` carry `warp` and `END`. In music.py, `n()` and `tanpura()` map through `U()`, so the score follows the voice (sections slow down or speed up with it). mix.py maps its ambience knots the same way.
- **What happens at the silences:** where the voice has no pause, the designed silences shrink to about 0.15 s. Accept it; the voice comes first.
- **Readcheck after the stretch:** compressed stretches shorten text holds. Fixes that worked: hold labels to the next story beat, show titles about 0.25 s before the word, and give the question card's comment prompt an earlier start.
- **Result:** the Hinglish reel runs ~72 s against the English 60 s. Both pass every check.

## Reels 02 + 03 "Ancient Sunlight" (script first, then the user's voice)

### The flow

The user asked for this order:

1. Claude writes `SCRIPT.md`:
   - Devanagari for ElevenLabs, with numbers written as words;
   - a Roman Hinglish table with the on-screen plan;
   - recording notes.
2. The user records it and drops the MP3 into the reel folder.
3. Claude designs everything to that recording.

There is no TTS and no warp: the canonical timeline is the voice's own clock.

### Timing from the user's recording

- **Get word timings.** Whisper `small` on CPU with `word_timestamps=True`. It skips stretches: re-transcribe any gap of more than 1 s on its own (ffmpeg `-ss/-to`).
- **Refine the onsets.** Use ffmpeg `silencedetect=noise=-38dB:d=0.12` to correct line and word starts, because Whisper stretches the first word of a segment back over the pause.
- **Write the files by hand.** Write the `(roman word, start, end)` list in a script (`scripts/voice_files_example.py`; word timings from `scripts/asr_words.py`) that emits `lines-hi.json` (`recorded: true`), `dur.json`, `words.json` and `VOS` (start + 0.15 s).
- **Key the picture to words.** `film.js` keys every beat to a word: `K = { eight: wt('l01', 7), ... }`. Picture, events, music and mix all read `K` through the `cues` event.

### Two looks from one recording

The user wanted a **cinematic** and a **painted** version as two separate videos, not one mixed style.

- **Shared:** `K`, the captions, the events, `music.py` and `mix.py`. The audio is identical; only the scenes differ.
- **Painted version:** uses the Lemo-Opuscar **impasto** engine.
  - Copy `styles/impasto/demo/engine/{impasto,plate}.js` into `<reel>/engine/` (MIT, credit LemoLab).
  - **Plates:** `Ref` illustrations → `paintRef()` → `E.batch()`.
  - **Moving things:** `Strokes` + `E.drawNow()` with fixed seeds.
  - **Grey world:** `grey: 1, reveal: 1e6`. "The one coloured thing": the neutrino stays in colour while the Sun drains to grey.
  - **Text:** render the engine to its own WebGL canvas, `drawImage` it into the 2D frame, then draw text and glows on top in 2D.
  - **Speed:** 1080×1920 at `ss` 1.5 renders a 60 s reel in a few minutes.
- **Fetching the demo:** `setup.sh demo impasto` silently fails in Git Bash, because MSYS rewrites `/styles/...` sparse-checkout patterns to `C:/Program Files/Git/...`. Reset them with `MSYS_NO_PATHCONV=1 git sparse-checkout set --no-cone '/*' '!/styles/*/demo/' … '/styles/<slug>/demo/'`.

### Bugs found

- **Random walks:** `angle = R() * 7` is not uniform: 7 > 2π double-counts 0–0.72 rad and the walk drifts in a straight line. Use `R() * 2 * Math.PI`.
- **SDO AIA images:** a square black background, so the square shows on a star field. Save them as PNG with a soft radial alpha (1.08 → 1.5 × the disc radius). The HMI disc can just be clipped to a circle.
- **Rotating texture:** a `drawImage` of a texture shows its edges when zoomed out or rotated. Fill with `createPattern(…, 'repeat')` + `pattern.setTransform(DOMMatrix)`.
- **Zooming out of a growing path:** frame the bounding box of the points so far (zoom = fit, centre = box centre), not a fixed exponential.

### Readcheck fixes that worked here

- Show labels about 0.25 s before the word.
- Carry a title into the first 0.5–0.9 s of the next shot ("ANGINAT BAAR", "AAP", "NEUTRINO").
- Freeze kinetic words at their pre-zoom positions while the camera pulls out.
- Move a title to the top so it can stay while the next shot's rows appear.
- Mark "≈ 1.5 crore °C" `pass` (a number).

### Music brief from the user

Keep the music simple, calm and soothing, never noisy:
- a string pad with slow attacks;
- sparse piano;
- harp for events;
- glass / bowed vibraphone for a "cool" thing;
- no drums.

Foley at −15 dB, music at −8 dB under the voice.
