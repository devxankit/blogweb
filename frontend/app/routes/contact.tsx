import { useState, type FormEvent } from "react";
import { DocPage } from "~/components/doc-page";
import { site } from "~/config/site";
import { sendContactMessage } from "~/lib/api";
import { seo } from "~/lib/seo";
import type { Route } from "./+types/contact";

export const meta: Route.MetaFunction = () =>
  seo({
    title: "Contact",
    description: "How to reach the CosmosLens editors with story ideas, corrections, privacy requests and partnership questions.",
    path: "/contact",
  });

const addresses = [
  { label: "Story ideas and tips", email: site.email.editors },
  { label: "Pitches from writers", email: site.email.pitches },
  { label: "Corrections", email: site.email.corrections },
  { label: "Privacy requests", email: site.email.privacy },
];

function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    const result = await sendContactMessage({
      name: String(form.get("name")),
      email: String(form.get("email")),
      topic: String(form.get("topic")),
      message: String(form.get("message")),
    });
    if (result.ok) setState("sent");
    else {
      setError(result.error);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <p className="form-status" role="status">
        Message sent. An editor will reply to the address you gave, usually within three working days.
      </p>
    );
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <div className="form-field">
        <label htmlFor="c-name">Name</label>
        <input id="c-name" name="name" className="input" autoComplete="name" required />
      </div>
      <div className="form-field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div className="form-field">
        <label htmlFor="c-topic">Topic</label>
        <select id="c-topic" name="topic" className="input" defaultValue="tip">
          <option value="tip">Story idea or tip</option>
          <option value="correction">Correction</option>
          <option value="feedback">Feedback on a story</option>
          <option value="partnership">Partnerships</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="c-message">Message</label>
        <textarea id="c-message" name="message" className="textarea" required />
      </div>
      {error ? (
        <p className="form-status form-status--error" role="alert">
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="button" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

export default function Contact() {
  return (
    <DocPage
      title="Contact"
      lede="We read everything that comes in. Choose the address that fits, or use the form."
      sections={[
        {
          id: "addresses",
          title: "Email",
          body: (
            <ul className="contact-list">
              {addresses.map((a) => (
                <li key={a.email}>
                  <span>{a.label}</span>
                  <a href={`mailto:${a.email}`}>{a.email}</a>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "write",
          title: "Write to us",
          body: <ContactForm />,
        },
        {
          id: "security",
          title: "Sensitive tips",
          body: (
            <p>
              If you have information that could put you or others at risk, do not use this form. Email us from a personal device
              and account, and tell us the safest way to reach you.
            </p>
          ),
        },
      ]}
    />
  );
}
