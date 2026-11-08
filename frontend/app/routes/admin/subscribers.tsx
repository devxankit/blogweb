import { useSearchParams } from "react-router";
import { ActionButton, AdminPage, Empty, formatDay, Pager, SearchBox, Tabs } from "~/components/admin/ui";
import { adminApi, attempt, field } from "~/lib/admin.server";
import type { Route } from "./+types/subscribers";

interface Row {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source: string;
  createdAt: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ["q", "status", "page"]) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return adminApi<{ items: Row[]; page: number; total: number; totalPages: number; counts: { active: number; unsubscribed: number } }>(
    request,
    `/subscribers?${qs}`,
  );
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = field(form, "intent");
  const id = field(form, "id");
  return attempt(async () => {
    if (intent === "delete") {
      await adminApi(request, `/subscribers/${id}`, { method: "DELETE" });
      return { ok: true, message: "Subscriber deleted." };
    }
    if (intent === "unsubscribe" || intent === "resubscribe") {
      await adminApi(request, `/subscribers/${id}`, { method: "PUT", body: { status: intent === "unsubscribe" ? "unsubscribed" : "active" } });
      return { ok: true };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

const SOURCES: Record<string, string> = {
  footer: "Footer",
  newsletter: "Newsletter page",
  article: "Story page",
  site: "Website",
};

export default function Subscribers({ loaderData }: Route.ComponentProps) {
  const { items, page, total, totalPages, counts } = loaderData;
  const [params] = useSearchParams();
  const exportQs = new URLSearchParams();
  for (const k of ["q", "status"]) if (params.get(k)) exportQs.set(k, params.get(k)!);

  return (
    <AdminPage
      title="Subscribers"
      lede="Readers who signed up for the Sunday letter. Export the list to import it into your email service."
      actions={
        <a href={`/admin/subscribers/export${exportQs.size ? `?${exportQs}` : ""}`} className="button button--quiet" download>
          Export CSV
        </a>
      }
    >
      <Tabs
        param="status"
        options={[
          { value: "", label: "All", count: counts.active + counts.unsubscribed },
          { value: "active", label: "Subscribed", count: counts.active },
          { value: "unsubscribed", label: "Unsubscribed", count: counts.unsubscribed },
        ]}
      />
      <div className="nr-toolbar">
        <SearchBox placeholder="Search by email" extra={["status"]} />
      </div>

      {items.length ? (
        <div className="nr-table-wrap">
          <table className="nr-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Status</th>
                <th scope="col">Signed up from</th>
                <th scope="col">Date</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="nr-break">{s.email}</td>
                  <td>
                    <span className={s.status === "active" ? "nr-status nr-status--published" : "nr-status nr-status--draft"}>
                      {s.status === "active" ? "Subscribed" : "Unsubscribed"}
                    </span>
                  </td>
                  <td>{SOURCES[s.source] ?? (s.source || "Website")}</td>
                  <td className="nr-nowrap">{formatDay(s.createdAt)}</td>
                  <td>
                    <div className="nr-row-actions">
                      {s.status === "active" ? (
                        <ActionButton intent="unsubscribe" values={{ id: s.id }}>
                          Unsubscribe
                        </ActionButton>
                      ) : (
                        <ActionButton intent="resubscribe" values={{ id: s.id }}>
                          Resubscribe
                        </ActionButton>
                      )}
                      <ActionButton
                        intent="delete"
                        values={{ id: s.id }}
                        className="nr-link nr-link--danger"
                        confirm={`Delete ${s.email}? Use this for data-deletion requests.`}
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
        <Empty title={params.get("q") ? "No subscribers match." : "No subscribers yet."}>
          Sign-ups from the newsletter forms on the site appear here.
        </Empty>
      )}
      <Pager page={page} totalPages={totalPages} total={total} noun={["subscriber", "subscribers"]} />
    </AdminPage>
  );
}
