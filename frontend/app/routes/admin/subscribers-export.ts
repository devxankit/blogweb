import { requireUser } from "~/lib/admin.server";
import { apiRaw } from "~/lib/api.server";
import type { Route } from "./+types/subscribers-export";

/** GET /admin/subscribers/export: the subscriber list as CSV. */
export async function loader({ request }: Route.LoaderArgs) {
  const { token } = await requireUser(request);
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ["q", "status"]) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  const res = await apiRaw(`/admin/subscribers/export.csv${qs.size ? `?${qs}` : ""}`, token);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="subscribers-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
