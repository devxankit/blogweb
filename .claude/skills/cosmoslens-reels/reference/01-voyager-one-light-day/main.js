const q = new URLSearchParams(location.search), lang = q.get('lang') || 'en';
{
  const { build } = await import('./film.js');
  for (const w of [500, 600, 700, 800, 900]) await document.fonts.load(`${w} 40px Sch`);
  await document.fonts.load('600 40px NewsD'); await document.fonts.load('italic 500 40px NewsD');
  await document.fonts.load('700 40px Deva', 'जात कहाँ हो');
  const cv = document.getElementById('c');
  cv.width = innerWidth || 1080; cv.height = innerHeight || 1920;
  const F = await build(lang, { nosubs: q.has('nosubs'), cover: q.has('cover') });
  const ctx = cv.getContext('2d');
  window.DUR = F.dur; window.EV = [...F.ev, { t: 0, type: 'cues', ...F.cues }]; window.SUBS = F.subs;
  window.TEXTS = F.texts;
  window.render = t => F.render(ctx, t);
  window.READY = true;
}
