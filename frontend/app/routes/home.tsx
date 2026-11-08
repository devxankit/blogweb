import { Link } from "react-router";
import { AdSlot } from "~/components/ad-slot";
import { Cover } from "~/components/cover";
import { Img } from "~/components/img";
import { Kicker, StoryMeta } from "~/components/meta";
import { RankedList, StoryCard, StoryLead, StoryRow } from "~/components/story";
import { site } from "~/config/site";
import { getHome, getMostRead, getSectionLeads } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { publisher, website } from "~/lib/structured-data";
import type { ArticleSummary } from "~/lib/types";
import type { Route } from "./+types/home";

export async function loader() {
  const [home, mostRead, sectionLeads] = await Promise.all([getHome(), getMostRead(5), getSectionLeads(3)]);
  return { ...home, mostRead, sectionLeads };
}

export const meta: Route.MetaFunction = () =>
  seo({
    description: site.description,
    path: "/",
    imageAlt: "The Hubble Ultra Deep Field: thousands of galaxies in a tiny patch of sky.",
    jsonLd: [publisher(), website()],
  });

/** Shown before any story is published. */
function EmptyFront() {
  return (
    <section className="container empty-front">
      <h1 className="empty-front__title">The first stories are on their way.</h1>
      <p className="empty-front__text">
        Subscribe to the <Link to="/newsletter">Sunday letter</Link> to hear when they are published.
      </p>
    </section>
  );
}

/** Image left; the lead story and a short list of the rest on the right. */
function SectionFeature({ stories }: { stories: ArticleSummary[] }) {
  const [lead, ...more] = stories;
  return (
    <div className="feature" data-section={lead.section}>
      <Link to={`/articles/${lead.slug}`} className="feature__media" tabIndex={-1} aria-hidden="true">
        <Img image={lead.cover.image} alt="" sizes="(max-width: 860px) 100vw, 760px" />
      </Link>
      <article className="story feature__lead">
        <Kicker section={lead.section} format={lead.format} />
        <h3 className="story__title">
          <Link to={`/articles/${lead.slug}`} prefetch="intent">
            {lead.title}
          </Link>
        </h3>
        <p className="story__dek">{lead.dek}</p>
        <StoryMeta story={lead} />
      </article>
      {more.length ? (
        <div className="feature__more">
          {more.map((story) => (
            <article key={story.slug} className="story story--compact" data-section={story.section}>
              <h3 className="story__title">
                <Link to={`/articles/${story.slug}`} prefetch="intent">
                  {story.title}
                </Link>
              </h3>
              <StoryMeta story={story} />
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cover, coverLines, latest, mostRead, picks, picksTitle, picksIntro, sectionLeads } = loaderData;
  const [pickLead, ...pickRest] = picks;

  return (
    <>
      {cover ? <Cover story={cover} lines={coverLines} /> : <EmptyFront />}

      <section className="container home-latest" aria-labelledby="latest-title">
        <div className="home-latest__grid">
          <div>
            <div className="band-head">
              <h2 id="latest-title" className="band-head__title">
                Latest
              </h2>
              <Link to="/articles" className="text-link">
                All stories
              </Link>
            </div>
            <div className="home-latest__list">
              {latest.map((story) => (
                <StoryRow key={story.slug} story={story} />
              ))}
            </div>
          </div>
          <aside className="home-aside" aria-label="Most read">
            <div>
              <div className="band-head">
                <h2 className="band-head__title">Most read</h2>
              </div>
              <RankedList stories={mostRead} />
            </div>
            <AdSlot variant="feed" />
          </aside>
        </div>
      </section>

      {pickLead ? (
      <section className="picks night" aria-labelledby="picks-title">
        <div className="container">
          <div className="picks__head">
            <h2 id="picks-title" className="picks__title">
              {picksTitle}
            </h2>
            {picksIntro ? <p className="picks__intro">{picksIntro}</p> : null}
          </div>
          <div className="picks__grid">
            <StoryLead story={pickLead} as="h3" />
            <div className="picks__side">
              {pickRest.map((story) => (
                <StoryCard key={story.slug} story={story} showDek={false} sizes="(max-width: 520px) 100vw, 240px" />
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      <div className="container ad-band">
        <AdSlot variant="leaderboard" />
      </div>

      {sectionLeads.map(({ section, articles }, i) => (
        <section
          key={section.slug}
          className="container section-block"
          data-section={section.slug}
          aria-labelledby={`section-${section.slug}`}
        >
          <div className="band-head">
            <div className="section-block__head">
              <h2 id={`section-${section.slug}`} className="section-block__name">
                <Link to={`/${section.slug}`}>{section.name}</Link>
              </h2>
              <p className="band-head__aside">{section.description}</p>
            </div>
            <Link to={`/${section.slug}`} className="text-link">
              More from {section.name}
            </Link>
          </div>
          {i % 2 === 0 ? (
            <SectionFeature stories={articles} />
          ) : (
            <div className="section-block__grid">
              {articles.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  );
}
