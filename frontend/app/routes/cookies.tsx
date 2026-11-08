import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/cookies";

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Cookie policy",
    description: "The cookies and similar technologies used on CosmosLens, what they do, and how to control them.",
    path: "/cookies",
  });

export default function Cookies() {
  return (
    <DocPage
      title="Cookie policy"
      lede="Cookies are small files a website stores in your browser. Here is what is stored when you read CosmosLens."
      updated="2026-10-20"
      sections={[
        {
          id: "necessary",
          title: "Necessary storage",
          body: (
            <p>
              We store your theme choice, light or dark, in your browser’s local storage so the site looks the way you left it. This
              is not shared with anyone and is not used for tracking.
            </p>
          ),
        },
        {
          id: "advertising",
          title: "Advertising cookies",
          body: (
            <>
              <p>
                Ads on {site.name} are provided by Google AdSense. Google and its partners may set cookies, or read existing ones, to
                show ads, limit how often you see the same ad, measure performance and, where you allow it, personalize ads based on
                your interests.
              </p>
              <p>
                Read{" "}
                <a href="https://policies.google.com/technologies/ads" rel="noopener" target="_blank">
                  how Google uses cookies in advertising
                </a>{" "}
                and manage personalization in{" "}
                <a href="https://adssettings.google.com" rel="noopener" target="_blank">
                  Google’s Ads Settings
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: "analytics",
          title: "Analytics",
          body: (
            <p>
              If we measure readership, we use aggregated statistics about which pages are read. We will list any analytics provider
              here, with a link to its own policy, before it is turned on.
            </p>
          ),
        },
        {
          id: "control",
          title: "Your choices",
          body: (
            <>
              <p>
                Visitors from the UK, the EEA and Switzerland are asked for consent before non-essential cookies are used, and can
                change that choice at any time. Everyone can block or delete cookies in their browser settings; the site will still
                work, though ads may be less relevant.
              </p>
              <p>
                For more about how we handle personal information, see our <Link to="/privacy">privacy policy</Link>.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
