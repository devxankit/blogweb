import { useSearchParams } from "react-router";
import { ActionButton, AdminPage, Ago, Empty, Pager, Tabs } from "~/components/admin/ui";
import { adminApi, attempt, field } from "~/lib/admin.server";
import type { Route } from "./+types/comments";

interface Row {
  id: string;
  name: string;
  email: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  article: { title: string; slug: string } | null;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ["status", "page"]) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return adminApi<{ items: Row[]; page: number; total: number; totalPages: number; counts: Record<Row["status"], number> }>(request, `/comments?${qs}`);
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = field(form, "intent");
  const id = field(form, "id");
  return attempt(async () => {
    if (intent === "delete") {
      await adminApi(request, `/comments/${id}`, { method: "DELETE" });
      return { ok: true, message: "Comment deleted." };
    }
    if (intent === "approved" || intent === "rejected" || intent === "pending") {
      await adminApi(request, `/comments/${id}`, { method: "PUT", body: { status: intent } });
      return { ok: true };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

const EMPTY: Record<string, string> = {
  pending: "Nothing is waiting for review.",
  approved: "No comments are on the site yet.",
  rejected: "No comments have been rejected.",
};

export default function Comments({ loaderData }: Route.ComponentProps) {
  const { items, page, total, totalPages, counts } = loaderData;
  const [params] = useSearchParams();

  return (
    <AdminPage title="Comments" lede="Reader comments wait here until you approve them. Only approved comments appear on the site, and an email address is never shown.">
      <Tabs
        param="status"
        options={[
          { value: "", label: "Waiting for review", count: counts.pending },
          { value: "approved", label: "Approved", count: counts.approved },
          { value: "rejected", label: "Rejected", count: counts.rejected },
        ]}
      />
      {items.length ? (
        <ul className="nr-messages">
          {items.map((c) => (
            <li key={c.id} className={c.status === "pending" ? "nr-message is-unread" : "nr-message"}>
              <header className="nr-message__head">
                <div>
                  <p className="nr-message__from">
                    {c.name} {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : null}
                  </p>
                  <p className="nr-muted">
                    {c.article ? (
                      <a href={`/articles/${c.article.slug}#comments`} target="_blank" rel="noopener">
                        {c.article.title}
                      </a>
                    ) : (
                      "Deleted story"
                    )}
                    , <Ago date={c.createdAt} />
                  </p>
                </div>
              </header>
              <p className="nr-message__text">{c.body}</p>
              <div className="nr-row-actions">
                {c.status !== "approved" ? (
                  <ActionButton intent="approved" values={{ id: c.id }}>
                    Approve
                  </ActionButton>
                ) : (
                  <ActionButton intent="pending" values={{ id: c.id }}>
                    Remove from site
                  </ActionButton>
                )}
                {c.status !== "rejected" ? (
                  <ActionButton intent="rejected" values={{ id: c.id }}>
                    Reject
                  </ActionButton>
                ) : null}
                <ActionButton intent="delete" values={{ id: c.id }} className="nr-link nr-link--danger" confirm="Delete this comment permanently?">
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title={EMPTY[params.get("status") ?? "pending"] ?? EMPTY.pending}>New comments from story pages appear here.</Empty>
      )}
      <Pager page={page} totalPages={totalPages} total={total} noun={["comment", "comments"]} />
    </AdminPage>
  );
}
