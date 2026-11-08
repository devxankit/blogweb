import { useMemo, useRef } from "react";
import { data, Link } from "react-router";
import { AdSlot } from "~/components/ad-slot";
import { ArticleBody } from "~/components/article-body";
import { Caption, Img } from "~/components/img";
import { Kicker, Monogram } from "~/components/meta";
import { Breadcrumbs } from "~/components/nav-bits";
import { headingsOf, SpectrumBar, TableOfContents, useReading } from "~/components/reading";
import { ShareLinks } from "~/components/share";
import { StoryCard } from "~/components/story";
import { absoluteUrl } from "~/config/site";
import { getArticle } from "~/lib/content.server";
import { ogImageUrl } from "~/lib/images";
import { seo } from "~/lib/seo";
import { articleSchema, breadcrumbs } from "~/lib/structured-data";
import { formatDate, slugify } from "~/lib/text";
import type { Route } from "./+types/article";

export async function loader({ params }: Route.LoaderArgs) {
  const result = await getArticle(params.slug);
  if (!result) throw data(null, { status: 404 });
  return result;
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [];
  const { article, summary, author, section } = loaderData;
  const path = `/articles/${article.slug}`;
  return seo({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.dek,
    path,
    image: ogImageUrl(article.cover.image),
    imageAlt: article.cover.alt,
    type: "article",
    article: {
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      section: section.name,
      tags: article.tags,
      authorUrl: absoluteUrl(`/authors/${author.slug}`),
    },
    jsonLd: [
      articleSchema(article, summary, author, section),
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: section.name, path: `/${section.slug}` },
        { name: article.title, path },
      ]),
    ],
  });
};

export default function ArticlePage({ loaderData }: Route.ComponentProps) {
  const { article, summary, author, section, related, newer, older } = loaderData;
  const bodyRef = useRef<HTMLDivElement>(null);
  const headings = useMemo(() => headingsOf(article.body), [article.body]);
  const { marks, active, barRef } = useReading(bodyRef, headings);
  const url = absoluteUrl(`/articles/${article.slug}`);

  return (
    <article data-section={section.slug}>
      <SpectrumBar marks={marks} barRef={barRef} />

      <header className="container article-head">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: section.name, path: `/${section.slug}` },
            { name: article.title, path: `/articles/${article.slug}` },
          ]}
        />
        <div className="article-head__inner">
          <Kicker section={article.section} format={article.format} />
          <h1 className="article-head__title">{article.title}</h1>
          <p className="article-head__dek">{article.dek}</p>
        </div>
        <div className="article-head__byline">
          <div className="byline">
            <Monogram name={author.name} />
            <div className="byline__text">
              <span>
                By{" "}
                <Link to={`/authors/${author.slug}`} className="byline__name" rel="author">
                  {author.name}
                </Link>
                , {author.role.toLowerCase()}
              </span>
              <span className="article-head__dates">
                <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
                {article.updatedAt ? (
                  <span>
                    Updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
                  </span>
                ) : null}
                <span>{summary.readingMinutes} min read</span>
              </span>
            </div>
          </div>
          <ShareLinks url={url} title={article.title} />
        </div>
        <figure className="article-hero">
          <div className="article-hero__media">
            <Img image={article.cover.image} alt={article.cover.alt} sizes="(max-width: 1380px) 100vw, 1320px" priority />
          </div>
          <Caption image={article.cover.image} caption={article.cover.caption} />
        </figure>
      </header>

      <div className="container article-layout">
        <div className="article-layout__toc">
          <TableOfContents headings={headings} active={active} />
        </div>

        <div className="article-layout__body">
          <ArticleBody ref={bodyRef} blocks={article.body} section={article.section} />

          <footer className="article-end">
            <ul className="tag-list" aria-label="Topics">
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Link to={`/tags/${slugify(tag)}`} className="tag">
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
            <ShareLinks url={url} title={article.title} />
            <div className="author-card">
              <Monogram name={author.name} large />
              <div>
                <p className="author-card__name">
                  <Link to={`/authors/${author.slug}`}>{author.name}</Link>
                </p>
                <p className="author-card__role">{author.role}</p>
                <p className="author-card__bio">{author.shortBio}</p>
              </div>
            </div>
          </footer>

          <nav className="adjacent" aria-label="More stories">
            {older ? (
              <Link to={`/articles/${older.slug}`} className="adjacent__link" prefetch="intent">
                <span className="adjacent__dir">Previous story</span>
                <span className="adjacent__title">{older.title}</span>
              </Link>
            ) : null}
            {newer ? (
              <Link to={`/articles/${newer.slug}`} className="adjacent__link adjacent__link--next" prefetch="intent">
                <span className="adjacent__dir">Next story</span>
                <span className="adjacent__title">{newer.title}</span>
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="article-layout__rail">
          <div className="sticky">
            <AdSlot variant="sidebar" />
          </div>
        </div>
      </div>

      <section className="container related" aria-labelledby="related-title">
        <div className="band-head">
          <h2 id="related-title" className="band-head__title">
            Keep reading
          </h2>
          <Link to={`/${section.slug}`} className="text-link">
            More from {section.name}
          </Link>
        </div>
        <div className="card-grid">
          {related.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      </section>
    </article>
  );
}
