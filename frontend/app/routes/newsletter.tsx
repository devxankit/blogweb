import { Link } from "react-router";
import { NewsletterForm } from "~/components/newsletter";
import { StoryRow } from "~/components/story";
import { getLatest } from "~/lib/content.server";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/newsletter";

export async function loader() {
  return { recent: await getLatest(3) };
}

export const meta: Route.MetaFunction = () =>
  seo({
    title: "The Sunday letter",
    description:
      "A free weekly email from CosmosLens: the week’s stories, one essay worth your time, and what to look for in the night sky.",
    path: "/newsletter",
  });

export default function Newsletter({ loaderData }: Route.ComponentProps) {
  return (
    <div className="container">
      <header className="page-head">
        <h1 className="page-head__title">The Sunday letter</h1>
        <p className="page-head__lede">
          One email a week, on Sunday morning. It takes about five minutes to read and leaves you with something to think about
          for the rest of the week.
        </p>
      </header>

      <div className="doc doc--flush">
        <div className="doc__nav" />
        <div className="doc__body">
          <div className="prose">
            <p>Each letter includes:</p>
            <ul>
              <li>The stories we published that week, with a line from the editor on why each one matters.</li>
              <li>One piece from elsewhere, a paper, essay or archive find, that we could not stop thinking about.</li>
              <li>What to look for in the night sky this week, written for people with nothing more than their eyes.</li>
            </ul>
          </div>
          <div className="form-block">
            <NewsletterForm cta="Subscribe for free" />
          </div>

          <section className="stack-section" aria-labelledby="recent-title">
            <div className="band-head">
              <h2 id="recent-title" className="band-head__title">
                From this week’s letter
              </h2>
              <Link to="/articles" className="text-link">
                All stories
              </Link>
            </div>
            {loaderData.recent.map((story) => (
              <StoryRow key={story.slug} story={story} showDek={false} />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
