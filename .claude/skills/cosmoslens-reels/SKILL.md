---
name: cosmoslens-reels
description: Make CosmosLens Instagram Reels (and YouTube Shorts) end to end, in code. The deliverable is a 60 s, 1080×1920 animated story in English and Hinglish, built from real NASA/ESA imagery, with an original score, burned-in word-by-word captions, a cover image and ready-to-paste post text. Use this skill whenever the user asks for a reel, short, Instagram video, viral clip, social video, "next video", promo or animated explainer for CosmosLens or about any space or science topic, even if they don't say "reel", and whenever they want to change, re-voice, re-cut or re-render a reel in the Instagram/ folder.
---

# CosmosLens reels

Every reel is a short film made entirely in code with the **Lemo-Opuscar** toolkit, which lives at `C:\Users\AnkitAhirwar\lemo-opuscar`. It is the same pipeline as the user's earlier ads in `OneDrive\Desktop\AI video lemo`:

- Canvas 2D and three.js draw every frame as a function of time.
- Kokoro does the voices, and Whisper checks them.
- Sample libraries play an original score.
- A Python mixer combines foley, ambience, voice and music.
- Headless Chrome renders the frames, and ffmpeg masters the sound to −14 LUFS.

The first reel, **01 "One Light-Day"** (Voyager 1 reaching one light-day from Earth), is the reference implementation. Its code is in `reference/01-voyager-one-light-day/`. Read it whenever you need a technique: a 3D model or sphere, a fly-by, a whip transition, a HUD clock, a porthole, a pixel grid or a loop ending.

## The user and the brand

- **The user** is in India and on a tight budget. Everything here is free: offline voices, CC0 samples, NASA public-domain imagery. Don't introduce paid tools or services.
- **Brand:**
  - **Palette:** CosmosLens gold `#e8b24a` is "what we send / the key thing". Pale blue `#6f97f4` is "home / Earth". The rest are cool neutrals on near-black `#04060b`.
  - **Fonts:** Schibsted Grotesk for captions and numbers, Newsreader Display (italic) for emotional lines, Noto Sans Devanagari for Hindi titles.
  - **Logo:** `frontend/public/favicon.svg`.
- **Editorial rules** (the same promises as the site; see the `cosmoslens-editorial` skill):
  - Every fact is checked against a primary source.
  - Each reel carries one **original element**: our own calculation (`scripts/horizons.py`), an India angle, or a sourced correction.
  - No invented people, quotes or footage.
  - Never write "full story" on the end card unless that article exists on cosmoslens.com.
- **Language:** English plus a Hinglish version cut from the same picture. The Hindi voice reads Devanagari; captions show Roman Hinglish. Brand words and numbers stay English in both.

## Where things go

- `Instagram/` at the repo root is git-ignored: never commit it.
- Each reel has its own folder, `Instagram/<NN>-<slug>/`. Create it with:
  ```sh
  sh .claude/skills/cosmoslens-reels/scripts/new-reel.sh <slug> "<Title>"
  ```
  This copies `template/` (page, film skeleton, gl.js, mix.py, music.py, build.sh, subtitle exporter) plus the brand fonts, the logo and a Devanagari font.
- Run library tools from the library folder with absolute project paths:
  ```sh
  cd /c/Users/AnkitAhirwar/lemo-opuscar && node core/render/still.mjs "E:/…/Instagram/<NN-slug>" 1.5 3 --size 1080x1920 --q lang=en
  ```
  On Windows, give native tools `E:/…` paths. Python is `$LIB/.venv/bin/python` with `PYTHONUTF8=1`. Set `LIB` to the `pwd -W` form (C:/…) for music.py and mix.py.

## Workflow

The user wants to be consulted, not surprised: plan first, ask once, then produce. There are two stops: **the brief** and **the storyboard**.

### 1. Brief: one round of questions

Use `AskUserQuestion` for:

