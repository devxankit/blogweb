import { Link } from "react-router";
import { Monogram } from "~/components/meta";
import { getAuthors } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/authors";

export async function loader() {
  return { authors: await getAuthors() };
}

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Contributors",
    description: "Who writes for CosmosLens: the editorial team and the contributors credited on our stories.",
    path: "/authors",
  });

export default function Authors({ loaderData }: Route.ComponentProps) {
  return (
    <div className="container">
      <header className="page-head">
        <h1 className="page-head__title">Contributors</h1>
        <p className="page-head__lede">
          Stories on CosmosLens are published under the shared byline of our editorial team. Writers and researchers who contribute
          are credited by name.
        </p>
      </header>
      <ul className="people">
        {loaderData.authors.map((a) => (
          <li key={a.slug} className="person">
            <Monogram name={a.name} />
            <div>
              <h2 className="person__name">
                <Link to={`/authors/${a.slug}`}>{a.name}</Link>
              </h2>
              <p className="person__role">
                {a.role}, {a.articleCount} {a.articleCount === 1 ? "story" : "stories"}
              </p>
              <p className="person__bio">{a.shortBio}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
