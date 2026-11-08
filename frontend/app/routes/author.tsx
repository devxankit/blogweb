import { data } from "react-router";
import { Monogram } from "~/components/meta";
import { Breadcrumbs } from "~/components/nav-bits";
import { StoryCard } from "~/components/story";
import { getAuthor } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import { authorProfile, breadcrumbs } from "~/lib/structured-data";
import type { Route } from "./+types/author";

export async function loader({ params }: Route.LoaderArgs) {
  const result = await getAuthor(params.slug);
  if (!result) throw data(null, { status: 404 });
  return result;
}

export const meta: Route.MetaFunction = ({ loaderData }) => {
  if (!loaderData) return [];
  const { author } = loaderData;
  const path = `/authors/${author.slug}`;
  return seo({
    title: `${author.name}, ${author.role}`,
    description: author.shortBio,
    path,
    type: "profile",
    jsonLd: [
      authorProfile(author),
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Contributors", path: "/authors" },
        { name: author.name, path },
      ]),
    ],
  });
};

export default function AuthorPage({ loaderData }: Route.ComponentProps) {
  const { author, articles } = loaderData;
  return (
    <div className="container">
      <div className="author-head">
        <Monogram name={author.name} large />
        <div>
          <Breadcrumbs
            items={[
              { name: "Home", path: "/" },
              { name: "Contributors", path: "/authors" },
              { name: author.name, path: `/authors/${author.slug}` },
            ]}
          />
          <h1 className="author-head__name">{author.name}</h1>
          <p className="author-head__role">
            {author.role}
            {author.location ? `, based in ${author.location}` : ""}
          </p>
          <div className="author-head__bio">
            {author.bio.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <ul className="author-head__expertise" aria-label="Writes about">
            {author.expertise.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </div>

      <section className="stack-section" aria-labelledby="by-author">
        <div className="band-head">
          <h2 id="by-author" className="band-head__title">
            Stories by {author.name}
          </h2>
          <span className="band-head__aside">
            {articles.length} {articles.length === 1 ? "story" : "stories"}
          </span>
        </div>
        <div className="card-grid">
          {articles.map((story) => (
            <StoryCard key={story.slug} story={story} />
          ))}
        </div>
      </section>
    </div>
  );
}
