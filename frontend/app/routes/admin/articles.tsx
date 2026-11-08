import { Form, Link, useSearchParams } from "react-router";
import {
  ActionButton,
  AdminPage,
  Empty,
  formatDay,
  formatFull,
  Pager,
  SearchBox,
  SectionTag,
  StatusBadge,
  Tabs,
  Ago,
  type StoryStatus,
} from "~/components/admin/ui";
import { imageUrl } from "~/lib/images";
import { adminApi, attempt, field } from "~/lib/admin.server";
import type { ImageRef, Section } from "~/lib/types";
import type { Route } from "./+types/articles";

interface Row {
  id: string;
  slug: string;
  title: string;
  section: string;
  format: string;
  status: StoryStatus;
  publishedAt: string;
  updatedAt: string;
  views: number;
  readingMinutes: number;
  author: { name: string } | null;
  cover: ImageRef | null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ["q", "status", "section", "author", "page"]) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const [list, sections, authors] = await Promise.all([
    adminApi<{ items: Row[]; page: number; total: number; totalPages: number; counts: Record<StoryStatus | "all", number> }>(
      request,
      `/articles?${qs}`,
    ),
    adminApi<(Section & { id: string })[]>(request, "/sections"),
    adminApi<{ id: string; name: string }[]>(request, "/authors"),
  ]);
  return { ...list, sections, authors };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const id = field(form, "id");
  const intent = field(form, "intent");
  return attempt(async () => {
    if (intent === "delete") {
      await adminApi(request, `/articles/${id}`, { method: "DELETE" });
      return { ok: true, message: "Story deleted." };
    }
    if (intent === "publish" || intent === "unpublish") {
      await adminApi(request, `/articles/${id}/status`, { method: "POST", body: { status: intent === "publish" ? "published" : "draft" } });
      return { ok: true, message: intent === "publish" ? "Published." : "Moved to drafts." };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

export default function Articles({ loaderData }: Route.ComponentProps) {
  const { items, page, total, totalPages, counts, sections, authors } = loaderData;
  const [params] = useSearchParams();
  const sectionName = new Map(sections.map((s) => [s.slug, s.name]));
  const filtered = Boolean(params.get("q") || params.get("section") || params.get("author"));

  return (
    <AdminPage
      title="Stories"
      lede="Everything written for the site. Drafts and scheduled stories stay hidden from readers until their publish time."
      actions={
        <Link to="/admin/articles/new" className="button">
          New story
        </Link>
      }
    >
      <Tabs
        param="status"
        options={[
          { value: "", label: "All", count: counts.all },
          { value: "published", label: "Published", count: counts.published },
          { value: "scheduled", label: "Scheduled", count: counts.scheduled },
          { value: "draft", label: "Drafts", count: counts.draft },
        ]}
      />

      <div className="nr-toolbar">
        <SearchBox placeholder="Search headlines, standfirsts and topics" extra={["status", "section", "author"]} />
        <Form method="get" className="nr-filters" onChange={(e) => e.currentTarget.requestSubmit()}>
          {params.get("status") ? <input type="hidden" name="status" value={params.get("status") ?? ""} /> : null}
          {params.get("q") ? <input type="hidden" name="q" value={params.get("q") ?? ""} /> : null}
          <label className="visually-hidden" htmlFor="f-section">
            Section
          </label>
          <select id="f-section" name="section" defaultValue={params.get("section") ?? ""} className="nr-input nr-select">
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="visually-hidden" htmlFor="f-author">
            Author
          </label>
          <select id="f-author" name="author" defaultValue={params.get("author") ?? ""} className="nr-input nr-select">
            <option value="">All authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <noscript>
            <button type="submit" className="button button--quiet">
              Filter
            </button>
          </noscript>
        </Form>
        {filtered ? (
          <Link to={params.get("status") ? `?status=${params.get("status")}` : "."} className="nr-link">
            Clear filters
          </Link>
        ) : null}
      </div>

      {items.length ? (
        <div className="nr-table-wrap">
          <table className="nr-table nr-stories">
            <thead>
              <tr>
                <th scope="col">Story</th>
                <th scope="col">Status</th>
                <th scope="col">Publish date</th>
                <th scope="col" className="num">
                  Views
                </th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="nr-story">
                      {a.cover ? (
                        <img
                          src={imageUrl(a.cover, a.cover.widths[0], "webp")}
                          alt=""
                          width={72}
                          height={48}
                          loading="lazy"
                          className="nr-thumb"
                        />
                      ) : (
                        <span className="nr-thumb" />
                      )}
                      <div>
                        <Link to={`/admin/articles/${a.id}`} className="nr-story__title">
                          {a.title}
                        </Link>
                        <p className="nr-story__meta">
                          <SectionTag slug={a.section} name={sectionName.get(a.section)} />
                          <span>{a.format}</span>
                          <span>{a.author?.name ?? "No author"}</span>
                          <span>Edited <Ago date={a.updatedAt} /></span>
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="nr-nowrap">{formatDay(a.publishedAt)}</td>
                  <td className="num">{formatFull(a.views)}</td>
                  <td>
                    <div className="nr-row-actions">
                      <Link to={`/admin/articles/${a.id}`} className="nr-link">
                        Edit
                      </Link>
                      {a.status === "published" ? (
                        <a href={`/articles/${a.slug}`} target="_blank" rel="noopener" className="nr-link">
                          View
                        </a>
                      ) : null}
                      {a.status === "draft" ? (
                        <ActionButton intent="publish" values={{ id: a.id }} confirm={`Publish “${a.title}” now?`}>
                          Publish
                        </ActionButton>
                      ) : (
                        <ActionButton intent="unpublish" values={{ id: a.id }} confirm={`Move “${a.title}” back to drafts? Readers will no longer see it.`}>
                          Unpublish
                        </ActionButton>
                      )}
                      <ActionButton
                        intent="delete"
                        values={{ id: a.id }}
                        className="nr-link nr-link--danger"
                        confirm={`Delete “${a.title}” permanently? This cannot be undone.`}
                      >
                        Delete
                      </ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={filtered || params.get("status") ? "No stories match these filters." : "No stories yet."}>
          <Link to="/admin/articles/new">Write the first one</Link>
        </Empty>
      )}

      <Pager page={page} totalPages={totalPages} total={total} noun={["story", "stories"]} />
    </AdminPage>
  );
}
