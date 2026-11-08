import { data, Form, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import { site } from "~/config/site";
import { getSession, startSession, type AdminUser } from "~/lib/admin.server";
import { api, ApiError, clientIpOf } from "~/lib/api.server";
import "~/styles/admin.css";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: `Sign in | ${site.name} admin` }, { name: "robots", content: "noindex, nofollow" }];

/** Only same-site admin paths are allowed as the post-login destination. */
function safeNext(raw: string | null) {
  return raw && /^\/admin(\/|$|\?)/.test(raw) && !raw.startsWith("//") ? raw : "/admin";
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request);
  if (session.get("token")) throw redirect(safeNext(new URL(request.url).searchParams.get("next")));
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));
  if (!email || !password) return data({ error: "Enter your email and password." }, { status: 400 });

  try {
    const { token, user } = await api<{ token: string; user: AdminUser }>("/auth/login", {
      method: "POST",
      body: { email, password },
      clientIp: clientIpOf(request),
    });
    return startSession(request, token, user, next);
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return data({ error: err.message }, { status: err.status });
    throw err;
  }
}

export default function Login() {
  const result = useActionData<typeof action>();
  const [params] = useSearchParams();
  const busy = useNavigation().state === "submitting";

  return (
    <div className="nr-login">
      <div className="nr-login__card">
        <p className="nr-brand">
          {site.name}
          <span className="nr-brand__tag">Admin</span>
        </p>
        <h1 className="nr-login__title">Sign in to the newsroom</h1>
        <Form method="post" className="nr-form">
          <input type="hidden" name="next" value={params.get("next") ?? ""} />
          <div className="nr-field">
            <label htmlFor="email" className="nr-field__label">
              Email
            </label>
            <input id="email" name="email" type="email" autoComplete="username" required autoFocus className="nr-input" />
          </div>
          <div className="nr-field">
            <label htmlFor="password" className="nr-field__label">
              Password
            </label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="nr-input" />
          </div>
          {result?.error ? (
            <p className="nr-notice nr-notice--error" role="alert">
              {result.error}
            </p>
          ) : null}
          <button type="submit" className="button nr-login__submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </Form>
        <p className="nr-login__note">
          Forgot your password? Ask an administrator to set a new one for you from the Users page.
        </p>
      </div>
      <a href="/" className="nr-login__back">
        <span aria-hidden="true">←</span> Back to {site.name}
      </a>
    </div>
  );
}
