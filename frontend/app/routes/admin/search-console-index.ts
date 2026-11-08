import type { IndexReport } from "~/components/admin/search-console";
import { adminApi } from "~/lib/admin.server";
import type { Route } from "./+types/search-console-index";

// Fetched by the Google Search page once it has rendered. A slow or failed check
// must only affect its own panel, so problems are returned instead of thrown.
export async function loader({ request }: Route.LoaderArgs): Promise<IndexReport> {
  try {
    return await adminApi<IndexReport>(request, "/search-console/index-status", { timeoutMs: 120_000 });
  } catch (err) {
    if (err instanceof Response) throw err; // Expired session: on to the login page.
    return { status: "error", message: "Google took too long to answer about these pages. Reload this page to try again." };
  }
}
