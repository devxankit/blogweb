import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { openConsentSettings } from "~/lib/consent";
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
      updated="2026-11-08"
      sections={[
        {
          id: "your-choice",
          title: "Your choice",
          body: (
            <>
              <p>On your first visit we ask you to choose one of three options:</p>
              <ul>
                <li>
                  <strong>Accept all</strong> allows essential cookies and our analytics cookies.
                </li>
                <li>
                  <strong>Essentials only</strong> allows essential cookies. We add one to an anonymous count of views for the page you
                  are reading, and record nothing that identifies you or your device.
                </li>
                <li>
                  <strong>Reject all</strong> stores only the cookie that remembers this choice, and your visit is not counted.
                </li>
              </ul>
              <p>
                We also keep a daily total of how many people pick each option, with nothing attached to say who did. You can change
                your mind at any time.
              </p>
              <p>
                <button type="button" className="button button--quiet" onClick={openConsentSettings}>
                  Change my cookie settings
                </button>
              </p>
            </>
          ),
        },
        {
          id: "necessary",
          title: "Essential cookies and storage",
          body: (
            <>
              <ul>
                <li>
                  <code>cl_consent</code> remembers your cookie choice for 12 months.
                </li>
                <li>
                  <code>__df_admin</code> keeps our editors signed in. It is set only for staff who sign in, and lasts 7 days.
                </li>
                <li>
                  Your theme choice, light or dark, is kept in your browser’s local storage so the site looks the way you left it.
                </li>
              </ul>
              <p>None of these is used to follow you or shared with anyone.</p>
            </>
          ),
        },
        {
          id: "analytics",
          title: "Analytics cookies",
          body: (
            <>
              <p>These are set only if you choose “Accept all”. They are our own; no outside analytics company receives this data.</p>
              <ul>
                <li>
                  <code>cl_vid</code> is a random id that lets us tell returning visitors from new ones. It lasts 13 months.
                </li>
                <li>
                  <code>cl_sid</code> is a random id that groups the pages of one visit. It ends after 30 minutes without activity.
                </li>
              </ul>
              <p>
                With them we record which pages you open, how long you actively spend on each, how far you scroll, the website that
                sent you, your device type and browser, and your country. Country comes from your connection, and we do not store your
                IP address. We keep this for up to 13 months, then it is deleted automatically.
              </p>
              <p>
                If you change from “Accept all” to another option, the analytics cookies are removed and what we recorded under them
                is erased.
              </p>
            </>
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
          id: "control",
          title: "Browser controls",
          body: (
            <>
              <p>
                You can also block or delete cookies in your browser settings. The site will still work, though it will ask for your
                choice again and ads may be less relevant.
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
