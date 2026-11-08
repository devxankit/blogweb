import { useEffect, useState } from "react";
import { Link, useFetcher } from "react-router";
import { ActionButton, AdminPage, Panel } from "~/components/admin/ui";
import { adminApi, attempt, field, type ActionResult } from "~/lib/admin.server";
import { BUILT_IN_SECTIONS } from "~/lib/sections";
import type { Section } from "~/lib/types";
import type { Route } from "./+types/sections";

type Row = Section & { id: string; order: number; articleCount: number };

export async function loader({ request }: Route.LoaderArgs) {
  return { sections: await adminApi<Row[]>(request, "/sections") };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = field(form, "intent");
  const id = field(form, "id");
  const body = {
    name: field(form, "name"),
    slug: field(form, "slug"),
    description: field(form, "description"),
    line: { label: field(form, "lineLabel"), nm: field(form, "lineNm") },
    color: field(form, "color"),
    order: field(form, "order") || "0",
  };
  return attempt(async () => {
    if (intent === "create") {
      await adminApi(request, "/sections", { method: "POST", body });
      return { ok: true, message: "Section created. It now appears in the site’s navigation." };
    }
    if (intent === "update") {
      await adminApi(request, `/sections/${id}`, { method: "PUT", body });
      return { ok: true, message: "Section saved." };
    }
    if (intent === "delete") {
      await adminApi(request, `/sections/${id}`, { method: "DELETE" });
      return { ok: true, message: "Section deleted." };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

function SectionForm({ section, onDone }: { section?: Row; onDone?: () => void }) {
  const fetcher = useFetcher<ActionResult>();
  const busy = fetcher.state !== "idle";
  const result = fetcher.data;
  const errors = result && !result.ok ? result.fields : {};
  const builtIn = section ? BUILT_IN_SECTIONS.has(section.slug) : false;

  useEffect(() => {
    if (fetcher.state === "idle" && result?.ok) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, result]);

  const err = (k: string) => (errors[k] ? <span className="nr-field__error">{errors[k]}</span> : null);

  return (
    <fetcher.Form method="post" className="nr-section-form" key={section?.id ?? "new"}>
      <input type="hidden" name="intent" value={section ? "update" : "create"} />
      {section ? <input type="hidden" name="id" value={section.id} /> : null}
      <div className="nr-form__row">
        <label className="nr-block__field">
          <span className="nr-block__label">Name</span>
          <input name="name" className="nr-input" defaultValue={section?.name} required />
          {err("name")}
        </label>
        {section ? (
          <label className="nr-block__field">
            <span className="nr-block__label">URL</span>
            <input className="nr-input" value={`/${section.slug}`} readOnly disabled />
            <span className="nr-field__hint">Fixed once created, so links keep working.</span>
          </label>
        ) : (
          <label className="nr-block__field">
            <span className="nr-block__label">URL</span>
            <input name="slug" className="nr-input" placeholder="Leave empty to use the name" />
            {err("slug")}
          </label>
        )}
      </div>
      <label className="nr-block__field">
        <span className="nr-block__label">Description</span>
        <textarea name="description" rows={2} className="nr-input nr-textarea" defaultValue={section?.description} required />
        <span className="nr-field__hint">Shown on the section page and in search results.</span>
        {err("description")}
      </label>
      <div className="nr-form__row nr-form__row--4">
        <label className="nr-block__field">
          <span className="nr-block__label">Emission line</span>
          <input name="lineLabel" className="nr-input" defaultValue={section?.line.label} placeholder="Hydrogen-alpha" required />
          {err("line.label")}
        </label>
        <label className="nr-block__field">
          <span className="nr-block__label">Wavelength (nm)</span>
          <input name="lineNm" type="number" step="0.1" className="nr-input" defaultValue={section?.line.nm} placeholder="656.3" required />
          {err("line.nm")}
        </label>
        <label className="nr-block__field">
          <span className="nr-block__label">Line color</span>
          {builtIn ? (
            <>
              <input className="nr-input" value="Tuned for both themes" readOnly disabled />
              <input type="hidden" name="color" value={section?.color ?? ""} />
            </>
          ) : (
            <input name="color" type="color" className="nr-input nr-color" defaultValue={section?.color || "#4d7cc7"} />
          )}
          {err("color")}
        </label>
        <label className="nr-block__field">
          <span className="nr-block__label">Order</span>
          <input name="order" type="number" min={0} max={999} className="nr-input" defaultValue={section?.order ?? 0} />
          <span className="nr-field__hint">Lower comes first in the menu.</span>
        </label>
      </div>
      {result && !result.ok && !Object.keys(errors).length ? <p className="nr-field__error">{result.error}</p> : null}
      <div className="nr-row-actions">
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Saving…" : section ? "Save section" : "Create section"}
        </button>
        {onDone && section ? (
          <button type="button" className="nr-link" onClick={onDone}>
            Cancel
          </button>
        ) : null}
        {result?.ok ? <span className="nr-saved">{result.message}</span> : null}
      </div>
    </fetcher.Form>
  );
}

export default function Sections({ loaderData }: Route.ComponentProps) {
  const { sections } = loaderData;
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <AdminPage
      title="Sections"
      lede="The site’s main navigation. Each section is keyed to a spectral emission line, shown as the thin colored mark beside its name."
      actions={
        <button type="button" className="button" onClick={() => setAdding(true)} disabled={adding}>
          New section
        </button>
      }
    >
      {adding ? (
        <Panel title="New section">
          <SectionForm onDone={() => setAdding(false)} />
        </Panel>
      ) : null}

      <ul className="nr-sections">
        {sections.map((s) => (
          <li key={s.id} className="nr-sections__item" data-section={s.slug}>
            {editing === s.id ? (
              <SectionForm section={s} onDone={() => setEditing(null)} />
            ) : (
              <div className="nr-sections__row">
                <span className="nr-sections__line" style={s.color && !BUILT_IN_SECTIONS.has(s.slug) ? { background: s.color } : undefined} aria-hidden="true" />
                <div className="nr-sections__body">
                  <p className="nr-sections__name">
                    {s.name} <span className="nr-muted">/{s.slug}</span>
                  </p>
                  <p className="nr-sections__desc">{s.description}</p>
                  <p className="nr-muted">
                    {s.line.label}, {s.line.nm} nm
                  </p>
                </div>
                <div className="nr-person__side">
                  <Link to={`/admin/articles?section=${s.slug}`} className="nr-link">
                    {s.articleCount} {s.articleCount === 1 ? "story" : "stories"}
                  </Link>
                  <div className="nr-row-actions">
                    <button type="button" className="nr-link" onClick={() => setEditing(s.id)}>
                      Edit
                    </button>
                    <ActionButton
                      intent="delete"
                      values={{ id: s.id }}
                      className="nr-link nr-link--danger"
                      disabled={s.articleCount > 0}
                      confirm={`Delete the ${s.name} section?`}
                    >
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
