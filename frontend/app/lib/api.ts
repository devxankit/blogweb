/**
 * Browser-side calls for the reader forms. They post to small endpoints on
 * this site (routes/forms.*.ts), which pass them to the Node API.
 */
type Result = { ok: true } | { ok: false; error: string };

async function post(path: string, body: unknown): Promise<Result> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
    if (res.ok) return { ok: true };
    const first = data.fields ? Object.values(data.fields)[0] : undefined;
    return { ok: false, error: first ?? data.error ?? "Something went wrong. Try again." };
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

export function subscribeToNewsletter(email: string, source = "site") {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Promise.resolve<Result>({ ok: false, error: "Enter a full email address, like name@example.com." });
  }
  return post("/forms/subscribe", { email, source });
}

export function sendContactMessage(input: { name: string; email: string; topic: string; message: string }) {
  return post("/forms/contact", input);
}

/** Records a page view. Fire-and-forget; never blocks navigation. */
export function trackPageView(path: string) {
  const body = JSON.stringify({ path });
  try {
    if (navigator.sendBeacon?.("/forms/track", new Blob([body], { type: "application/json" }))) return;
    void fetch("/forms/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
  } catch {
    // Analytics must never break the page.
  }
}
