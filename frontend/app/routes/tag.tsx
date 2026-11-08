import { data, Link } from "react-router";
import { StoryCard } from "~/components/story";
import { getTag } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { collection } from "~/lib/structured-data";
import type { Route } from "./+types/tag";

export async function loader({ params }: Route.LoaderArgs) {
  const tag = await getTag(params.tag);
  if (!tag) throw data(null, { status: 404 });
  return { slug: params.tag, ...tag };
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [];
  const { name, slug, articles } = loaderData;
  const description = `Stories about ${name} from CosmosLens: reported features, essays and analysis.`;
  return seo({
    title: name,
    description,
    path: `/tags/${slug}`,
    // Thin tag pages stay out of the index until they collect enough stories.
    noindex: articles.length < 2,
    jsonLd: [collection(name, description, `/tags/${slug}`, articles)],
  });
};

export default function TagPage({ loaderData }: Route.ComponentProps) {
  const { name, articles } = loaderData;
  return (
    <div className="container">
      <header className="page-head">
        <p className="label">Topic</p>
        <h1 className="page-head__title">{name}</h1>
        <p className="page-head__note">
          {articles.length} {articles.length === 1 ? "story" : "stories"}. <Link to="/search">Search the archive</Link> for more.
        </p>
      </header>
      <div className="card-grid">
        {articles.map((story) => (
          <StoryCard key={story.slug} story={story} />
        ))}
      </div>
    </div>
  );
}
