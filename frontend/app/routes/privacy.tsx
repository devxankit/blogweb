import { Link } from "react-router";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/privacy";

// Template policy covering Google AdSense's required disclosures. Have it
// reviewed for your jurisdiction before launch.

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Privacy policy",
    description: "What information CosmosLens collects, how advertising cookies work on this site, and the choices you have.",
    path: "/privacy",
  });

export default function Privacy() {
  return (
    <DocPage
      title="Privacy policy"
      lede="We collect as little about you as we can, and we tell you plainly what our advertising partners collect."
      updated="2026-11-08"
      sections={[
        {
          id: "summary",
          title: "In short",
          body: (
            <ul>
              <li>You can read everything on {site.name} without an account.</li>
              <li>If you subscribe to our newsletter or write to us, we keep your email address for that purpose only.</li>
              <li>Our site shows ads from Google, which uses cookies to choose and measure them. You can control this.</li>
              <li>We do not sell your personal information.</li>
            </ul>
          ),
        },
        {
          id: "what-we-collect",
          title: "Information we collect",
          body: (
            <>
              <p>
                <strong>Information you give us.</strong> When you subscribe to the newsletter we store your email address. When you
                contact us we store your message, your name and your email address so we can reply. When you comment on a story we
                store your name, your comment and, if you give it, your email address. Your name and comment are published once an
                editor approves them; your email address is never shown.
              </p>
              <p>
                <strong>Information collected automatically.</strong> Like most websites, our servers record basic technical
                information such as your IP address, browser type and the pages you request, to keep the site secure and working.
              </p>
              <p>
                <strong>Analytics, if you allow it.</strong> If you choose “Accept all” on our cookie message, we record under a random
                id which pages you open, how long you spend on them, how far you scroll, the website that sent you, your device type,
                browser and country. We do not store your IP address with this data, and we keep it for up to 13 months. If you choose
                “Essentials only”, we only add to an anonymous count of page views. If you choose “Reject all”, your visit is not
                counted. Our <Link to="/cookies">cookie policy</Link> has the details, and you can change your choice there.
              </p>
              <p>
                <strong>Preferences on your device.</strong> If you choose a light or dark theme, that choice is stored in your
                browser’s local storage. It never leaves your device.
              </p>
            </>
          ),
        },
        {
          id: "advertising",
          title: "Advertising and cookies",
          body: (
            <>
              <p>
                We use Google AdSense to show advertising. Third-party vendors, including Google, use cookies to serve ads based on
                your prior visits to this website or other websites. Google’s use of advertising cookies enables it and its
                partners to serve ads to you based on your visits to this site and/or other sites on the internet.
              </p>
              <p>
                You may opt out of personalized advertising by visiting{" "}
                <a href="https://adssettings.google.com" rel="noopener" target="_blank">
                  Google’s Ads Settings
                </a>
                . You can also opt out of some third-party vendors’ use of cookies for personalized advertising at{" "}
                <a href="https://www.aboutads.info/choices/" rel="noopener" target="_blank">
                  aboutads.info
                </a>
                {" "}or, in Europe,{" "}
                <a href="https://www.youronlinechoices.eu/" rel="noopener" target="_blank">
                  youronlinechoices.eu
                </a>
                .
              </p>
              <p>
                To learn how Google uses information from sites that use its services, see{" "}
                <a href="https://policies.google.com/technologies/partner-sites" rel="noopener" target="_blank">
                  How Google uses information from sites or apps that use our services
                </a>
                . Our <Link to="/cookies">cookie policy</Link> describes the cookies in more detail.
              </p>
            </>
          ),
        },
        {
          id: "consent",
          title: "Consent in the UK, EEA and Switzerland",
          body: (
            <p>
              We ask every visitor for a choice before non-essential cookies are used, through a message shown on the first visit. You
              can change your choice at any time from the “Cookie settings” link at the bottom of every page. If you visit from the
              United Kingdom, the European Economic Area or Switzerland, we also ask for your consent before personalized ads are used.
            </p>
          ),
        },
        {
          id: "use",
          title: "How we use information",
          body: (
            <ul>
              <li>To send the newsletter you asked for, and to stop when you unsubscribe.</li>
              <li>To answer messages, pitches and correction requests.</li>
              <li>To run, secure and improve the site.</li>
              <li>To show advertising that pays for our journalism, as described above.</li>
            </ul>
          ),
        },
        {
          id: "sharing",
          title: "Sharing",
          body: (
            <p>
              We share information only with service providers who help us run the site and newsletter, under contracts that limit
              their use of it, with advertising partners as described above, or when the law requires it. We do not sell personal
              information, and we do not share it for cross-context behavioral advertising beyond what our ad partners collect
              through their own cookies, which you can control.
            </p>
          ),
        },
        {
          id: "rights",
          title: "Your rights",
          body: (
            <p>
              Depending on where you live, you may have the right to access, correct, delete or export your personal information, to
              object to or restrict its use, and to withdraw consent. California residents may also opt out of the sale or sharing of
              personal information. To make a request, write to <a href={`mailto:${site.email.privacy}`}>{site.email.privacy}</a>. We
              will respond within the time the law requires.
            </p>
          ),
        },
        {
          id: "retention",
          title: "Retention and security",
          body: (
            <p>
              We keep newsletter addresses until you unsubscribe, correspondence for as long as needed to deal with it, approved
              comments until you ask us to remove them, and analytics records for up to 13 months. We use
              encryption in transit and restrict access to the people who need it.
            </p>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <p>
              {site.name} is written for adults. We do not knowingly collect personal information from children under 13, or under 16
              where local law sets a higher age.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes and contact",
          body: (
            <p>
              If we change this policy we will update the date at the top of this page, and for significant changes we will tell
              newsletter subscribers. Questions go to <a href={`mailto:${site.email.privacy}`}>{site.email.privacy}</a>.
            </p>
          ),
        },
      ]}
    />
  );
}
