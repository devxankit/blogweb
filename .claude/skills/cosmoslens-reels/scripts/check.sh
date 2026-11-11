#!/bin/sh
# Final checks on a built reel:   sh .claude/skills/cosmoslens-reels/scripts/check.sh Instagram/<NN-slug> [en|hi]
# 1 reading time of every on-screen text (readcheck)   2 black frames   3 loudness + true peak
# 4 Whisper transcript of the FINAL mix (is the voice clear over the music?)   5 contact sheet, one frame every 2 s → out/final_sheet-<lang>.jpg
# Look at the sheet yourself, and pull 0.2 s strips of every fast move (fly-bys, whips, reveals):
#   ffmpeg -ss <t> -t 1.6 -i upload-en.mp4 -vf "fps=5,scale=216:384,tile=8x1" -frames:v 1 out/strip.jpg
set -e
LIB=${LIB:-/c/Users/AnkitAhirwar/lemo-opuscar}
DIR=$(cd "$1" && pwd); LANGS=${2:-"en hi"}
if (cd "$LIB" && pwd -W) >/dev/null 2>&1; then LIB=$(cd "$LIB" && pwd -W); DIR=$(cd "$DIR" && pwd -W); fi
export LIB PYTHONUTF8=1 PYTHONIOENCODING=utf-8
for L in $LANGS; do
  F="$DIR/upload-$L.mp4"; [ -f "$F" ] || F=$(ls "$DIR"/cosmoslens-*-$L.mp4 | head -1)
  echo "════ $L  ($F)"
  (cd "$LIB" && node core/render/readcheck.mjs "$DIR" --size 1080x1920 --q "lang=$L" 2>&1 | grep -E '^BAD' || echo "readcheck: all text readable")
  echo "black frames: $(ffmpeg -v error -i "$F" -vf blackdetect=d=0.1:pix_th=0.04 -an -f null - 2>&1 | grep -c black_start || true)"
  ffmpeg -v info -i "$F" -af ebur128=peak=true -f null - 2>&1 | grep -E '^\s+(I:|Peak:)' | tail -2
  ffmpeg -v error -y -ss 0.5 -i "$F" -vf "fps=0.5,scale=216:384,tile=10x3" -frames:v 1 "$DIR/out/final_sheet-$L.jpg"
  ffmpeg -v error -y -i "$F" -ac 1 -ar 16000 "$DIR/out/final-$L.wav"
  "$LIB/.venv/bin/python" -c "
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8')   # cpu: this PC has no CUDA cuBLAS
segs, _ = m.transcribe(r'$DIR/out/final-$L.wav', language='$L')
for s in segs: print(f'{s.start:5.1f}-{s.end:5.1f} {s.text}')" 2>&1 | grep -v Warning
done
echo "contact sheets: $DIR/out/final_sheet-*.jpg (read them)"
