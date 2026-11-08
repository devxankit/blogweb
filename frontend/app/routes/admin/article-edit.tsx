import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { data, Link, redirect, useActionData, useBlocker, useNavigation, useSubmit } from "react-router";
import { BlockEditor, countWords, newBlock, toPayload, uid, type EditorBlock } from "~/components/admin/block-editor";
import { ImagePicker, Thumb } from "~/components/admin/image-picker";
import { AdminPage, Ago, formatDateTime, formatFull, Notice, StatusBadge, type StoryStatus } from "~/components/admin/ui";
import { adminApi, attempt, type ActionResult } from "~/lib/admin.server";
import { ApiError } from "~/lib/api.server";
import type { ImageRef, Section } from "~/lib/types";
import type { Route } from "./+types/article-edit";

const FORMATS = ["Feature", "Essay", "Analysis", "Explainer", "Profile", "Report"] as const;

interface StoredArticle {
  id: string;
  slug: string;
  title: string;
  dek: string;
  seoTitle: string;
  seoDescription: string;
  section: string;
  format: (typeof FORMATS)[number];
  author: string;
  status: StoryStatus;
  publishedAt: string;
  revisedAt: string | null;
  cover: { image: string; alt: string; caption?: string };
  tags: string[];
  body: Omit<EditorBlock, "uid">[];
  views: number;
  wordCount: number;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [sections, authors, tags] = await Promise.all([
    adminApi<(Section & { id: string })[]>(request, "/sections"),
    adminApi<{ id: string; name: string; role: string }[]>(request, "/authors"),
    adminApi<{ name: string; count: number }[]>(request, "/articles/tags"),
  ]);
  if (!params.id) return { article: null, images: {} as Record<string, ImageRef | null>, sections, authors, tags };
  try {
    const { article, images } = await adminApi<{ article: StoredArticle; images: Record<string, ImageRef | null> }>(request, `/articles/${params.id}`);
    return { article, images, sections, authors, tags };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data(null, { status: 404 });
    throw err;
  }
}

export const meta: Route.MetaFunction = ({ loaderData }) => [{ title: loaderData?.article ? `Edit: ${loaderData.article.title}` : "New story" }];

type SaveResult = ActionResult & { status?: StoryStatus; slug?: string };

export async function action({ request, params }: Route.ActionArgs) {
  const body = (await request.json()) as { intent: "save" | "delete"; article?: Record<string, unknown> };
  return attempt(async () => {
    if (body.intent === "delete" && params.id) {
      await adminApi(request, `/articles/${params.id}`, { method: "DELETE" });
      return redirect("/admin/articles");
    }
    const saved = await adminApi<{ id: string; slug: string; status: StoryStatus }>(request, params.id ? `/articles/${params.id}` : "/articles", {
      method: params.id ? "PUT" : "POST",
      body: body.article,
    });
    if (!params.id) return redirect(`/admin/articles/${saved.id}?created=${saved.status}`);
    const message =
      saved.status === "published" ? "Saved. The story is live." : saved.status === "scheduled" ? "Saved. The story is scheduled." : "Draft saved.";
    return { ok: true, message, status: saved.status, slug: saved.slug } satisfies SaveResult;
  });
}

