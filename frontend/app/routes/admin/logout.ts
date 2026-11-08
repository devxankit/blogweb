import { redirect } from "react-router";
import { endSession } from "~/lib/admin.server";
import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  return endSession(request);
}

export function loader() {
  return redirect("/admin");
}
