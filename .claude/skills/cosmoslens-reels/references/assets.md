# Real imagery: where and how

Download into a fresh scratch folder first. Process the files with PIL, then save only the prepared files into the reel's `img/`. Log every file in `CREDITS` as you go.

| What | Source | How |
|---|---|---|
| Any NASA photo (PIA numbers, mission photos) | NASA Image and Video Library | Search: `curl "https://images-api.nasa.gov/search?q=<words>&media_type=image"`. Files: `curl https://images-api.nasa.gov/asset/<nasa_id>`, then take the `~large.jpg` or `~orig.jpg`. Public domain, credit NASA/JPL-Caltech. Photojournal TIFF links often return HTML, so prefer the images API |
| Earth with India facing the camera | DSCOVR EPIC | `curl https://epic.gsfc.nasa.gov/api/natural/date/YYYY-MM-DD`, then pick `centroid_coordinates.lon` 70–85. Spring dates (Apr–May) put India mid-disc and clear; November puts it near the top edge. File: `https://epic.gsfc.nasa.gov/archive/natural/YYYY/MM/DD/png/<image>.png` (2048 px). Reel 01 used 2026-04-20 `epic_1b_20260420061922` |
| Star field / Milky Way | NASA SVS Deep Star Maps 2020 | `https://svs.gsfc.nasa.gov/api/4851` lists the files. `starmap_2020_8k.exr` (130 MB): tone-map with `ffmpeg -i x.exr -vf "zscale=t=linear:npl=100,format=gbrpf32le,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=rgb24" stars.png`, then black-point it in PIL (`(a-0.018)*2.1`, gamma 1.15). It is an equirectangular map in RA/Dec: u = (0.5 − RA/24) mod 1, v = (90 − Dec)/180 |
| Moon texture | NASA SVS CGI Moon Kit | `https://svs.gsfc.nasa.gov/api/4720` → `lroc_color_2k.jpg` / `lroc_color_poles_4k.tif` |
| Planets | Voyager / Cassini / Juno / JWST PIA images | images API (e.g. Neptune PIA01492). Find the disc centre and radius by thresholding, then clip to a circle |
| Spacecraft 3D models (.glb) | NASA 3D Resources | `https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1` (list), then `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/<name>/<file>.glb`. Many are Draco-compressed: gl.js sets `DRACOLoader` with `/node_modules/three/examples/jsm/libs/draco/gltf/`. Probe the axes first: render six views (reel 01's dish faced +Y) |
| Orbital facts | NASA JPL Horizons | `python scripts/horizons.py <target> <start> <stop> <step>` |
| Devanagari font | Google Fonts (OFL) | new-reel.sh downloads the Devanagari subset. For a smaller file, request just your characters: `fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@700&text=<urlencoded>` |

## Credit lines

- **NASA:** "Images: NASA/JPL-Caltech, NASA EPIC, NASA SVS" (adjust to what you used). NASA material is not copyrighted, but its media guidelines apply: no endorsement implied, and no NASA logo.
- **The piano:** "Salamander Grand Piano by Alexander Holm (CC BY 3.0)". Required whenever you use `piano`.
- **ESA / ESO / Hubble images:** usually CC BY 4.0. Credit "ESA/Webb, NASA & CSA, …" or "ESO/…" exactly as the source asks.
- **Wikimedia Commons:** check each file's licence. CC BY-SA needs the user's OK first.
- **Third-party recordings** (songs, speeches): never use the audio. You may name them, as reel 01 named "Jaat Kahan Ho".
