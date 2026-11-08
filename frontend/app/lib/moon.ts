// Moon phase from the mean synodic month. Accurate to within a few hours,
// which is plenty for a line of text in the masthead.
const SYNODIC_DAYS = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // 6 January 2000, 18:14 UTC

const PHASES = [
  "New moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
] as const;

export function moonPhase(date = new Date()) {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const age = ((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
  const fraction = age / SYNODIC_DAYS;
  const illumination = (1 - Math.cos(2 * Math.PI * fraction)) / 2;
  const name = PHASES[Math.round(fraction * 8) % 8];
  return { name, illumination, fraction, age };
}
