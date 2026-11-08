import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/contribute";

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Write for us",
    description: "Pitch guidelines for writers and scientists who want to write for CosmosLens.",
    path: "/contribute",
  });

export default function Contribute() {
  return (
    <DocPage
      title="Write for us"
      lede="We commission reported features, essays and explainers from journalists and from researchers who write well. Here is how to pitch."
      sections={[
        {
          id: "what",
          title: "What we are looking for",
          body: (
            <>
              <p>
                Stories that take a reader somewhere they could not get to alone: inside a measurement, an argument between
                research groups, an instrument, an archive or a career. We like stories with a question at the center, rather than
                a summary of a field.
              </p>
              <p>
                We are less interested in news write-ups of single papers, listicles, or stories whose main source is a press
                release.
              </p>
            </>
          ),
        },
        {
          id: "how",
          title: "How to pitch",
          body: (
            <ul>
              <li>Write a short email, three or four paragraphs, to {site.email.pitches}.</li>
              <li>Tell us the story, not just the topic: what happens, who is in it, and what the reader will understand by the end.</li>
              <li>Say why now, and why you are the person to write it.</li>
              <li>Include links to two or three published pieces, or a writing sample if you are new to journalism.</li>
            </ul>
          ),
        },
        {
          id: "scientists",
          title: "For researchers",
          body: (
            <p>
              We welcome essays from working scientists, especially about the parts of research that rarely make it into papers:
              failed approaches, instrument building, how a field decides what counts as evidence. You do not need to have written for
              the public before. An editor will work closely with you.
            </p>
          ),
        },
        {
          id: "next",
          title: "What happens next",
          body: (
            <p>
              We reply to every pitch, usually within two weeks. If we commission your story, we agree the length, deadline and fee in
              writing before you start, and an editor works with you through reporting, drafting and fact-checking.
            </p>
          ),
        },
      ]}
    />
  );
}
