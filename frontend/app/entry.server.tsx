import { handleRequest, streamTimeout } from "@vercel/react-router/entry.server";
import type { AppLoadContext, EntryContext } from "react-router";

export { streamTimeout };

// Public pages look the same to every visitor, so Vercel's CDN can serve them
// from near the reader instead of rendering in Mumbai each time. A new or edited
// story reaches readers about a minute later, and every deploy clears the cache.
const SHARED_PAGE_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=86400";

// Checked against the matched routes, not the URL: route matching ignores case,
// so a path check would let /ADMIN be cached with a signed-in editor's data.
const NOT_SHARED = /admin|routes\/search/;

function isSharedPage(context: EntryContext) {
  return context.staticHandlerContext.matches.every((match) => !NOT_SHARED.test(match.route.id));
}

export default function (
  request: Request,
  status: number,
  headers: Headers,
  context: EntryContext,
  loadContext: AppLoadContext,
) {
  // Only successful pages: a 404 must not linger once that URL starts to work.
  if (request.method === "GET" && status === 200 && !headers.has("Set-Cookie") && isSharedPage(context)) {
    headers.set("Cache-Control", SHARED_PAGE_CACHE);
  }
  return handleRequest(request, status, headers, context, loadContext);
}
