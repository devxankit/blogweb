import { data } from "react-router";
import { AdSlot } from "~/components/ad-slot";
import { Breadcrumbs, Pagination } from "~/components/nav-bits";
import { StoryCard, StoryLead } from "~/components/story";
import { findSection, getSectionArticles, parsePage } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { breadcrumbs, collection } from "~/lib/structured-data";
import type { Route } from "./+types/section";

export async function loader({ params }: Route.LoaderArgs) {
  const section = await findSection(params.section);
  const page = parsePage(params.page);
  if (!section || params.page === "1") throw data(null, { status: 404 });
  const result = await getSectionArticles(section.slug, page);
  if (!result) throw data(null, { status: 404 });
  return { section, ...result };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [];
  const { section, page, items } = loaderData;
  const path = page === 1 ? `/${section.slug}` : `/${section.slug}/page/${page}`;
  const title = page === 1 ? section.name : `${section.name}, page ${page}`;
  return seo({
    title,
    description: section.description,
    path,
    jsonLd: [
      collection(section.name, section.description, path, items),
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: section.name, path: `/${section.slug}` },
      ]),
    ],
  });
};

export default function SectionPage({ loaderData }: Route.ComponentProps) {
  const { section, items, page, totalPages, total } = loaderData;
  const [lead, ...rest] = page === 1 ? items : [null, ...items];

  return (
    <div data-section={section.slug}>
      <div className="container">
        <header className="section-head">
          <div>
            <Breadcrumbs
              items={[
                { name: "Home", path: "/" },
                { name: section.name, path: `/${section.slug}` },
              ]}
            />
            <h1 className="section-head__title">{section.name}</h1>
          </div>
          <div>
            <p className="section-head__desc">{section.description}</p>
            <p className="section-head__line">
              {total} {total === 1 ? "story" : "stories"}. Section line: {section.line.label}, {section.line.nm} nm.
            </p>
          </div>
        </header>
      </div>

      <div className="container listing">
        {lead ? (
          <div className="listing__lead">
            <StoryLead story={lead} priority sizes="(max-width: 860px) 100vw, 760px" />
          </div>
        ) : null}
        <div className="card-grid">
          {rest.map((story) => (story ? <StoryCard key={story.slug} story={story} /> : null))}
        </div>
        <div className="ad-band">
          <AdSlot variant="leaderboard" />
        </div>
        <Pagination base={`/${section.slug}`} page={page} totalPages={totalPages} />
      </div>
    </div>
  );
}
