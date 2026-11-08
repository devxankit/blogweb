import { data, Link } from "react-router";
import { Pagination } from "~/components/nav-bits";
import { StoryRow } from "~/components/story";
import { getArchive, getSections, parsePage } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { collection } from "~/lib/structured-data";
import type { ArticleSummary } from "~/lib/types";
import type { Route } from "./+types/archive";

export async function loader({ params }: Route.LoaderArgs) {
  const page = parsePage(params.page);
  if (params.page === "1") throw data(null, { status: 404 });
  const result = await getArchive(page);
  if (!result) throw data(null, { status: 404 });
  return { ...result, sections: await getSections() };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [];
  const { page, items } = loaderData;
  const path = page === 1 ? "/articles" : `/articles/page/${page}`;
  const description = "Every story CosmosLens has published, newest first: features, essays and analysis on space and science.";
  return seo({
    title: page === 1 ? "All stories" : `All stories, page ${page}`,
    description,
    path,
    jsonLd: [collection("All stories", description, path, items)],
  });
};

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function groupByMonth(items: ArticleSummary[]) {
  const groups = new Map<string, ArticleSummary[]>();
  for (const item of items) {
    const key = monthFormat.format(new Date(item.publishedAt));
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()];
}

export default function Archive({ loaderData }: Route.ComponentProps) {
  const { items, page, totalPages, total, sections } = loaderData;

  return (
    <div className="container">
      <header className="page-head">
        <h1 className="page-head__title">All stories</h1>
        <p className="page-head__lede">
          {total} stories on space and science, newest first. Browse by section or search the archive.
        </p>
      </header>

      <nav aria-label="Filter by section">
        <ul className="filter-bar">
          <li>
            <Link to="/articles" aria-current="page">
              Everything
            </Link>
          </li>
          {sections.map((s) => (
            <li key={s.slug}>
              <Link to={`/${s.slug}`} data-section={s.slug}>
                {s.name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="/search">Search</Link>
          </li>
        </ul>
      </nav>

      {groupByMonth(items).map(([month, stories]) => (
        <section key={month} className="archive-month" aria-label={month}>
          <h2 className="archive-month__title">{month}</h2>
          <div className="archive-month__list">
            {stories.map((story) => (
              <StoryRow key={story.slug} story={story} />
            ))}
          </div>
        </section>
      ))}

      <Pagination base="/articles" page={page} totalPages={totalPages} />
    </div>
  );
}