/* Date helpers: the form edits local time; the API stores UTC. */
const pad = (n: number) => String(n).padStart(2, "0");
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export default function ArticleEdit({ loaderData }: Route.ComponentProps) {
  const { article, sections, authors, tags: knownTags } = loaderData;
  const result = useActionData<typeof action>() as SaveResult | undefined;
  const submit = useSubmit();
  const navigation = useNavigation();
  const hydrated = useHydrated();
  const saving = navigation.state === "submitting";
  // Set while our own save or delete is in flight, so its redirect is never blocked.
  const submitting = useRef(false);
  useEffect(() => {
    if (navigation.state === "idle") submitting.current = false;
  }, [navigation.state]);

  const initial = useMemo(
    () => ({
      title: article?.title ?? "",
      dek: article?.dek ?? "",
      seoTitle: article?.seoTitle ?? "",
      seoDescription: article?.seoDescription ?? "",
      slug: article?.slug ?? "",
      section: article?.section ?? sections[0]?.slug ?? "",
      format: article?.format ?? "Feature",
      author: article?.author ?? authors[0]?.id ?? "",
      publishedAt: article?.publishedAt ?? "",
      cover: article?.cover ?? { image: "", alt: "", caption: "" },
      tags: article?.tags ?? [],
      body: (article?.body ?? [newBlock("p")]).map((b) => ({ ...b, uid: uid() }) as EditorBlock),
    }),
    [article, sections, authors],
  );

  const [form, setForm] = useState(initial);
  const [images, setImages] = useState<Record<string, ImageRef | null>>(loaderData.images);
  const [tagText, setTagText] = useState(initial.tags.join(", "));
  const [dateText, setDateText] = useState("");
  const [revised, setRevised] = useState<"keep" | "now" | "clear">("keep");
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [pickingCover, setPickingCover] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Reset when a different story loads (or after creating one).
  useEffect(() => {
    setForm(initial);
    setImages(loaderData.images);
    setTagText(initial.tags.join(", "));
    setDateText(toLocalInput(initial.publishedAt));
    setRevised("keep");
    setDirty(false);
  }, [initial, loaderData.images]);

  useEffect(() => {
    if (result?.ok) setDirty(false);
  }, [result]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const errors = result && !result.ok ? result.fields : {};
  const status: StoryStatus = (result?.ok && result.status) || article?.status || "draft";
  const live = status !== "draft";
  const words = countWords(form.body);
  const minutes = Math.max(1, Math.round(words / 230));
  const futureDate = dateText ? new Date(dateText).getTime() > Date.now() : false;
  const slugPreview = (slugTouched ? form.slug : form.title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const save = useCallback(
    (nextStatus: "draft" | "published") => {
      const payload = {
        title: form.title,
        slug: slugTouched ? form.slug : "",
        dek: form.dek,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        section: form.section,
        format: form.format,
        author: form.author,
        status: nextStatus,
        publishedAt: fromLocalInput(dateText),
        revised,
        cover: { image: form.cover.image, alt: form.cover.alt, caption: form.cover.caption ?? "" },
        tags: tagText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        body: toPayload(form.body),
      };
      submitting.current = true;
      submit({ intent: "save", article: payload }, { method: "post", encType: "application/json" });
    },
    [form, slugTouched, dateText, revised, tagText, submit],
  );

  // Ctrl/Cmd+S saves without changing the status.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save(live ? "published" : "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, live]);

  // Warn before leaving with unsaved changes.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirty && !submitting.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("You have unsaved changes. Leave without saving?")) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const created = hydrated ? new URLSearchParams(window.location.search).get("created") : null;
  const notice: SaveResult | undefined =
    result ?? (created ? { ok: true, message: created === "draft" ? "Draft created." : created === "scheduled" ? "Story scheduled." : "Story published." } : undefined);

  const coverImage = form.cover.image ? images[form.cover.image] : null;
  const seoLength = (form.seoDescription || form.dek).length;
  const seoTitleLength = `${form.seoTitle || form.title} | CosmosLens`.length;

  return (
    <AdminPage
      back={{ to: "/admin/articles", label: "Stories" }}
      title={article ? "Edit story" : "New story"}
      lede={
        article ? (
          <>
            <StatusBadge status={status} />
            <span>
              Last saved <Ago date={article.updatedAt} />
              {article.views ? `, ${formatFull(article.views)} views` : ""}
            </span>
          </>
        ) : (
          "Write, then save a draft or publish. Nothing is visible to readers until it is published."
        )
      }
      actions={
        <>
          {article && status === "published" ? (
            <a href={`/articles/${(result?.ok && result.slug) || article.slug}`} target="_blank" rel="noopener" className="button button--quiet">
              View on site <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          {live ? (
            <>
              <button type="button" className="button button--quiet" disabled={saving} onClick={() => save("draft")}>
                Unpublish
              </button>
              <button type="button" className="button" disabled={saving} onClick={() => save("published")}>
                {saving ? "Saving…" : "Update"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button button--quiet" disabled={saving} onClick={() => save("draft")}>
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button type="button" className="button" disabled={saving} onClick={() => save("published")}>
                {futureDate ? "Schedule" : "Publish"}
              </button>
            </>
          )}
        </>
      }
    >
      <Notice result={notice} />
      {dirty ? <p className="nr-dirty">Unsaved changes. Press Ctrl+S to save.</p> : null}

      <div className="nr-editor">
        <div className="nr-editor__main">
          <div className="nr-field">
            <label htmlFor="title" className="visually-hidden">
              Headline
            </label>
            <textarea
              id="title"
              rows={2}
              className="nr-editor__title"
              placeholder="Headline"
              value={form.title}
              aria-invalid={errors.title ? true : undefined}
              onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
            />
            {errors.title ? <p className="nr-field__error">{errors.title}</p> : null}
          </div>
          <div className="nr-field">
            <label htmlFor="dek" className="visually-hidden">
              Standfirst
            </label>
            <textarea
              id="dek"
              rows={3}
              className="nr-editor__dek"
              placeholder="Standfirst: one or two sentences that tell readers why this story matters"
              value={form.dek}
              aria-invalid={errors.dek ? true : undefined}
              onChange={(e) => set("dek", e.target.value)}
            />
            {errors.dek ? <p className="nr-field__error">{errors.dek}</p> : null}
          </div>

          <p className="nr-editor__count">
            {formatFull(words)} words, about {minutes} min read
          </p>
          {errors.body ? <p className="nr-field__error">{errors.body}</p> : null}
          <BlockEditor
            blocks={form.body}
            onChange={(body) => set("body", body)}
            images={images}
            onImage={(img) => setImages((m) => ({ ...m, [img.key]: img }))}
            errors={errors}
          />
        </div>

        <aside className="nr-editor__side">
          <section className="nr-card">
            <h2 className="nr-card__title">Publishing</h2>
            <div className="nr-field">
              <label htmlFor="publishedAt" className="nr-field__label">
                Publish date
              </label>
              <input
                id="publishedAt"
                type="datetime-local"
                className="nr-input"
                value={hydrated ? dateText : ""}
                onChange={(e) => {
                  setDateText(e.target.value);
                  setDirty(true);
                }}
              />
              <p className="nr-field__hint">
                In your time zone. {live && article ? `Published ${formatDateTime(article.publishedAt)}. ` : "Empty means now. "}A future
                date schedules the story.
              </p>
              {errors.publishedAt ? <p className="nr-field__error">{errors.publishedAt}</p> : null}
            </div>
            {article && live ? (
              <fieldset className="nr-field nr-radios">
                <legend className="nr-field__label">“Updated” note for readers</legend>
                <label className="nr-check">
                  <input type="radio" name="revised" checked={revised === "keep"} onChange={() => setRevised("keep")} />
                  {article.revisedAt ? `Keep (${formatDateTime(article.revisedAt)})` : "None"}
                </label>
                <label className="nr-check">
                  <input
                    type="radio"
                    name="revised"
                    checked={revised === "now"}
                    onChange={() => {
                      setRevised("now");
                      setDirty(true);
                    }}
                  />
                  Mark as updated now
                </label>
                {article.revisedAt ? (
                  <label className="nr-check">
                    <input
                      type="radio"
                      name="revised"
                      checked={revised === "clear"}
                      onChange={() => {
                        setRevised("clear");
                        setDirty(true);
                      }}
                    />
                    Remove the note
                  </label>
                ) : null}
              </fieldset>
            ) : null}
          </section>

          <section className="nr-card">
            <h2 className="nr-card__title">Placement</h2>
            <div className="nr-field">
              <label htmlFor="section" className="nr-field__label">
                Section
              </label>
              <select id="section" className="nr-input nr-select" value={form.section} onChange={(e) => set("section", e.target.value)}>
                {sections.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.section ? <p className="nr-field__error">{errors.section}</p> : null}
            </div>
            <div className="nr-field">
              <label htmlFor="format" className="nr-field__label">
                Format
              </label>
              <select id="format" className="nr-input nr-select" value={form.format} onChange={(e) => set("format", e.target.value as (typeof FORMATS)[number])}>
                {FORMATS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="nr-field">
              <label htmlFor="author" className="nr-field__label">
                Author
              </label>
              <select id="author" className="nr-input nr-select" value={form.author} onChange={(e) => set("author", e.target.value)}>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {errors.author ? <p className="nr-field__error">{errors.author}</p> : null}
              <p className="nr-field__hint">
                <Link to="/admin/authors/new">Add an author</Link>
              </p>
            </div>
            <div className="nr-field">
              <label htmlFor="tags" className="nr-field__label">
                Topics
              </label>
              <input
                id="tags"
                className="nr-input"
                value={tagText}
                list="known-tags"
                placeholder="Black holes, Webb, Exoplanets"
                onChange={(e) => {
                  setTagText(e.target.value);
                  setDirty(true);
                }}
              />
              <datalist id="known-tags">
                {knownTags.map((t) => (
                  <option key={t.name} value={tagText.includes(",") ? `${tagText.slice(0, tagText.lastIndexOf(",") + 1)} ${t.name}` : t.name} />
                ))}
              </datalist>
              <p className="nr-field__hint">Separate with commas. Each topic gets its own page.</p>
              {errors.tags ? <p className="nr-field__error">{errors.tags}</p> : null}
            </div>
          </section>

          <section className="nr-card">
            <h2 className="nr-card__title">Cover image</h2>
            <button type="button" className="nr-cover" onClick={() => setPickingCover(true)} aria-label={coverImage ? "Change cover image" : "Choose a cover image"}>
              {coverImage ? <Thumb image={coverImage} className="nr-cover__img" /> : <span className="nr-cover__empty">Choose a cover image</span>}
            </button>
            {coverImage ? <p className="nr-field__hint">Credit: {coverImage.credit} ({coverImage.license})</p> : null}
            {errors["cover.image"] ? <p className="nr-field__error">{errors["cover.image"]}</p> : null}
            <div className="nr-field">
              <label htmlFor="cover-alt" className="nr-field__label">
                Alt text
              </label>
              <textarea
                id="cover-alt"
                rows={2}
                className="nr-input nr-textarea"
                value={form.cover.alt}
                placeholder="Describe what the image shows"
                onChange={(e) => set("cover", { ...form.cover, alt: e.target.value })}
              />
              {errors["cover.alt"] ? <p className="nr-field__error">{errors["cover.alt"]}</p> : null}
            </div>
            <div className="nr-field">
              <label htmlFor="cover-caption" className="nr-field__label">
                Caption <span className="nr-optional">optional</span>
              </label>
              <textarea
                id="cover-caption"
                rows={2}
                className="nr-input nr-textarea"
                value={form.cover.caption ?? ""}
                onChange={(e) => set("cover", { ...form.cover, caption: e.target.value })}
              />
            </div>
            <ImagePicker
              open={pickingCover}
              onClose={() => setPickingCover(false)}
              onPick={(img) => {
                setImages((m) => ({ ...m, [img.key]: img }));
                set("cover", { ...form.cover, image: img.key });
              }}
            />
          </section>

          <section className="nr-card">
            <h2 className="nr-card__title">Search and sharing</h2>
            <div className="nr-field">
              <label htmlFor="slug" className="nr-field__label">
                URL
              </label>
              <input
                id="slug"
                className="nr-input"
                value={slugTouched ? form.slug : slugPreview}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
              />
              <p className="nr-field__hint nr-break">/articles/{slugPreview || "…"}</p>
              {article && live && slugTouched && form.slug !== article.slug ? (
                <p className="nr-field__warn">Changing the URL of a published story breaks links to it.</p>
              ) : null}
              {errors.slug ? <p className="nr-field__error">{errors.slug}</p> : null}
            </div>
            <div className="nr-field">
              <label htmlFor="seo-title" className="nr-field__label">
                Search title <span className="nr-optional">optional</span>
              </label>
              <input
                id="seo-title"
                className="nr-input"
                value={form.seoTitle}
                placeholder="Defaults to the headline"
                onChange={(e) => set("seoTitle", e.target.value)}
              />
              <p className={seoTitleLength > 60 ? "nr-field__warn" : "nr-field__hint"}>
                {seoTitleLength} characters with the site name. Google shows about 60. Name the topic people search for.
              </p>
              {errors.seoTitle ? <p className="nr-field__error">{errors.seoTitle}</p> : null}
            </div>
            <div className="nr-field">
              <label htmlFor="seo" className="nr-field__label">
                Search description <span className="nr-optional">optional</span>
              </label>
              <textarea
                id="seo"
                rows={3}
                className="nr-input nr-textarea"
                value={form.seoDescription}
                placeholder="Defaults to the standfirst"
                onChange={(e) => set("seoDescription", e.target.value)}
              />
              <p className={seoLength > 160 ? "nr-field__warn" : "nr-field__hint"}>
                {seoLength} characters. Google shows about 150–160.
              </p>
              {errors.seoDescription ? <p className="nr-field__error">{errors.seoDescription}</p> : null}
            </div>
          </section>

          {article ? (
            <section className="nr-card nr-card--danger">
              <h2 className="nr-card__title">Delete</h2>
              <p className="nr-field__hint">Deleting removes the story and its page for good. To hide it instead, unpublish it.</p>
              <button
                type="button"
                className="nr-link nr-link--danger"
                onClick={() => {
                  if (window.confirm(`Delete “${article.title}” permanently? This cannot be undone.`)) {
                    submitting.current = true;
                    submit({ intent: "delete" }, { method: "post", encType: "application/json" });
                  }
                }}
              >
                Delete this story
              </button>
            </section>
          ) : null}
        </aside>
      </div>
    </AdminPage>
  );
}

