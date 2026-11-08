import { data, Form, useActionData, useOutletContext } from "react-router";
import { AdminPage, Field, fieldErrors, Notice, Panel, useBusy } from "~/components/admin/ui";
import { adminApi, refreshSession, type ActionResult, type AdminUser } from "~/lib/admin.server";
import { ApiError } from "~/lib/api.server";
import type { Route } from "./+types/account";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next !== String(form.get("confirm") ?? "")) {
    return data<ActionResult>({ ok: false, error: "The new passwords do not match.", fields: { confirm: "Does not match." } }, { status: 400 });
  }
  try {
    const { token, user } = await adminApi<{ token: string; user: AdminUser }>(request, "/auth/password", {
      method: "POST",
      body: { current, next },
    });
    // The API signed out every other session; keep this one with the new token.
    return data<ActionResult>(
      { ok: true, message: "Password changed. Other devices have been signed out." },
      { headers: { "Set-Cookie": await refreshSession(request, token, user) } },
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) return data<ActionResult>({ ok: false, error: err.message, fields: err.fields }, { status: 400 });
    throw err;
  }
}

export default function Account() {
  const { user } = useOutletContext<{ user: AdminUser }>();
  const result = useActionData<typeof action>();
  const errors = fieldErrors(result);
  const busy = useBusy();

  return (
    <AdminPage title="Your account" lede={`${user.name}, ${user.email}. ${user.role === "admin" ? "Administrator" : "Editor"}.`}>
      <Panel title="Change your password">
        <Notice result={result} />
        <Form method="post" className="nr-form nr-form--narrow" key={result?.ok ? "done" : "form"}>
          <input type="email" name="username" autoComplete="username" defaultValue={user.email} hidden readOnly />
          <Field label="Current password" error={errors.current}>
            {(p) => <input {...p} name="current" type="password" autoComplete="current-password" className="nr-input" required />}
          </Field>
          <Field label="New password" error={errors.next} hint="At least 10 characters, mixing letters with numbers or symbols.">
            {(p) => <input {...p} name="next" type="password" autoComplete="new-password" className="nr-input" required minLength={10} />}
          </Field>
          <Field label="Repeat the new password" error={errors.confirm}>
            {(p) => <input {...p} name="confirm" type="password" autoComplete="new-password" className="nr-input" required />}
          </Field>
          <div>
            <button type="submit" className="button" disabled={busy}>
              {busy ? "Changing…" : "Change password"}
            </button>
          </div>
        </Form>
      </Panel>
    </AdminPage>
  );
}
