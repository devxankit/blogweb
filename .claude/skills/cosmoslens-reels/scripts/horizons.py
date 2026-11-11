"""Original facts from NASA JPL Horizons: distance, light-time and speed of any solar-system body or spacecraft.
    python horizons.py <target> <start> <stop> <step> [--center 500@399]
    python horizons.py -31 2026-11-17 2026-11-19 2h                 # Voyager 1 from Earth
    python horizons.py 499 2027-01-01 2027-12-31 10d                # Mars from Earth
    python horizons.py -31 2026-11-18 2026-11-19 1d --center 500@10 # Voyager 1 from the Sun
Targets: 10 Sun, 199 Mercury, 299 Venus, 301 Moon, 399 Earth, 499 Mars, 599 Jupiter, 699 Saturn, 799 Uranus, 899 Neptune, 999 Pluto,
-31 Voyager 1, -32 Voyager 2, -98 New Horizons, -170 JWST (look up others at https://ssd.jpl.nasa.gov/horizons/app.html).
Prints geometric range (km, AU, light-time) and range-rate. Cite as "our calculation from NASA JPL Horizons" and keep the command in FACTS.md."""
import sys, json, urllib.parse, urllib.request
C_KMS, AU = 299792.458, 149597870.7
a = sys.argv[1:]
if len(a) < 4: sys.exit(__doc__)
target, start, stop, step = a[:4]
center = a[a.index('--center') + 1] if '--center' in a else '500@399'
q = dict(format='json', COMMAND=f"'{target}'", OBJ_DATA="'NO'", MAKE_EPHEM="'YES'", EPHEM_TYPE="'VECTORS'", CENTER=f"'{center}'",
         START_TIME=f"'{start}'", STOP_TIME=f"'{stop}'", STEP_SIZE=f"'{step}'", VEC_TABLE="'3'", OUT_UNITS="'KM-S'", VEC_CORR="'NONE'", CSV_FORMAT="'YES'")
url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q, safe="'@")
res = json.load(urllib.request.urlopen(url, timeout=60))['result']
if '$$SOE' not in res: sys.exit(res[:2000])
rows = res.split('$$SOE')[1].split('$$EOE')[0].strip().splitlines()
print(f'{"date (UTC)":<28}{"range km":>20}{"AU":>12}{"light-time":>16}{"rate km/s":>12}')
for r in rows:
    f = [x.strip() for x in r.split(',')]
    km, rr = float(f[9]), float(f[10])
    lt = km / C_KMS; h, m, s = int(lt // 3600), int(lt // 60 % 60), lt % 60
    print(f'{f[1][5:]:<28}{km:>20,.0f}{km / AU:>12.4f}{f"{h:02d}:{m:02d}:{s:05.2f}":>16}{rr:>12.3f}')
