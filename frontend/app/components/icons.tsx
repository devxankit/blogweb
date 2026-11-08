const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
  </svg>
);

export const MenuIcon = () => (
  <svg {...base}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const SunIcon = ({ className }: { className?: string }) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
  </svg>
);

export const MoonIcon = ({ className }: { className?: string }) => (
  <svg {...base} className={className}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </svg>
);

/** The Moon as it looks tonight: lit fraction and side from the phase. */
export function MoonGlyph({ fraction }: { fraction: number }) {
  const r = 7;
  const c = 8;
  const rx = Math.abs(Math.cos(2 * Math.PI * fraction)) * r;
  const waxing = fraction < 0.5;
  const crescent = fraction < 0.25 || fraction > 0.75;
  const limbSweep = waxing ? 1 : 0;
  const termSweep = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  const lit = `M${c} ${c - r} A${r} ${r} 0 0 ${limbSweep} ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${termSweep} ${c} ${c - r}Z`;
  return (
    <svg className="moon-glyph" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="var(--paper-sunk)" stroke="var(--rule-strong)" strokeWidth="0.8" />
      <path d={lit} fill="currentColor" opacity="0.85" />
    </svg>
  );
}
