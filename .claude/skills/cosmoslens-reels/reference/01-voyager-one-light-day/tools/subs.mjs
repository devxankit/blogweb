// Export the subtitle timetable → out/subs-<lang>.json (core/render/srt.py turns it into the .srt). Needs LIB.   node tools/subs.mjs <lang>
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const { openDemo, closeServer } = await import(pathToFileURL(path.join(process.env.LIB, 'core/render/page.mjs')).href);
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), lang = process.argv[2] || 'en';
const { browser, page } = await openDemo(dir, { w: 1080, h: 1920, q: 'lang=' + lang });
const subs = await page.evaluate(() => window.SUBS.map(s => ({ t0: +s.t0.toFixed(2), t1: +s.t1.toFixed(2), text: s.text })));
fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
fs.writeFileSync(path.join(dir, `out/subs-${lang}.json`), JSON.stringify(subs, null, 1)); console.log(lang, 'subs', subs.length);
await browser.close(); closeServer();
