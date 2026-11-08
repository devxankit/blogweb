import { useEffect, useState } from "react";
import { data, useFetcher, useOutletContext } from "react-router";
import { ActionButton, AdminPage, Ago, formatDay, Panel } from "~/components/admin/ui";
import { adminApi, attempt, field, requireUser, type ActionResult, type AdminUser } from "~/lib/admin.server";
import type { Route } from "./+types/users";

interface Account {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor";
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireUser(request);
  if (user.role !== "admin") throw data(null, { status: 404 });
  return { users: await adminApi<Account[]>(request, "/users") };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = field(form, "intent");
  const id = field(form, "id");
  return attempt(async () => {
    if (intent === "create") {
      await adminApi(request, "/users", {
        method: "POST",
        body: { name: field(form, "name"), email: field(form, "email"), role: field(form, "role"), password: String(form.get("password") ?? "") },
      });
      return { ok: true, message: "Account created. Share the password with them privately; they can change it under Account." };
    }
    if (intent === "update") {
      await adminApi(request, `/users/${id}`, {
        method: "PUT",
        body: {
          name: field(form, "name"),
          email: field(form, "email"),
          role: field(form, "role"),
          active: form.get("active") === "on",
          password: String(form.get("password") ?? ""),
        },
      });
      return { ok: true, message: "Account saved." };
    }
    if (intent === "delete") {
      await adminApi(request, `/users/${id}`, { method: "DELETE" });
      return { ok: true, message: "Account deleted." };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const fetcher = useFetcher<ActionResult>();
  const result = fetcher.data;
  const errors = result && !result.ok ? result.fields : {};
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && result?.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, result]);

  const err = (k: string) => (errors[k] ? <span className="nr-field__error">{errors[k]}</span> : null);

  return (
    <fetcher.Form method="post" className="nr-section-form">
      <input type="hidden" name="intent" value={account ? "update" : "create"} />
      {account ? <input type="hidden" name="id" value={account.id} /> : null}
      <div className="nr-form__row">
        <label className="nr-block__field">
          <span className="nr-block__label">Name</span>
          <input name="name" className="nr-input" defaultValue={account?.name} required autoComplete="off" />
          {err("name")}
        </label>
        <label className="nr-block__field">
          <span className="nr-block__label">Email</span>
          <input name="email" type="email" className="nr-input" defaultValue={account?.email} required autoComplete="off" />
          {err("email")}
        </label>
      </div>
      <div className="nr-form__row">
        <label className="nr-block__field">
          <span className="nr-block__label">Role</span>
          <select name="role" className="nr-input nr-select" defaultValue={account?.role ?? "editor"}>
            <option value="editor">Editor: stories, media, readers</option>
            <option value="admin">Administrator: everything, including accounts</option>
          </select>
          {err("role")}
        </label>
        <label className="nr-block__field">
          <span className="nr-block__label">{account ? "New password" : "Password"}</span>
          <input
            name="password"
            type="password"
            className="nr-input"
            required={!account}
            autoComplete="new-password"
            placeholder={account ? "Leave empty to keep the current one" : "At least 10 characters"}
          />
          {err("password")}
        </label>
      </div>
      {account ? (
        <label className="nr-check">
          <input type="checkbox" name="active" defaultChecked={account.active} /> Account can sign in
        </label>
      ) : null}
      {result && !result.ok && !Object.keys(errors).length ? <p className="nr-field__error">{result.error}</p> : null}
      <div className="nr-row-actions">
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Saving…" : account ? "Save account" : "Create account"}
        </button>
        <button type="button" className="nr-link" onClick={onDone}>
          Cancel
        </button>
      </div>
    </fetcher.Form>
  );
}

export default function Users({ loaderData }: Route.ComponentProps) {
  const { users } = loaderData;
  const { user: me } = useOutletContext<{ user: AdminUser }>();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <AdminPage
      title="Users"
      lede="People who can sign in to this admin panel. Editors manage stories, media, authors, sections and readers; administrators can also manage accounts. Changing a role, turning an account off or setting a new password signs that person out everywhere."
      actions={
        <button type="button" className="button" onClick={() => setAdding(true)} disabled={adding}>
          New account
        </button>
      }
    >
      {adding ? (
        <Panel title="New account">
          <AccountForm onDone={() => setAdding(false)} />
        </Panel>
      ) : null}
      <ul className="nr-sections">
        {users.map((u) => (
          <li key={u.id} className="nr-sections__item">
            {editing === u.id ? (
              <AccountForm account={u} onDone={() => setEditing(null)} />
            ) : (
              <div className="nr-sections__row">
                <div className="nr-sections__body">
                  <p className="nr-sections__name">
                    {u.name} {u.id === me.id ? <span className="nr-muted">(you)</span> : null}
                  </p>
                  <p className="nr-sections__desc">{u.email}</p>
                  <p className="nr-muted">
                    {u.role === "admin" ? "Administrator" : "Editor"}, added {formatDay(u.createdAt)},{" "}
                    {u.lastLoginAt ? (
                      <>
                        last signed in <Ago date={u.lastLoginAt} />
                      </>
                    ) : (
                      "never signed in"
                    )}
                  </p>
                </div>
                <div className="nr-person__side">
                  {!u.active ? <span className="nr-status nr-status--draft">Turned off</span> : null}
                  <div className="nr-row-actions">
                    <button type="button" className="nr-link" onClick={() => setEditing(u.id)}>
                      Edit
                    </button>
                    {u.id !== me.id ? (
                      <ActionButton intent="delete" values={{ id: u.id }} className="nr-link nr-link--danger" confirm={`Delete the account for ${u.name}?`}>
                        Delete
                      </ActionButton>
                    ) : null}
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
