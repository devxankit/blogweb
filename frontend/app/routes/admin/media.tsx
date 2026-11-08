import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { Thumb, UploadForm, type LibraryImage } from "~/components/admin/image-picker";
import { ActionButton, AdminPage, Empty, formatDay, Pager, Panel, SearchBox } from "~/components/admin/ui";
import { adminApi, attempt, field, type ActionResult } from "~/lib/admin.server";
import { ApiError } from "~/lib/api.server";
import { imageUrl } from "~/lib/images";
import type { ImageRef } from "~/lib/types";
import type { Route } from "./+types/media";

type Item = LibraryImage & { storage: "static" | "upload"; bytes: number; createdAt: string };

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ["q", "page", "limit"]) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return adminApi<{ items: Item[]; page: number; total: number; totalPages: number }>(request, `/images?${qs}`);
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = field(form, "intent");
  return attempt(async () => {
    if (intent === "upload") {
      const file = form.get("file");
      if (!(file instanceof File) || !file.size) {
        throw new ApiError(400, "Choose an image file to upload.", { file: "Choose an image file." });
      }
      const body = new FormData();
      body.set("file", file, file.name);
      for (const k of ["credit", "license", "source"]) body.set(k, field(form, k));
      const image = await adminApi<ImageRef>(request, "/images", { method: "POST", body, timeoutMs: 120000 });
      return { ok: true as const, message: "Image uploaded.", image };
    }
    const id = field(form, "id");
    if (intent === "update") {
      await adminApi(request, `/images/${id}`, {
        method: "PUT",
        body: { credit: field(form, "credit"), license: field(form, "license"), source: field(form, "source") },
      });
      return { ok: true, message: "Image details saved." };
    }
    if (intent === "delete") {
      await adminApi(request, `/images/${id}`, { method: "DELETE" });
      return { ok: true, message: "Image deleted." };
    }
    return { ok: false, error: "Unknown action.", fields: {} };
  });
}

function sizeLabel(bytes: number) {
  if (!bytes) return "";
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB original` : `${Math.round(bytes / 1e3)} KB original`;
}

function ImageCard({ image }: { image: Item }) {
  const [editing, setEditing] = useState(false);
  const fetcher = useFetcher<ActionResult>();
  const errors = fetcher.data && !fetcher.data.ok ? fetcher.data.fields : {};
  const largest = image.widths[image.widths.length - 1];

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) setEditing(false);
  }, [fetcher.state, fetcher.data]);

  return (
    <li className="nr-media__item">
      <a href={imageUrl(image, largest, "webp")} target="_blank" rel="noopener" className="nr-media__link" aria-label={`Open ${image.key} full size`}>
        <Thumb image={image} className="nr-media__img" />
      </a>
      <div className="nr-media__body">
        <p className="nr-media__key">{image.key}</p>
        <p className="nr-media__meta">
          {largest}×{Math.round(largest / image.aspect)}, {image.usedBy ? `in ${image.usedBy} ${image.usedBy === 1 ? "story" : "stories"}` : "not used"}
          {image.storage === "static" ? ", launch image" : ""}
        </p>
        {editing ? (
          <fetcher.Form method="post" className="nr-media__form">
            <input type="hidden" name="intent" value="update" />
            <input type="hidden" name="id" value={image.id} />
            <label className="nr-block__field">
              <span className="nr-block__label">Credit</span>
              <input name="credit" defaultValue={image.credit} className="nr-input" required />
            </label>
            <label className="nr-block__field">
              <span className="nr-block__label">License</span>
              <input name="license" defaultValue={image.license} className="nr-input" required />
            </label>
            <label className="nr-block__field">
              <span className="nr-block__label">Source URL</span>
              <input name="source" type="url" defaultValue={image.source} className="nr-input" />
            </label>
            {Object.values(errors).map((e) => (
              <p key={e} className="nr-field__error">
                {e}
              </p>
            ))}
            <div className="nr-row-actions">
              <button type="submit" className="button">
                Save
              </button>
              <button type="button" className="nr-link" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </fetcher.Form>
        ) : (
          <>
            <p className="nr-media__credit">
              {image.credit} <span className="nr-muted">({image.license})</span>
            </p>
            <p className="nr-media__meta">
              {formatDay(image.createdAt)}
              {image.bytes ? `, ${sizeLabel(image.bytes)}` : ""}
            </p>
            <div className="nr-row-actions">
              <button type="button" className="nr-link" onClick={() => setEditing(true)}>
                Edit details
              </button>
              <ActionButton
                intent="delete"
                values={{ id: image.id }}
                className="nr-link nr-link--danger"
                disabled={image.usedBy > 0}
                confirm={`Delete ${image.key}? This cannot be undone.`}
              >
                Delete
              </ActionButton>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

export default function Media({ loaderData }: Route.ComponentProps) {
  const { items, page, total, totalPages } = loaderData;
  return (
    <AdminPage
      title="Media library"
      lede="Every image on the site. Uploads are resized into AVIF and WebP at four widths, plus a 1200×630 share image, so pages stay fast. Images used in a story cannot be deleted."
    >
      <Panel title="Upload an image">
        <UploadForm />
      </Panel>

      <div className="nr-toolbar">
        <SearchBox placeholder="Search by name or credit" />
      </div>

      {items.length ? (
        <ul className="nr-media">
          {items.map((img) => (
            <ImageCard key={img.id} image={img} />
          ))}
        </ul>
      ) : (
        <Empty title="No images found." />
      )}
      <Pager page={page} totalPages={totalPages} total={total} noun={["image", "images"]} />
    </AdminPage>
  );
}
