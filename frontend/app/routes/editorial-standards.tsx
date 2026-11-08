import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/editorial-standards";

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Editorial standards",
    description: "How CosmosLens reports, sources, fact-checks and corrects its journalism, and how we keep advertising separate.",
    path: "/editorial-standards",
  });

export default function EditorialStandards() {
  return (
    <DocPage
      title="Editorial standards"
      lede="What you can expect from every story we publish, and what to do if we fall short."
      updated="2026-10-01"
      sections={[
        {
          id: "accuracy",
          title: "Accuracy and sourcing",
          body: (
            <>
              <p>
                We report from primary sources wherever they exist: peer-reviewed papers, preprints, datasets, mission documents and
                interviews. When we cite research, we link to it. When a finding has not yet been peer reviewed, we say so.
              </p>
              <p>
                We distinguish between what a study shows, what its authors suggest, and what other experts think. We do not
                describe a single result as settled science, and we seek out independent researchers to comment on significant
                claims.
              </p>
            </>
          ),
        },
        {
          id: "review",
          title: "Editing and fact-checking",
          body: (
            <p>
              Every story is edited before publication. Features and analysis are fact-checked against their sources, and numbers,
              names, dates and quotations are verified. Quotations are not altered in meaning, and we do not offer sources approval of
              our copy, though we may check technical passages with them for accuracy.
            </p>
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
