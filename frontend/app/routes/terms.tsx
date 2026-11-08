import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/terms";

// Template terms. Have them reviewed for your jurisdiction before launch.

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Terms of use",
    description: "The terms that apply when you read, share or contribute to CosmosLens.",
    path: "/terms",
  });

export default function Terms() {
  return (
    <DocPage
      title="Terms of use"
      lede={`By using ${site.name} you agree to these terms. They are written to be read.`}
      updated="2026-10-20"
      sections={[
        {
          id: "using",
          title: "Using the site",
          body: (
            <p>
              You may read, link to and share our stories for personal, non-commercial purposes. Please do not scrape the site in
              bulk, interfere with its operation, or attempt to access parts of it that are not public.
            </p>
          ),
        },
        {
          id: "content",
          title: "Our content",
          body: (
            <>
              <p>
                Text, design and original illustrations on {site.name} are protected by copyright. You may quote short passages with
                a link back to the original story. To republish a full story, ask us first.
              </p>
              <p>
                Many images belong to their creators or are in the public domain; each caption lists the source and license that
                applies to that image.
              </p>
            </>
          ),
        },
        {
          id: "submissions",
          title: "Your submissions",
          body: (
            <p>
              When you send us a pitch, letter or tip, you confirm that it is yours to share. We may quote letters, edited for length,
              unless you ask us not to. Commissioned work is covered by a separate agreement; see{" "}
              <Link to="/contribute">writing for us</Link>.
            </p>
          ),
        },
        {
          id: "accuracy",
          title: "Information, not advice",
          body: (
            <p>
              We work hard to be accurate, and we correct mistakes when we find them. Our stories are journalism, not professional,
              medical or financial advice, and science changes as new evidence arrives.
            </p>
          ),
        },
        {
          id: "links",
          title: "Links and advertising",
          body: (
            <p>
              We link to other websites and show ads from third parties. We are not responsible for their content or practices, and
              an ad appearing on our pages is not an endorsement.
            </p>
          ),
        },
        {
          id: "liability",
          title: "Liability",
          body: (
            <p>
              The site is provided as it is. To the extent the law allows, we are not liable for losses arising from your use of it.
              Nothing in these terms limits rights you have under consumer law that cannot be excluded.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes and contact",
          body: (
            <p>
              We may update these terms and will change the date above when we do. Questions go to{" "}
              <a href={`mailto:${site.email.editors}`}>{site.email.editors}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
