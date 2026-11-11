#!/bin/sh
# Scaffold a new CosmosLens reel:   sh .claude/skills/cosmoslens-reels/scripts/new-reel.sh <slug> "<Title>"
# Creates Instagram/<NN>-<slug>/ (NN = next free number) from the skill's template, with the brand fonts, the logo,
# a Devanagari font for Hinglish titles, and empty img/ out/ music/ folders. Run it from anywhere inside the repo.
set -e
SLUG=$1; TITLE=${2:-$1}
[ -n "$SLUG" ] || { echo "usage: new-reel.sh <slug> \"<Title>\""; exit 1; }
case "$SLUG" in *[!a-z0-9-]*) echo "slug: lowercase letters, digits and hyphens only"; exit 1;; esac
SKILL=$(cd "$(dirname "$0")/.." && pwd)
REPO=$(cd "$SKILL/../../.." && pwd)
IG="$REPO/Instagram"; mkdir -p "$IG"
grep -qx 'Instagram/' "$REPO/.gitignore" 2>/dev/null || printf '\n# Instagram reels: generated media and working files, never committed\nInstagram/\n' >> "$REPO/.gitignore"
LAST=$(ls -1 "$IG" 2>/dev/null | grep -E '^[0-9]{2}-' | sort | tail -1 | cut -c1-2)
N=$(echo "$LAST" | sed 's/^0*//')
NN=$(printf '%02d' $(( ${N:-0} + 1 )))
DIR="$IG/$NN-$SLUG"
[ -e "$DIR" ] && { echo "exists: $DIR"; exit 1; }
mkdir -p "$DIR/img" "$DIR/out" "$DIR/music" "$DIR/fonts" "$DIR/tools"
cp "$SKILL/template/"*.js "$SKILL/template/"*.html "$SKILL/template/"*.py "$SKILL/template/"*.json "$SKILL/template/build.sh" "$DIR/"
cp "$SKILL/template/tools/subs.mjs" "$DIR/tools/"
sed -i "s/__NN__/$NN/g; s/__TITLE__/$TITLE/g" "$DIR/film.js" "$DIR/index.html"
# brand: the site's own fonts (OFL) and logo
F="$REPO/frontend/app/assets/fonts"
cp "$F/schibsted-grotesk.woff2" "$F/newsreader-display.woff2" "$F/newsreader-display-italic.woff2" "$DIR/fonts/"
LIC=$(find "$REPO/frontend/node_modules/@fontsource-variable/schibsted-grotesk" -maxdepth 1 -iname 'LICENSE*' 2>/dev/null | head -1)
[ -n "$LIC" ] && cp "$LIC" "$DIR/fonts/OFL.txt"
cp "$REPO/frontend/public/favicon.svg" "$DIR/img/logo.svg"
# Devanagari (Noto Sans Devanagari 700, OFL): the devanagari subset from Google Fonts, self-hosted (never linked at render time)
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
URL=$(curl -s -A "$UA" "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@700" | tr '\n' ' ' | grep -oE '/\* devanagari \*/[^}]*' | grep -oE 'https://[^)]+' | head -1)
if [ -n "$URL" ]; then curl -s -o "$DIR/fonts/noto-deva-700.woff2" "$URL"; else echo "note: Devanagari font not fetched (offline?); Hindi titles will fall back"; fi
echo "created $DIR"
echo "next: write $DIR/TREATMENT.md (see the skill's workflow), then lines-en.json / lines-hi.json, assets in img/, scenes in film.js"
