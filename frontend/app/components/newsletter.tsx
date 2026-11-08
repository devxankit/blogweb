import { useId, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { subscribeToNewsletter } from "~/lib/api";

type Status = { state: "idle" | "sending" | "done" } | { state: "error"; message: string };

export function NewsletterForm({ cta = "Subscribe" }: { cta?: string }) {
  const id = useId();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const { pathname } = useLocation();
  const source = pathname === "/newsletter" ? "newsletter" : pathname.startsWith("/articles/") ? "article" : "footer";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setStatus({ state: "sending" });
    const result = await subscribeToNewsletter(email, source);
    setStatus(result.ok ? { state: "done" } : { state: "error", message: result.error });
  }

  if (status.state === "done") {
    return (
      <p className="form-status" role="status">
        You are subscribed. The next letter arrives on Sunday morning.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <label htmlFor={id} className="visually-hidden">
          Email address
        </label>
        <input id={id} name="email" type="email" autoComplete="email" placeholder="Your email address" required />
        <button type="submit" className="button" disabled={status.state === "sending"}>
          {status.state === "sending" ? "Subscribing…" : cta}
        </button>
      </div>
      {status.state === "error" ? (
        <p className="form-status form-status--error" role="alert">
          {status.message}
        </p>
      ) : null}
      <p className="form-note">
        Free, weekly, and one click to leave. Read how we handle your address in our <Link to="/privacy">privacy policy</Link>.
      </p>
    </form>
  );
}

export function NewsletterBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "letter letter--compact" : "letter"}>
      <div>
        <h2 className="letter__title">The Sunday letter</h2>
        <p className="letter__text">
          The week’s stories, one essay we could not stop thinking about, and what to look for in the night sky. Sent every Sunday.
        </p>
      </div>
      <NewsletterForm />
    </div>
  );
}
