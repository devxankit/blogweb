import { useId, useState, type FormEvent } from "react";
import { postComment } from "~/lib/api";
import { formatDate } from "~/lib/text";
import type { StoryComment } from "~/lib/types";

/** Approved comments on a story, and the form for adding one. */
export function Comments({ slug, comments }: { slug: string; comments: StoryComment[] }) {
  const id = useId();
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    const result = await postComment({
      slug,
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      body: String(form.get("body") ?? ""),
      website: String(form.get("website") ?? ""),
    });
    if (result.ok) setState("sent");
    else {
      setError(result.error);
      setState("idle");
    }
  }

  return (
    <section id="comments" className="comments" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="comments__title">
        {comments.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comments"}
      </h2>

      {comments.length ? (
        <ol className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <p className="comment__meta">
                <span className="comment__name">{c.name}</span>
                <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>
              </p>
              <p className="comment__body">{c.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="comments__empty">No comments yet. Start the conversation.</p>
      )}

      {state === "sent" ? (
        <p className="form-status" role="status">
          Thank you. Your comment will appear here once an editor has reviewed it.
        </p>
      ) : (
        <form className="comments__form" onSubmit={onSubmit}>
          <h3 className="comments__form-title">Add a comment</h3>
          <div className="comments__row">
            <div className="form-field">
              <label htmlFor={`${id}-name`}>Name</label>
              <input id={`${id}-name`} name="name" className="input" autoComplete="name" required minLength={2} maxLength={60} />
            </div>
            <div className="form-field">
              <label htmlFor={`${id}-email`}>Email (optional, never shown)</label>
              <input id={`${id}-email`} name="email" type="email" className="input" autoComplete="email" maxLength={200} />
            </div>
          </div>
          {/* Left empty by people; bots that fill it in are ignored. */}
          <div className="comments__trap" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="form-field">
            <label htmlFor={`${id}-body`}>Comment</label>
            <textarea id={`${id}-body`} name="body" className="textarea" required minLength={3} maxLength={2000} />
          </div>
          {error ? (
            <p className="form-status form-status--error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="comments__submit">
            <button type="submit" className="button" disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Post comment"}
            </button>
            <p className="form-note">Comments are reviewed before they appear.</p>
          </div>
        </form>
      )}
    </section>
  );
}
