#!/bin/sh
# CosmosLens Reel: rebuild both versions (EN + Hinglish).   sh build.sh [--vo] [en|hi]
# --vo re-synthesises and re-checks the narration; COVER_T=7.8 sh build.sh picks the cover frame. Works in Git Bash on Windows. Needs node, ffmpeg 7+ and the library's .venv.
set -e
LIB=${LIB:-/c/Users/AnkitAhirwar/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
if (cd "$LIB" && pwd -W) >/dev/null 2>&1; then LIB=$(cd "$LIB" && pwd -W); HERE=$(cd "$HERE" && pwd -W); fi
export LIB PYTHONUTF8=1 PYTHONIOENCODING=utf-8 HF_HUB_DISABLE_SYMLINKS_WARNING=1
PY="$LIB/.venv/bin/python"; SIZE=1080x1920; FPS=30; NAME=cosmoslens-$(basename "$HERE" | sed "s/^[0-9]*-//")
VO=0; LANGS="en hi"
for a in "$@"; do case "$a" in --vo) VO=1;; en|hi) LANGS=$a;; esac; done
cd "$LIB"
if [ $VO = 1 ]; then
  for L in $LANGS; do
    "$PY" core/tts/tts.py "$HERE/lines-$L.json" "$HERE/voices-$L"
    "$PY" core/tts/asr_check.py "$HERE/lines-$L.json" "$HERE/voices-$L" --lang $L --model small
  done
fi
for L in $LANGS; do node core/render/events.mjs "$HERE" --size $SIZE --q "lang=$L" --out "$HERE/events-$L.json"; done
"$PY" "$HERE/music.py" "$HERE/events-en.json"                               # one score for both languages
for L in $LANGS; do
  "$PY" "$HERE/mix.py" $L
  node core/render/video.mjs "$HERE" --fps $FPS --workers 4 --size $SIZE --q "lang=$L" --out "$HERE/out/video-$L.mp4"
  sh core/render/mux.sh "$HERE/out/video-$L.mp4" "$HERE/out/mix-$L.wav" "$HERE/$NAME-$L.mp4" $FPS 0.4
  node "$HERE/tools/subs.mjs" $L && "$PY" core/render/srt.py "$HERE/out/subs-$L.json" "$HERE/$NAME-$L.srt"
  ffmpeg -v error -y -i "$HERE/$NAME-$L.mp4" -c:v libx264 -preset slow -crf 19 -maxrate 12M -bufsize 24M -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 192k -ar 48000 "$HERE/upload-$L.mp4"   # the file to post (~75 MB)
  echo "built $HERE/$NAME-$L.mp4 and upload-$L.mp4"
done
node core/render/still.mjs "$HERE" ${COVER_T:-3.0} --size $SIZE --q 'lang=en&nosubs=1' --prefix cover_ --out "$HERE/out" && cp "$HERE/out/cover_${COVER_T:-3.0}.jpg" "$HERE/cover.jpg"
