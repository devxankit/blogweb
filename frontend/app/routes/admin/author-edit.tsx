import { data, Form, redirect, useActionData } from "react-router";
import { AdminPage, Field, fieldErrors, LinesInput, Notice, useBusy } from "~/components/admin/ui";
import { adminApi, attempt, field, lines } from "~/lib/admin.server";
import { ApiError } from "~/lib/api.server";
import type { Author } from "~/lib/types";
import type { Route } from "./+types/author-edit";

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!params.id) return { author: null };
  try {
    return { author: await adminApi<Author & { id: string }>(request, `/authors/${params.id}`) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) throw data(null, { status: 404 });
    throw err;
  }
}

export const meta: Route.MetaFunction = ({ loaderData }) => [{ title: loaderData?.author ? `Edit: ${loaderData.author.name}` : "New author" }];

export async function action({ request, params }: Route.ActionArgs) {
  const form = await request.formData();
  const body = {
    name: field(form, "name"),
    slug: field(form, "slug"),
    role: field(form, "role"),
    shortBio: field(form, "shortBio"),
    bio: field(form, "bio")
      .split(/\r?\n\s*\r?\n/)
      .map((p) => p.replace(/\s*\r?\n\s*/g, " ").trim())
      .filter(Boolean),
    location: field(form, "location"),
    expertise: field(form, "expertise")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    links: lines(form, "links").map((line) => {
      const [label, ...rest] = line.split("|");
      return { label: label.trim(), href: rest.join("|").trim() };
    }),
  };
  return attempt(async () => {
    const saved = await adminApi<{ id: string }>(request, params.id ? `/authors/${params.id}` : "/authors", {
      method: params.id ? "PUT" : "POST",
      body,
    });
    if (!params.id) return redirect(`/admin/authors/${saved.id}?created=1`);
    return { ok: true, message: "Author saved." };
  });
}

export default function AuthorEdit({ loaderData }: Route.ComponentProps) {
  const { author } = loaderData;
  const result = useActionData<typeof action>();
  const errors = fieldErrors(result);
  const busy = useBusy();

  return (
    <AdminPage
      back={{ to: "/admin/authors", label: "Authors" }}
      title={author ? author.name : "New author"}
      lede={author ? <a href={`/authors/${author.slug}`} target="_blank" rel="noopener">View the public profile ↗</a> : "Add a writer so stories can carry their byline."}
    >
      <Notice result={result} />
      <Form method="post" className="nr-form nr-form--narrow" key={author?.id ?? "new"}>
        <div className="nr-form__row">
          <Field label="Name" error={errors.name}>
            {(p) => <input {...p} name="name" className="nr-input" defaultValue={author?.name} required />}
          </Field>
          <Field label="Role" error={errors.role} hint="For example: Contributing writer, Planetary science correspondent.">
            {(p) => <input {...p} name="role" className="nr-input" defaultValue={author?.role} required />}
          </Field>
        </div>
        <div className="nr-form__row">
          <Field label="Location" error={errors.location}>
            {(p) => <input {...p} name="location" className="nr-input" defaultValue={author?.location} />}
          </Field>
          <Field label="Profile URL" error={errors.slug} hint={author ? "Changing it breaks existing links to the profile." : "Leave empty to use the name."}>
            {(p) => <input {...p} name="slug" className="nr-input" defaultValue={author?.slug} placeholder="ada-lovelace" />}
          </Field>
        </div>
        <Field label="One-line bio" error={errors.shortBio} hint="Shown under the author’s stories.">
          {(p) => <textarea {...p} name="shortBio" rows={2} className="nr-input nr-textarea" defaultValue={author?.shortBio} required />}
        </Field>
        <Field label="Full bio" error={errors.bio} hint="Shown on the profile page. Leave a blank line between paragraphs.">
          {(p) => <textarea {...p} name="bio" rows={7} className="nr-input nr-textarea" defaultValue={author?.bio.join("\n\n")} />}
        </Field>
        <Field label="Expertise" error={errors.expertise} hint="Separate with commas.">
          {(p) => <input {...p} name="expertise" className="nr-input" defaultValue={author?.expertise.join(", ")} placeholder="Cosmology, Radio astronomy" />}
        </Field>
        <Field label="Links" error={errors.links ?? Object.entries(errors).find(([k]) => k.startsWith("links."))?.[1]} hint="One per line, as Label | https://address">
          {(p) => (
            <LinesInput
              {...p}
              name="links"
              rows={3}
              defaultValue={(author?.links ?? []).map((l) => `${l.label} | ${l.href}`)}
            />
          )}
        </Field>
        <div>
          <button type="submit" className="button" disabled={busy}>
            {busy ? "Saving…" : author ? "Save changes" : "Create author"}
          </button>
        </div>
      </Form>
    </AdminPage>
  );
}
