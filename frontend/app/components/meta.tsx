import { Link } from "react-router";
import { useSection } from "~/lib/sections";
import { formatDate } from "~/lib/text";
import type { ArticleFormat, ArticleSummary, SectionSlug } from "~/lib/types";

export function SectionMark({ section, link = true }: { section: SectionSlug; link?: boolean }) {
  const s = useSection(section);
  if (!s) return null;
  return link ? (
    <Link to={`/${s.slug}`} className="section-mark" data-section={s.slug}>
      {s.name}
    </Link>
  ) : (
    <span className="section-mark" data-section={s.slug}>
      {s.name}
    </span>
  );
}

export function Kicker({ section, format, link = true }: { section: SectionSlug; format: ArticleFormat; link?: boolean }) {
  return (
    <div className="kicker">
      <SectionMark section={section} link={link} />
      <span className="kicker__format">{format}</span>
    </div>
  );
}

export function StoryMeta({ story, showAuthor = true }: { story: ArticleSummary; showAuthor?: boolean }) {
  return (
    <p className="meta">
      {showAuthor ? (
        <Link to={`/authors/${story.author.slug}`} className="meta__author">
          {story.author.name}
        </Link>
      ) : null}
      <time dateTime={story.publishedAt}>{formatDate(story.publishedAt)}</time>
      <span>{story.readingMinutes} min read</span>
    </p>
  );
}

export function Monogram({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <span className={large ? "monogram monogram--large" : "monogram"} aria-hidden="true">
      {initials}
    </span>
  );
}
