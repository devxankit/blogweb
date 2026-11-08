import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/editorial-standards";

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Editorial standards",
    description: "How CosmosLens sources, checks and corrects its stories, how AI tools are used, and how we keep advertising separate.",
    path: "/editorial-standards",
  });

export default function EditorialStandards() {
  return (
    <DocPage
      title="Editorial standards"
      lede="What you can expect from every story we publish, and what to do if we fall short."
      updated="2026-11-08"
      sections={[
        {
          id: "accuracy",
          title: "Accuracy and sourcing",
          body: (
            <>
              <p>
                We work from primary sources wherever they exist: peer-reviewed papers, preprints, datasets and mission documents.
                When a finding has not yet been peer reviewed, we say so.
              </p>
              <p>
                We distinguish between what a study shows, what its authors suggest, and what other experts have published about it.
                We do not describe a single result as settled science.
              </p>
            </>
          ),
        },
        {
          id: "review",
          title: "How stories are made",
          body: (
            <>
              <p>
                Stories are prepared in-house and published under the shared byline of the {site.name} editors. Work by outside
                writers and researchers is credited to them by name.
              </p>
              <p>
                We use AI tools to help with research and drafting. They do not decide what we publish: every story is checked against
                its sources before publication, including numbers, names and dates. Quotations come from published sources and are not
                altered in meaning.
              </p>
            </>
          ),
        },
        {
          id: "corrections",
          title: "Corrections",
          body: (
            <>
              <p>
                When we make a factual error, we correct it promptly and add a note at the end of the story saying what was changed
                and when. We do not quietly edit errors out. Updates that add new information are marked with the date of the
                update.
              </p>
              <p>
                To report an error, write to <a href={`mailto:${site.email.corrections}`}>{site.email.corrections}</a> with the
                story’s address and what you believe is wrong.
              </p>
            </>
          ),
        },
        {
          id: "independence",
          title: "Independence and advertising",
          body: (
            <>
              <p>
                Our journalism is editorially independent. Advertisers, sponsors and funders have no say in what we cover or how. Ads
                are served by third-party networks, are labeled “Advertisement”, and are visually separate from our stories.
              </p>
              <p>
                We do not accept payment for coverage, and we do not publish sponsored content presented as journalism. Writers
                disclose any financial or personal ties to the subjects they cover, and editors decide whether those ties prevent
                them from writing the story.
              </p>
            </>
          ),
        },
        {
          id: "images",
          title: "Images",
          body: (
            <p>
              Many of our images come from space agencies and research institutions. Every image is credited in its caption with its
              source and license. Artist’s impressions and illustrations are labeled as such, and we do not alter scientific images
              in ways that change what they show.
            </p>
          ),
        },
        {
          id: "feedback",
          title: "Feedback",
          body: (
            <p>
              We read every message. For anything else about our work, see the <Link to="/contact">contact page</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
