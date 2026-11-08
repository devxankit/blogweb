import { useEffect, useMemo, useState } from "react";
import { Form, Link, useSearchParams } from "react-router";
import { Img } from "~/components/img";
import { Kicker } from "~/components/meta";
import { getSearchIndex, getTags } from "~/lib/content.server";
import type { SearchEntry } from "~/lib/types";
import { seo } from "~/lib/seo";
import { formatDate } from "~/lib/text";
import type { Route } from "./+types/search";

export async function loader() {
  const [index, tags] = await Promise.all([getSearchIndex(), getTags()]);
  return { index, tags: tags.slice(0, 18) };
}

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Search",
    description: "Search every CosmosLens story by topic, title or author.",
    path: "/search",
    noindex: true,
  });

const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function search(index: SearchEntry[], query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return index
    .map((entry) => {
      const fields = {
        title: normalize(entry.title),
        tags: normalize(entry.tags.join(" ")),
        dek: normalize(entry.dek),
        other: normalize(`${entry.section} ${entry.author} ${entry.format}`),
      };
      let score = 0;
      for (const term of terms) {
        const hit =
          (fields.title.includes(term) ? 5 : 0) +
          (fields.tags.includes(term) ? 3 : 0) +
          (fields.dek.includes(term) ? 2 : 0) +
          (fields.other.includes(term) ? 1 : 0);
        if (!hit) return null;
        score += hit;
      }
      return { entry, score };
    })
    .filter((r): r is { entry: SearchEntry; score: number } => r !== null)
    .sort((a, b) => b.score - a.score || Date.parse(b.entry.publishedAt) - Date.parse(a.entry.publishedAt))
    .map((r) => r.entry);
}

export default function SearchPage({ loaderData }: Route.ComponentProps) {
  const { index, tags } = loaderData;
  const [params] = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const query = hydrated ? (params.get("q") ?? "").trim() : "";
  const results = useMemo(() => search(index, query), [index, query]);

  return (
    <div className="container">
      <header className="page-head">
        <h1 className="page-head__title">Search</h1>
        <Form method="get" action="/search" role="search" className="search-form">
          <label htmlFor="q" className="visually-hidden">
            Search stories
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            key={query}
            placeholder="Try “Europa”, “dark energy” or “Leavitt”"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className="button">
            Search
          </button>
        </Form>
      </header>

      {query ? (
        <section aria-live="polite">
          <p className="search-status">
            {results.length
              ? `${results.length} ${results.length === 1 ? "story" : "stories"} for “${query}”`
              : `No stories match “${query}”. Check the spelling, try a broader word, or browse a topic below.`}
          </p>
          <div>
            {results.map((r) => (
              <article key={r.slug} className="story story--row" data-section={r.section}>
                <div className="story__body">
                  <Kicker section={r.section} format={r.format} />
                  <h2 className="story__title">
                    <Link to={`/articles/${r.slug}`}>{r.title}</Link>
                  </h2>
                  <p className="story__dek">{r.dek}</p>
                  <p className="meta">
                    <span>{r.author}</span>
                    <time dateTime={r.publishedAt}>{formatDate(r.publishedAt)}</time>
                    <span>{r.readingMinutes} min read</span>
                  </p>
                </div>
                <div className="story__media">
                  <Img image={r.cover.image} alt="" sizes="160px" />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="stack-section" aria-labelledby="topics-title">
        <div className="band-head">
          <h2 id="topics-title" className="band-head__title">
            Browse by topic
          </h2>
        </div>
        <ul className="topic-cloud">
          {tags.map((t) => (
            <li key={t.slug}>
              <Link to={`/tags/${t.slug}`} className="tag">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
