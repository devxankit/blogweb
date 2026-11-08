import { useEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router";
import type { ArticleSummary } from "~/lib/types";
import { Img } from "./img";
import { Kicker, SectionMark, StoryMeta } from "./meta";

// Drawing geometry, in the chart's 600 × 600 viewBox. The photograph fills
// the inner 70% (radius 210, set by .eyepiece__view's 15% inset); the setting
// circle sits just outside it.
const C = 300;
const RING_R = 218;

const ORBITS = [
  { rx: 296, ry: 92, angle: -16, accent: true, dotAt: 0.32 },
  { rx: 282, ry: 150, angle: 28, accent: false, dotAt: null },
  { rx: 298, ry: 46, angle: -42, accent: false, dotAt: null },
] as const;

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

// Rounded so server (Node) and browser render identical attributes: their
// Math.cos/Math.sin can differ in the last digit, which breaks hydration.
const round = (n: number) => Math.round(n * 100) / 100;

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: round(C + r * Math.cos(rad)), y: round(C + r * Math.sin(rad)) };
}

/** Fine-line chart drawn around the eyepiece: setting circle, orbits, labels. */
function Chart() {
  return (
    <svg className="eyepiece__chart" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        {/* Hides the far side of each orbit where it passes behind the view. */}
        <mask id="behind-view" maskUnits="userSpaceOnUse" x="-100" y="-100" width="800" height="800">
          <rect x="-100" y="-100" width="800" height="800" fill="#fff" />
          <circle cx={C} cy={C} r={RING_R + 2} fill="#000" />
        </mask>
      </defs>

      <g className="eyepiece__ring">
        <circle cx={C} cy={C} r={RING_R} />
        {TICKS.map((deg) => {
          const long = deg % 30 === 0;
          const a = polar(RING_R + 4, deg);
          const b = polar(RING_R + (long ? 16 : 9), deg);
          return <line key={deg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={long ? "tick tick--long" : "tick"} />;
        })}
        <text x={C} y={C - RING_R - 26} className="eyepiece__compass">
          N
        </text>
        <text x={C - RING_R - 30} y={C + 4} className="eyepiece__compass">
          E
        </text>
      </g>

      {ORBITS.map((o, i) => {
        const place = `translate(${C} ${C}) rotate(${o.angle})`;
        const dot =
          o.dotAt === null ? null : { x: round(o.rx * Math.cos(o.dotAt * Math.PI)), y: round(o.ry * Math.sin(o.dotAt * Math.PI)) };
        const style = { "--i": i } as CSSProperties;
        return (
          <g key={i} className={o.accent ? "orbit orbit--accent" : "orbit"}>
            {/* Far half: masked in chart space so it disappears behind the view. */}
            <g mask="url(#behind-view)">
              <path transform={place} d={`M ${-o.rx} 0 A ${o.rx} ${o.ry} 0 0 1 ${o.rx} 0`} pathLength={1} style={style} />
            </g>
            {/* Near half: drawn over the view. */}
            <path transform={place} d={`M ${o.rx} 0 A ${o.rx} ${o.ry} 0 0 1 ${-o.rx} 0`} pathLength={1} style={style} />
            {dot ? <circle transform={place} cx={dot.x} cy={dot.y} r={5.5} className="orbit__body" /> : null}
          </g>
        );
      })}

      {/* Leader line from the setting circle to the image credit. */}
      <polyline points={`${polar(RING_R + 18, 140).x},${polar(RING_R + 18, 140).y} 500,540 596,540`} className="eyepiece__leader" />
    </svg>
  );
}

// The view focuses only on the first page load of a visit.
let focused = false;

/**
 * Front-page cover. Minimal text on the left; on the right, the cover image
 * seen through a telescope eyepiece, ringed by a setting circle and crossed
 * by orbits that pass behind it on one side and in front on the other.
 */
export function Cover({ story, lines }: { story: ArticleSummary; lines: ArticleSummary[] }) {
  const intro = !focused;
  const scopeRef = useRef<HTMLDivElement>(null);
  const credit = story.cover.image.credit;

  useEffect(() => {
    focused = true;
    const scope = scopeRef.current;
    if (!scope) return;
    const fine = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!fine.matches) return;

    // Nudging the telescope: the view pans and the chart tilts with the pointer.
    const area = scope.closest(".cover") as HTMLElement;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = scope.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        scope.style.setProperty("--px", x.toFixed(3));
        scope.style.setProperty("--py", y.toFixed(3));
      });
    };
    const onLeave = () => {
      scope.style.setProperty("--px", "0");
      scope.style.setProperty("--py", "0");
    };
    area.addEventListener("pointermove", onMove);
    area.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      area.removeEventListener("pointermove", onMove);
      area.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section className="cover" aria-label="Cover story">
      <div className="container cover__grid">
        <article className="cover__story" data-section={story.section}>
          <Kicker section={story.section} format={story.format} />
          <h1 className="cover__title">
            <Link to={`/articles/${story.slug}`} prefetch="intent">
              {story.title}
            </Link>
          </h1>
          <p className="cover__dek">{story.dek}</p>
          <div className="cover__byline">
            <Link to={`/articles/${story.slug}`} className="button cover__read" tabIndex={-1}>
              Read the story
            </Link>
            <StoryMeta story={story} />
          </div>
        </article>

        <div
          ref={scopeRef}
          className={intro ? "eyepiece eyepiece--intro" : "eyepiece"}
          data-section={story.section}
        >
          <div className="eyepiece__view">
            <Img image={story.cover.image} alt={story.cover.alt} sizes="(max-width: 900px) 56vw, 24rem" priority />
          </div>
          <Chart />
          <p className="eyepiece__credit">
            <span>Cover image</span>
            {credit}
          </p>
        </div>
      </div>

      <div className="container">
        <div className="cover__lines">
          {lines.map((line) => (
            <article key={line.slug} className="cover-line" data-section={line.section}>
              <SectionMark section={line.section} />
              <h2 className="cover-line__title">
                <Link to={`/articles/${line.slug}`} prefetch="intent">
                  {line.title}
                </Link>
              </h2>
              <p className="cover-line__meta">
                {line.author.name}, {line.readingMinutes} min read
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
