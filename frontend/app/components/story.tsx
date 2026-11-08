import { Link } from "react-router";
import type { ArticleSummary } from "~/lib/types";
import { Img } from "./img";
import { Kicker, StoryMeta } from "./meta";

type HeadingLevel = "h2" | "h3";

interface StoryProps {
  story: ArticleSummary;
  sizes?: string;
  as?: HeadingLevel;
  showDek?: boolean;
  priority?: boolean;
}

export function StoryCard({ story, sizes = "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 420px", as: H = "h3", showDek = true, priority }: StoryProps) {
  return (
    <article className="story" data-section={story.section}>
      <div className="story__media">
        <Img image={story.cover.image} alt={story.cover.alt} sizes={sizes} priority={priority} />
      </div>
      <Kicker section={story.section} format={story.format} />
      <H className="story__title">
        <Link to={`/articles/${story.slug}`} prefetch="intent">
          {story.title}
        </Link>
      </H>
      {showDek ? <p className="story__dek">{story.dek}</p> : null}
      <StoryMeta story={story} />
    </article>
  );
}

export function StoryLead({ story, sizes = "(max-width: 960px) 100vw, 760px", as: H = "h2", priority }: StoryProps) {
  return (
    <article className="story story--lead" data-section={story.section}>
      <div className="story__media">
        <Img image={story.cover.image} alt={story.cover.alt} sizes={sizes} priority={priority} />
      </div>
      <Kicker section={story.section} format={story.format} />
      <H className="story__title">
        <Link to={`/articles/${story.slug}`} prefetch="intent">
          {story.title}
        </Link>
      </H>
      <p className="story__dek">{story.dek}</p>
      <StoryMeta story={story} />
    </article>
  );
}

export function StoryRow({ story, as: H = "h3", showDek = true }: StoryProps) {
  return (
    <article className="story story--row" data-section={story.section}>
      <div className="story__body">
        <Kicker section={story.section} format={story.format} />
        <H className="story__title">
          <Link to={`/articles/${story.slug}`} prefetch="intent">
            {story.title}
          </Link>
        </H>
        {showDek ? <p className="story__dek">{story.dek}</p> : null}
        <StoryMeta story={story} />
      </div>
      <div className="story__media">
        <Img image={story.cover.image} alt="" sizes="160px" />
      </div>
    </article>
  );
}

export function RankedList({ stories }: { stories: ArticleSummary[] }) {
  return (
    <ol className="ranked">
      {stories.map((story) => (
        <li key={story.slug} className="ranked__item">
          <div>
            <h3 className="ranked__title">
              <Link to={`/articles/${story.slug}`} prefetch="intent">
                {story.title}
              </Link>
            </h3>
            <p className="meta">
              <span>{story.author.name}</span>
              <span>{story.readingMinutes} min read</span>
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
