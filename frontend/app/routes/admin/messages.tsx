import { useSearchParams } from "react-router";
import { ActionButton, AdminPage, Ago, Empty, Pager, Tabs } from "~/components/admin/ui";
import { adminApi, attempt, field } from "~/lib/admin.server";
import type { Route } from "./+types/messages";

interface Row {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const TOPICS: Record<string, string> = {
  tip: "Story idea or tip",
  correction: "Correction",
  feedback: "Feedback on a story",
  partnership: "Partnerships",
  other: "Something else",
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ["filter", "topic", "page"]) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return adminApi<{ items: Row[]; page: number; total: number; totalPages: number; unread: number }>(request, `/messages?${qs}`);
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = field(form, "intent");
  const id = field(form, "id");
  return attempt(async () => {
    if (intent === "read" || intent === "unread") {
      await adminApi(request, `/messages/${id}`, { method: "PUT", body: { read: intent === "read" } });
      return { ok: true };
    }
    if (intent === "delete") {
      await adminApi(request, `/messages/${id}`, { method: "DELETE" });
      return { ok: true, message: "Message deleted." };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

export default function Messages({ loaderData }: Route.ComponentProps) {
  const { items, page, total, totalPages, unread } = loaderData;
  const [params] = useSearchParams();

  return (
    <AdminPage title="Messages" lede="Everything sent through the contact page. Reply by email; mark messages as read to keep the count honest.">
      <Tabs
        param="filter"
        options={[
          { value: "", label: "All" },
          { value: "unread", label: "Unread", count: unread },
        ]}
      />
      {items.length ? (
        <ul className="nr-messages">
          {items.map((m) => (
            <li key={m.id} id={`m-${m.id}`} className={m.read ? "nr-message" : "nr-message is-unread"}>
              <header className="nr-message__head">
                <div>
                  <p className="nr-message__from">
                    {m.name} <a href={`mailto:${m.email}`}>{m.email}</a>
                  </p>
                  <p className="nr-muted">
                    {TOPICS[m.topic] ?? m.topic}, <Ago date={m.createdAt} />
                  </p>
                </div>
                {!m.read ? <span className="nr-status nr-status--scheduled">Unread</span> : null}
              </header>
              <p className="nr-message__text">{m.message}</p>
              <div className="nr-row-actions">
                <a
                  className="nr-link"
                  href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to CosmosLens`)}&body=${encodeURIComponent(`\n\n> ${m.message.slice(0, 600).replace(/\n/g, "\n> ")}`)}`}
                >
                  Reply by email
                </a>
                <ActionButton intent={m.read ? "unread" : "read"} values={{ id: m.id }}>
                  {m.read ? "Mark as unread" : "Mark as read"}
                </ActionButton>
                <ActionButton intent="delete" values={{ id: m.id }} className="nr-link nr-link--danger" confirm="Delete this message?">
                  Delete
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title={params.get("filter") === "unread" ? "No unread messages." : "No messages yet."}>
          Messages from the contact page appear here.
        </Empty>
      )}
      <Pager page={page} totalPages={totalPages} total={total} noun={["message", "messages"]} />
    </AdminPage>
  );
}
