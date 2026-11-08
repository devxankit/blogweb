import { Form, useActionData } from "react-router";
import { AdminPage, Field, fieldErrors, Notice, Panel, useBusy } from "~/components/admin/ui";
import { adminApi, attempt, field } from "~/lib/admin.server";
import type { Route } from "./+types/home-page";

interface Settings {
  coverStory: string;
  editorsPicks: string[];
  picksTitle: string;
  picksIntro: string;
}

interface Option {
  id: string;
  title: string;
  status: string;
  section: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [settings, published] = await Promise.all([
    adminApi<Settings>(request, "/settings"),
    adminApi<{ items: Option[] }>(request, "/articles?status=published&limit=100"),
  ]);
  return { settings, stories: published.items };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const picks = [field(form, "pick1"), field(form, "pick2"), field(form, "pick3")].filter(Boolean);
  return attempt(async () => {
    await adminApi(request, "/settings", {
      method: "PUT",
      body: {
        coverStory: field(form, "coverStory"),
        editorsPicks: picks,
        picksTitle: field(form, "picksTitle"),
        picksIntro: field(form, "picksIntro"),
      },
    });
    return { ok: true, message: "Home page updated. Readers see the change on their next visit." };
  });
}

export default function HomePageSettings({ loaderData }: Route.ComponentProps) {
  const { settings, stories } = loaderData;
  const result = useActionData<typeof action>();
  const errors = fieldErrors(result);
  const busy = useBusy();

  const options = (
    <>
      {stories.map((s) => (
        <option key={s.id} value={s.id}>
          {s.title}
        </option>
      ))}
    </>
  );

  return (
    <AdminPage
      title="Home page"
      lede="Choose what leads the front page. The latest stories, the most-read list and the section blocks update on their own."
      actions={
        <a href="/" target="_blank" rel="noopener" className="button button--quiet">
          View the home page <span aria-hidden="true">↗</span>
        </a>
      }
    >
      <Notice result={result} />
      <Form method="post" className="nr-form nr-form--narrow">
        <Panel title="Cover story">
          <Field label="Story at the top of the page" error={errors.coverStory} hint="Automatic shows the newest published story.">
            {(p) => (
              <select {...p} name="coverStory" className="nr-input nr-select" defaultValue={settings.coverStory}>
                <option value="">Automatic: the newest story</option>
                {options}
              </select>
            )}
          </Field>
        </Panel>

        <Panel title="Long reads band">
          <div className="nr-form__row">
            <Field label="Band title" error={errors.picksTitle}>
              {(p) => <input {...p} name="picksTitle" className="nr-input" defaultValue={settings.picksTitle} required />}
            </Field>
          </div>
          <Field label="Introduction" error={errors.picksIntro} hint="One sentence on why these stories belong together.">
            {(p) => <textarea {...p} name="picksIntro" rows={3} className="nr-input nr-textarea" defaultValue={settings.picksIntro} />}
          </Field>
          {[0, 1, 2].map((i) => (
            <Field key={i} label={i === 0 ? "Lead story" : `Story ${i + 1}`} error={i === 0 ? errors.editorsPicks : undefined}>
              {(p) => (
                <select {...p} name={`pick${i + 1}`} className="nr-input nr-select" defaultValue={settings.editorsPicks[i] ?? ""}>
                  <option value="">None</option>
                  {options}
                </select>
              )}
            </Field>
          ))}
          <p className="nr-field__hint">With no stories chosen, the band shows the three longest stories.</p>
        </Panel>

        <div>
          <button type="submit" className="button" disabled={busy}>
            {busy ? "Saving…" : "Save home page"}
          </button>
        </div>
      </Form>
    </AdminPage>
  );
}
