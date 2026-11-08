import { useEffect, useId, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Form, Link, useFetcher, useNavigation, useSearchParams } from "react-router";
import type { ActionResult } from "~/lib/admin.server";

/* Formatting */

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

/** 1,284 below ten thousand; 12.9K above. */
export function formatCount(n: number) {
  return n < 10000 ? full.format(n) : compact.format(n);
}

export function formatFull(n: number) {
  return full.format(n);
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatDay(iso: string | Date | null | undefined) {
  return iso ? dateFmt.format(new Date(iso)) : "";
}

export function formatDateTime(iso: string | Date | null | undefined) {
  return iso ? dateTimeFmt.format(new Date(iso)) : "";
}

/** "3 hours ago", "yesterday", or a date for anything older than a week. */
export function timeAgo(iso: string | Date) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return formatDay(iso);
}

/**
 * "5 min ago", with the exact time on hover. The server and the browser can
 * render it a minute apart, so a mismatch here is expected and harmless.
 */
export function Ago({ date }: { date: string | Date }) {
  const iso = new Date(date).toISOString();
  return (
    <time dateTime={iso} title={formatDateTime(iso)} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

/* Page frame */

export function AdminPage({
  title,
  lede,
  actions,
  children,
  back,
}: {
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="nr-page">
      <header className="nr-page__head">
        <div>
          {back ? (
            <Link to={back.to} className="nr-back">
              <span aria-hidden="true">←</span> {back.label}
            </Link>
          ) : null}
          <h1 className="nr-page__title">{title}</h1>
          {lede ? <p className="nr-page__lede">{lede}</p> : null}
        </div>
        {actions ? <div className="nr-page__actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function Panel({ title, aside, children, className }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `nr-panel ${className}` : "nr-panel"}>
      {title || aside ? (
        <header className="nr-panel__head">
          {title ? <h2 className="nr-panel__title">{title}</h2> : <span />}
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="nr-empty">
      <p className="nr-empty__title">{title}</p>
      {children ? <div className="nr-empty__text">{children}</div> : null}
    </div>
  );
}

/* Status */

export type StoryStatus = "draft" | "scheduled" | "published";

const STATUS_LABEL: Record<StoryStatus, string> = { draft: "Draft", scheduled: "Scheduled", published: "Published" };

export function StatusBadge({ status }: { status: StoryStatus }) {
  return <span className={`nr-status nr-status--${status}`}>{STATUS_LABEL[status]}</span>;
}

export function SectionTag({ slug, name }: { slug: string; name?: string }) {
  return (
    <span className="section-mark nr-section" data-section={slug}>
      {name ?? slug}
    </span>
  );
}

/* Forms */

export function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
}: {
  label: ReactNode;
  name?: string;
  error?: string;
  hint?: ReactNode;
  children: (props: { id: string; "aria-invalid"?: true; "aria-describedby"?: string; name?: string }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className ? `nr-field ${className}` : "nr-field"}>
      <label htmlFor={id} className="nr-field__label">
        {label}
      </label>
      {children({ id, name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="nr-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="nr-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Banner for the result of a form submission. */
export function Notice({ result, success }: { result?: ActionResult | null; success?: string }) {
  if (!result) return null;
  if (result.ok) {
    const message = result.message ?? success;
    return message ? (
      <p className="nr-notice nr-notice--ok" role="status">
        {message}
      </p>
    ) : null;
  }
  return (
    <div className="nr-notice nr-notice--error" role="alert">
      <p>{result.error}</p>
      {Object.keys(result.fields ?? {}).length > 1 ? (
        <ul>
          {Object.entries(result.fields).map(([k, v]) => (
            <li key={k}>{v}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function fieldErrors(result: unknown): Record<string, string> {
  const r = result as ActionResult | undefined;
  return r && !r.ok ? r.fields ?? {} : {};
}

/** True while this page's form is submitting. */
export function useBusy(intent?: string) {
  const nav = useNavigation();
  if (nav.state !== "submitting") return false;
  return intent ? nav.formData?.get("intent") === intent : true;
}

/**
 * A small inline form for a one-click change (publish, mark read, delete).
 * Runs through a fetcher so the page keeps its scroll position.
 */
export function ActionButton({
  intent,
  values = {},
  children,
  confirm,
  className = "nr-link",
  action,
  disabled,
}: {
  intent: string;
  values?: Record<string, string>;
  children: ReactNode;
  confirm?: string;
  className?: string;
  action?: string;
  disabled?: boolean;
}) {
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== "idle";
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data.error : "";

  useEffect(() => {
    if (error) window.alert(error);
  }, [error, fetcher.data]);

  return (
    <fetcher.Form
      method="post"
      action={action}
      className="nr-inline-form"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className} disabled={busy || disabled} aria-busy={busy || undefined}>
        {children}
      </button>
    </fetcher.Form>
  );
}

/* Lists */

/** Filter tabs that set one search parameter. */
export function Tabs({ param, options }: { param: string; options: { value: string; label: string; count?: number }[] }) {
  const [params] = useSearchParams();
  const current = params.get(param) ?? "";
  return (
    <nav className="nr-tabs" aria-label="Filter">
      {options.map((o) => {
        const next = new URLSearchParams(params);
        if (o.value) next.set(param, o.value);
        else next.delete(param);
        next.delete("page");
        const qs = next.toString();
        return (
          <Link key={o.value} to={qs ? `?${qs}` : "."} className="nr-tab" aria-current={current === o.value ? "page" : undefined}>
            {o.label}
            {o.count !== undefined ? <span className="nr-tab__count">{formatFull(o.count)}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Search box that keeps the other filters. */
export function SearchBox({ placeholder, extra }: { placeholder: string; extra?: string[] }) {
  const [params] = useSearchParams();
  return (
    <Form method="get" className="nr-search" role="search">
      {(extra ?? []).map((k) =>
        params.get(k) ? <input key={k} type="hidden" name={k} value={params.get(k) ?? ""} /> : null,
      )}
      <label className="visually-hidden" htmlFor="nr-q">
        Search
      </label>
      <input id="nr-q" type="search" name="q" defaultValue={params.get("q") ?? ""} placeholder={placeholder} className="nr-input" />
      <button type="submit" className="button button--quiet">
        Search
      </button>
    </Form>
  );
}

export function Pager({ page, totalPages, total, noun }: { page: number; totalPages: number; total: number; noun: [string, string] }) {
  const [params] = useSearchParams();
  const link = (p: number) => {
    const next = new URLSearchParams(params);
    if (p === 1) next.delete("page");
    else next.set("page", String(p));
    const qs = next.toString();
    return qs ? `?${qs}` : ".";
  };
  return (
    <nav className="nr-pager" aria-label="Pages">
      <span>
        {formatFull(total)} {total === 1 ? noun[0] : noun[1]}
        {totalPages > 1 ? `, page ${page} of ${totalPages}` : ""}
      </span>
      {totalPages > 1 ? (
        <span className="nr-pager__links">
          {page > 1 ? <Link to={link(page - 1)}>Previous</Link> : null}
          {page < totalPages ? <Link to={link(page + 1)}>Next</Link> : null}
        </span>
      ) : null}
    </nav>
  );
}

/** Keeps a list of strings editable as one item per line. */
export function LinesInput({
  defaultValue,
  rows = 4,
  ...rest
}: { defaultValue: string[]; rows?: number } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue">) {
  return <textarea rows={rows} className="nr-input nr-textarea" defaultValue={defaultValue.join("\n")} {...rest} />;
}

/** Closes a <details> menu when focus or a click leaves it. */
export function useDismiss<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { ref, open, setOpen };
}
