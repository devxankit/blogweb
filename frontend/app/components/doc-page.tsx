import type { ReactNode } from "react";
import { formatDate } from "~/lib/text";

export interface DocSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** Long-form static page with a contents rail: About, policies, guidelines. */
export function DocPage({
  title,
  lede,
  updated,
  sections,
  before,
}: {
  title: string;
  lede?: ReactNode;
  updated?: string;
  sections: DocSection[];
  before?: ReactNode;
}) {
  return (
    <div className="container">
      <header className="page-head">
        <h1 className="page-head__title">{title}</h1>
        {lede ? <p className="page-head__lede">{lede}</p> : null}
      </header>
      {before}
      <div className="doc">
        <nav className="doc__nav toc" aria-label="On this page">
          <p className="toc__title">On this page</p>
          <ol className="toc__list">
            {sections.map((s) => (
              <li key={s.id}>
                <a className="toc__link" href={`#${s.id}`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="doc__body">
          {updated ? (
            <p className="doc__updated">
              Last updated <time dateTime={updated}>{formatDate(updated)}</time>
            </p>
          ) : null}
          <div className="prose">
            {sections.map((s) => (
              <section key={s.id} aria-labelledby={s.id}>
                <h2 id={s.id}>{s.title}</h2>
                {s.body}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
