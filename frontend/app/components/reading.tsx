import { useEffect, useRef, useState, type RefObject } from "react";
import { slugify } from "~/lib/text";

export interface Heading {
  id: string;
  text: string;
}

export function headingsOf(blocks: { type: string; text?: string }[]): Heading[] {
  return blocks.filter((b) => b.type === "h2" && b.text).map((b) => ({ id: slugify(b.text!), text: b.text! }));
}

/** Where the reader is: the fraction read and the heading currently in view. */
export function useReading(bodyRef: RefObject<HTMLElement | null>, headings: Heading[]) {
  const [marks, setMarks] = useState<{ id: string; text: string; at: number }[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    let frame = 0;

    const measure = () => {
      const top = body.getBoundingClientRect().top + window.scrollY;
      const height = body.offsetHeight || 1;
      setMarks(
        headings
          .map((h) => {
            const el = document.getElementById(h.id);
            if (!el) return null;
            const at = (el.getBoundingClientRect().top + window.scrollY - top) / height;
            return { ...h, at: Math.min(1, Math.max(0, at)) };
          })
          .filter((m): m is { id: string; text: string; at: number } => m !== null),
      );
      return { top, height };
    };

    let box = measure();
    const update = () => {
      frame = 0;
      const readingLine = window.scrollY + window.innerHeight * 0.45;
      const p = Math.min(1, Math.max(0, (readingLine - box.top) / box.height));
      barRef.current?.style.setProperty("--p", p.toFixed(4));
      let current: string | null = null;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= readingLine) current = h.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      box = measure();
      onScroll();
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(body);
    document.fonts?.ready.then(onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [bodyRef, headings]);

  return { marks, active, barRef };
}

/**
 * Reading progress drawn as a spectrum, with absorption lines where each
 * section starts. Decorative duplicate of the table of contents, so hidden
 * from assistive technology.
 */
export function SpectrumBar({
  marks,
  barRef,
}: {
  marks: { id: string; text: string; at: number }[];
  barRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={barRef} className="spectrum" aria-hidden="true">
      <div className="spectrum__base" />
      <div className="spectrum__read" />
      {marks.map((m) => (
        <a key={m.id} href={`#${m.id}`} tabIndex={-1} className="spectrum__line" style={{ left: `${m.at * 100}%` }}>
          <span className="spectrum__label">{m.text}</span>
        </a>
      ))}
    </div>
  );
}

function TocList({ headings, active }: { headings: Heading[]; active: string | null }) {
  return (
    <ol className="toc__list">
      {headings.map((h) => (
        <li key={h.id}>
          <a href={`#${h.id}`} className="toc__link" aria-current={active === h.id ? "true" : undefined}>
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function TableOfContents({ headings, active }: { headings: Heading[]; active: string | null }) {
  if (headings.length < 2) return null;
  return (
    <>
      <nav className="toc toc-desktop sticky" aria-label="In this story">
        <p className="toc__title">In this story</p>
        <TocList headings={headings} active={active} />
      </nav>
      <details className="toc toc-mobile">
        <summary>In this story</summary>
        <TocList headings={headings} active={active} />
      </details>
    </>
  );
}
