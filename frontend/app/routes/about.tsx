import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { Caption, Img } from "~/components/img";
import { site } from "~/config/site";
import { getAuthors, getSections } from "~/lib/content.server";
import { ultraDeepField } from "~/lib/images";
import { seo } from "~/lib/seo";
import { breadcrumbs, publisher } from "~/lib/structured-data";
import type { Route } from "./+types/about";

export async function loader() {
  const [authors, sections] = await Promise.all([getAuthors(), getSections()]);
  return { authors, sections };
}

export const meta: Route.MetaFunction = () =>
  seo({
    title: "About",
    description:
      "CosmosLens is an independent publication of long-form journalism on space and science. Who we are, what we cover and how we work.",
    path: "/about",
    jsonLd: [publisher(), breadcrumbs([{ name: "Home", path: "/" }, { name: "About", path: "/about" }])],
  });

export default function About({ loaderData }: Route.ComponentProps) {
  const { authors, sections } = loaderData;
  return (
    <DocPage
      title="Looking hard at what seems empty"
      lede={`${site.name} publishes reported features, essays and analysis on space and science for readers who want the whole story, and the evidence behind it.`}
      before={
        <figure className="about-hero">
          <div className="about-hero__media">
            <Img
              image={ultraDeepField}
              alt="The Hubble Ultra Deep Field: thousands of galaxies of different shapes, colors and distances scattered across black space."
              sizes="(max-width: 1380px) 100vw, 1320px"
              priority
            />
          </div>
          <Caption
            image={ultraDeepField}
            caption="The Hubble Ultra Deep Field. Almost every point of light in this image is a galaxy."
          />
        </figure>
      }
      sections={[
        {
          id: "the-name",
          title: "Why CosmosLens",
          body: (
            <>
              <p>
                In 1609, Galileo turned a tube holding two small glass lenses toward the night sky. He saw mountains on the Moon and,
                within months, four moons circling Jupiter. Nothing in the sky had changed. What changed was how closely someone was
                willing to look.
              </p>
              <p>
                That idea runs through astronomy. In December 1995, astronomers pointed the Hubble Space Telescope at a patch of sky
                in the constellation Ursa Major that looked almost completely empty, and kept it there for ten days. Many colleagues
                thought it was a waste of precious telescope time. The resulting image, the Hubble Deep Field, showed around three
                thousand galaxies, some of them seen as they were more than twelve billion years ago.
              </p>
              <p>
                That is what we mean by a lens: not a way to make things look bigger than they are, but a way to see clearly what is
                already there. Pick something that looks settled or empty, look at it for longer than seems reasonable, and report
                what is actually there.
              </p>
            </>
          ),
        },
        {
          id: "what-we-cover",
          title: "What we cover",
          body: (
            <>
              <p>
                We organize our journalism into six sections. Each is marked across the site by a thin colored line, keyed to a
                real spectral emission line, the kind of fingerprint astronomers use to tell what distant objects are made of.
              </p>
              <ul>
                {sections.map((s) => (
                  <li key={s.slug}>
                    <Link to={`/${s.slug}`}>{s.name}</Link>: {s.description} <em>({s.line.label}, {s.line.nm} nm.)</em>
                  </li>
                ))}
              </ul>
            </>
          ),
        },
        {
          id: "how-we-work",
          title: "How we work",
          body: (
            <>
              <p>
                Our stories are built on primary sources: the published research, the data, and interviews with the people who did
                the work and with independent experts who did not. We explain uncertainty rather than hiding it, and we say plainly
                when a result is preliminary, disputed or unreplicated.
              </p>
              <p>
                Every story carries the name of the writer responsible for it and is edited before publication. When we get
                something wrong, we correct it openly. Our full <Link to="/editorial-standards">editorial standards</Link> describe
                how.
              </p>
            </>
          ),
        },
        {
          id: "funding",
          title: "How we are funded",
          body: (
            <p>
              {site.name} is free to read. It is supported by advertising and by readers who subscribe to our newsletter and share
              our work. Advertisers have no influence over what we cover or how we cover it, and advertising is always clearly
              labeled and kept separate from journalism.
            </p>
          ),
        },
        {
          id: "masthead",
          title: "Masthead",
          body: (
            <ul className="masthead-list">
              {authors.map((a) => (
                <li key={a.slug}>
                  <Link to={`/authors/${a.slug}`}>{a.name}</Link>
                  <span>{a.role}</span>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "contact",
          title: "Get in touch",
          body: (
            <p>
              Story ideas, corrections and questions are welcome. Find the right address on our <Link to="/contact">contact page</Link>
              , or read our guidelines if you would like to <Link to="/contribute">write for us</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
