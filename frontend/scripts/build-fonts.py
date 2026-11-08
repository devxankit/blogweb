"""
Builds the self-hosted web fonts in app/assets/fonts from the @fontsource
variable sources, and prints metric overrides for the local fallback faces.

Newsreader ships one variable file with an optical-size axis (128 KB). We cut
it into small purpose-built instances instead:
  - Text    (opsz 18, wght 400-600)   body copy, small headings
  - Display (opsz 48, wght 300-500)   headlines 28px and up
Each is ~35-50 KB, so a page only pays for what it renders.

Requires: pip install fonttools brotli
Run:      python scripts/build-fonts.py   (from the frontend/ directory)
"""

import io
import os
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "node_modules", "@fontsource-variable")
OUT = os.path.join(ROOT, "app", "assets", "fonts")

# Latin, typographic punctuation, and the symbols science writing needs
# (Greek letters, minus, approx, degrees, super/subscripts, arrows).
UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,"
    "U+2009-200A,U+2010-2015,U+2018-201E,U+2020-2022,U+2026,U+2030,U+2032-2033,"
    "U+2039-203A,U+2044,U+2070-208F,U+20AC,U+2116,U+2122,U+2190-2193,U+2212,"
    "U+2248,U+2260,U+2264-2265,U+00B5,U+0391-03A9,U+03B1-03C9,U+221E,U+00D7"
)
FEATURES = ["kern", "liga", "clig", "calt", "onum", "lnum", "pnum", "tnum",
            "frac", "sups", "subs", "case", "ccmp", "locl", "mark", "mkmk"]

FACES = [
    ("newsreader/files/newsreader-latin-opsz-normal.woff2", "newsreader-text.woff2", {"wght": (400, 600), "opsz": 18}),
    ("newsreader/files/newsreader-latin-opsz-italic.woff2", "newsreader-text-italic.woff2", {"wght": (400, 500), "opsz": 18}),
    ("newsreader/files/newsreader-latin-opsz-normal.woff2", "newsreader-display.woff2", {"wght": (300, 500), "opsz": 48}),
    ("newsreader/files/newsreader-latin-opsz-italic.woff2", "newsreader-display-italic.woff2", {"wght": (300, 400), "opsz": 48}),
    ("schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2", "schibsted-grotesk.woff2", {"wght": (400, 600)}),
]

SAMPLE = "The quick brown fox jumps over the lazy dog while galaxies recede at seventy kilometres per second"


def advance(font: TTFont, text: str) -> float:
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    return sum(hmtx[cmap[ord(ch)]][0] for ch in text if ord(ch) in cmap) / font["head"].unitsPerEm


def fallback_css(name: str, font: TTFont, local: str, local_path: str) -> str:
    ref = TTFont(local_path)
    size_adjust = advance(font, SAMPLE) / advance(ref, SAMPLE)
    upm = font["head"].unitsPerEm
    hhea = font["hhea"]
    return (
        f"@font-face {{\n  font-family: '{name} Fallback';\n  src: local('{local}');\n"
        f"  size-adjust: {size_adjust * 100:.2f}%;\n"
        f"  ascent-override: {hhea.ascent / upm / size_adjust * 100:.2f}%;\n"
        f"  descent-override: {abs(hhea.descent) / upm / size_adjust * 100:.2f}%;\n"
        f"  line-gap-override: 0%;\n}}"
    )


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    built = {}
    for src, dest, limits in FACES:
        font = TTFont(os.path.join(SRC, src))
        font = instancer.instantiateVariableFont(font, limits)
        opts = subset.Options()
        opts.layout_features = FEATURES
        opts.flavor = "woff2"
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(UNICODES))
        sub.subset(font)
        path = os.path.join(OUT, dest)
        subset.save_font(font, path, opts)
        built[dest] = TTFont(path)
        print(f"{dest:34s} {os.path.getsize(path):>8,d} bytes")

    win = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")
    print()
    print(fallback_css("Newsreader Text", built["newsreader-text.woff2"], "Georgia", os.path.join(win, "georgia.ttf")))
    print(fallback_css("Newsreader Display", built["newsreader-display.woff2"], "Georgia", os.path.join(win, "georgia.ttf")))
    print(fallback_css("Schibsted Grotesk", built["schibsted-grotesk.woff2"], "Arial", os.path.join(win, "arial.ttf")))


if __name__ == "__main__":
    main()