- the topic (offer 3–4 options; prefer something timely, about to happen, or with an India angle, and say why each could travel);
- the language (default EN + Hinglish);
- the look (default "cinematic real space"; the library's 66 styles are also available);
- the end-card CTA and Instagram handle;
- voices, if they care. Default to Kokoro `af_heart` (EN) and `hf_alpha` (HI): licence-safe and already used in their ads.

Microsoft edge-tts voices sound better, but they need internet and their terms for commercial use are unclear. Offer them only with that caveat.

Make the sensible defaults yourself (length 60 s, 30 fps, burned captions, −14 LUFS) and state them. Then check the toolchain once: node, ffmpeg, `$LIB/.venv`, and the sample packs in `$LIB/core/audio/instruments/`.

### 2. Facts first: `FACTS.md`

Research before writing. Every claim gets a row: the claim, the source URL, and the quoted wording or your own measurement.

- **Space numbers:** compute them yourself with `scripts/horizons.py` (NASA JPL Horizons). This is how reel 01 found its original fact.
- **Rounding:** round in the script ("about a second") rather than over-claiming.
- **Sources disagree:** if NASA's figure and yours differ a little, say only what both support (e.g. the date, not the minute).

### 3. Treatment: `TREATMENT.md`

Write it before any picture work, following the Lemo-Opuscar director's method (`$LIB/DIRECTOR.md` §4). It contains:

- three candidate structures and the chosen one, with why;
- a logline and arc;
- a benchmark: what to learn and what not to take;
- the script table, with EN, Hinglish and on-screen text for each line;
- a shot list (framing, move, why);
- a cue map at 80 BPM (bar = 3.0 s);
- a sound design table;
- the caption design.

The reel shape that works: see `references/reel-format.md`. In short:

- **Hook in the first second:** a strange, true claim about the viewer's own life.
- **A retention device:** a counter, a countdown, a race.
- **One turn.**
- **A real silence** before the emotional peak.
- **A payoff image:** real, not invented.
- **A question back to the viewer:** comments.
- **An end card that loops into frame one.**

### 4. Assets: real imagery only

Use NASA/ESA/ESO public-domain or CC-licensed material; sources and download recipes are in `references/assets.md`.

- **Prepare images with Python (PIL):** crop, set the black point, find focal points. Record each file's focal coordinates in film.js.
- **Credits:** log every file in `CREDITS` as you download it.
- **No AI-generated images or stock footage:** the CREDITS file promises that.
- **Licence:** anything not CC0, public domain, CC BY or OFL needs the user's OK.
- **Hand-made props:** where only a low-resolution photo exists (e.g. the Golden Record), drawing the object in code is cleaner than upscaling.

### 5. Look and storyboard: stop for approval

1. Write `film.js` scenes on the skeleton (helpers, narration timing, captions, events and end card are ready). Write `lines-en.json` and `lines-hi.json`; the voice files can come later, because captions fall back to estimated timing.
2. Render key stills, about 12 across the timeline:
   ```sh
   node core/render/still.mjs "<dir>" 1 3 8 … --size 1080x1920 --q lang=en --prefix sf_ --out "<dir>/out/sf"
   ```
   Tile them with PIL and **look at them**.
3. Fix what you see: subjects too small or too big, text over the subject, things in the Reels safe zones (top 220 px, bottom 380 px, right 140 px), black bands, rectangle edges.
4. Render a **silent draft** of the whole reel (about 3 min) and a labelled `storyboard-v1.jpg`.
5. Stop and show the user:
   - the storyboard;
   - the draft;
   - the voice auditions (`audition/`: the hook line in 4–6 voices);
   - the one or two things you're least sure about.

### 6. Produce

- **Voice.**
  - Run `tts.py` for both languages, then `asr_check.py --lang en|hi --model small`.
  - Where Whisper only writes digits for spelled-out numbers ("18th"), or spells Hindi words phonetically, listen and accept by adding an `"asr"` field to the line.
  - **Hindi runs 20–30 % longer.** Give each language its own `VOS` slots. Shorten Hindi lines before speeding them up, and keep speed ≤ 1.15.
- **Script-first flow (the user's preferred flow since reel 02):** write `SCRIPT.md` first.
  - **Contents:** Devanagari to paste into ElevenLabs (numbers as words, `...` for pauses), a Roman table with the on-screen plan per line, and recording notes.
  - **Then stop:** wait for the user's MP3, and design the picture to it (see `references/lessons.md`, reels 02 + 03).
  - **Two looks:** if the user wants two looks, make two separate reels (folders) from one recording, not a mixed style.
  - **Music:** keep it calm and simple unless they ask otherwise.
- **The user's own recording** (e.g. an ElevenLabs read):
  - **Never cut, re-space or speed it up.** Time the picture to the voice instead; reel 01's Hinglish version does exactly this.
  - Decode it once to `voices-<lang>/_full.wav`; `mix.py` plays it as one untouched track from 0.15 s.
  - Use Whisper word timestamps to find each line's start and write `dur.json` and `words.json`. Merge Whisper tokens so the counts match the Roman caption words (e.g. "1977", "light-day"), which gives exact word highlights.
  - Rewrite `lines-<lang>.json` to what was actually said, with `"recorded": true`, so `build.sh --vo` skips that language.
  - Set `VOS.<lang>` to the real line starts and add a `WARPS.<lang>` knot list ([canonical time, voice time] at every story beat). film.js, music.py and mix.py all map through it; the reel's length follows the voice.
  - Remind the user to check that their voice service's plan allows commercial use (ElevenLabs' free tier doesn't, and requires attribution).
- **Fit.** Every line must end before the next scene or silence that needs it. Check `dur.json` against the slots.
- **Score.** Adapt `music.py` (helpers: `tanpura`, `phrase` with `until=` to cut a question mid-phrase, `ostinato`, `gate`).
  - Write music in the topic's own colour. An Indian raga scale with a tanpura drone suits India-angle stories.
  - Measure the shape: RMS per second, and the band balance (20–120 Hz around −10 dB relative to the rest).
- **Mix.** Adapt `mix.py`'s foley to the reel's events: every visible action gets a sound. The voice is compressed and the music ducks under it.
- **Build.** `sh build.sh` runs events → score → mix → video → master → .srt → cover → upload copy. It takes about 10 min for both languages, so run it in the background, and don't edit project files while it renders: the workers read them live.

### 7. Check, fix once, deliver

- **Run the checks:** `sh .claude/skills/cosmoslens-reels/scripts/check.sh Instagram/<NN-slug>`. They cover reading time, black frames, loudness, a Whisper transcript of the final mix and contact sheets.
- **Read the sheets.** Also pull 0.2 s strips of every fast move: fly-bys and whips fail in ways stills don't show.
- **Fix everything in one round, then rebuild.**
- **Deliver into the reel folder:**
  - `upload-en.mp4`, `upload-hi.mp4` (about 75 MB, the files to post)
  - masters `cosmoslens-<slug>-en|hi.mp4` and `.srt`
  - `cover.jpg` (`COVER_T=<s> sh build.sh` picks the frame)
  - `CAPTION.md` (post text for both versions, hashtags, credit line, posting window)
  - `CREDITS`, `FACTS.md`, `TREATMENT.md`
- **Tell the user:**
  - where the files are;
  - what you decided on their behalf;
  - that they should listen once on headphones, because you can only measure the audio, not hear it.

Record the reel's status in the `instagram-reels` memory.

## Lessons from reel 01 (don't repeat them)

These are the mistakes and gotchas reel 01 surfaced. Before production, read `references/lessons.md` for the fixes and code snippets:

- **The NASA Voyager .glb is Draco-compressed:** it needs `DRACOLoader`, which gl.js already has.
- **A three.js sphere passing close to the camera** suddenly fills the screen. Fly past at constant speed with a lateral offset of ≥ 1.5 radii.
- **Whip transitions:** draw both shots in the same frames, with motion-blur ghosts. Stripes and hard edges look broken.
- **The Pale Blue Dot crop:** keep the frame covered (focal point at 52 % height).
- **Duplicate text:** when a line becomes a big on-screen title, suppress its caption.
- **readcheck failures** are fixed by holding text longer or using fewer words, not by `pass: true`. Use `pass` only for typing animations and HUD numbers.
- **Whisper on this PC** has no CUDA. Use `device='cpu'`.
- **Never claim "full story"** without the article.
