import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { imageUrl } from "~/lib/images";
import type { ImageRef } from "~/lib/types";

export type LibraryImage = ImageRef & { id: string; originalName: string; usedBy: number };

interface MediaList {
  items: LibraryImage[];
  page: number;
  totalPages: number;
  total: number;
}

type UploadResult = { ok: true; image: ImageRef } | { ok: false; error: string; fields: Record<string, string> };

/** Thumbnail for an image record (smallest WebP file). */
export function Thumb({ image, className = "nr-thumb", alt = "" }: { image: ImageRef | null | undefined; className?: string; alt?: string }) {
  if (!image) return <span className={`${className} nr-thumb--empty`} />;
  return (
    <img
      src={imageUrl(image, image.widths[0], "webp")}
      alt={alt}
      width={image.widths[0]}
      height={Math.round(image.widths[0] / image.aspect)}
      loading="lazy"
      className={className}
    />
  );
}

/** Upload form: file plus the credit and license every image must carry. */
export function UploadForm({ onUploaded, compact = false }: { onUploaded?: (image: ImageRef) => void; compact?: boolean }) {
  const fetcher = useFetcher<UploadResult>();
  const formRef = useRef<HTMLFormElement>(null);
  const busy = fetcher.state === "submitting";
  const result = fetcher.data;
  const errors = result && !result.ok ? result.fields : {};

  useEffect(() => {
    if (fetcher.state === "idle" && result?.ok) {
      formRef.current?.reset();
      onUploaded?.(result.image);
    }
    // Only react to a finished upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, result]);

  return (
    <fetcher.Form ref={formRef} method="post" action="/admin/media" encType="multipart/form-data" className={compact ? "nr-upload nr-upload--compact" : "nr-upload"}>
      <input type="hidden" name="intent" value="upload" />
      <div className="nr-field">
        <label htmlFor="up-file" className="nr-field__label">
          Image file
        </label>
        <input id="up-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/tiff" required className="nr-file" />
        <p className="nr-field__hint">JPEG, PNG, WebP, AVIF or TIFF, at least 1600 pixels wide for sharp covers. Up to 20 MB.</p>
        {errors.file ? <p className="nr-field__error">{errors.file}</p> : null}
      </div>
      <div className="nr-upload__meta">
        <div className="nr-field">
          <label htmlFor="up-credit" className="nr-field__label">
            Credit
          </label>
          <input id="up-credit" name="credit" required className="nr-input" placeholder="NASA/JPL-Caltech" />
          {errors.credit ? <p className="nr-field__error">{errors.credit}</p> : null}
        </div>
        <div className="nr-field">
          <label htmlFor="up-license" className="nr-field__label">
            License
          </label>
          <input id="up-license" name="license" required className="nr-input" list="licenses" placeholder="Public domain" />
          <datalist id="licenses">
            <option value="Public domain" />
            <option value="CC BY 4.0" />
            <option value="CC BY-SA 4.0" />
            <option value="CC0" />
            <option value="Used with permission" />
            <option value="Staff photo" />
          </datalist>
          {errors.license ? <p className="nr-field__error">{errors.license}</p> : null}
        </div>
        <div className="nr-field">
          <label htmlFor="up-source" className="nr-field__label">
            Source URL <span className="nr-optional">optional</span>
          </label>
          <input id="up-source" name="source" type="url" className="nr-input" placeholder="https://" />
          {errors.source ? <p className="nr-field__error">{errors.source}</p> : null}
        </div>
      </div>
      {result && !result.ok && !Object.keys(errors).length ? (
        <p className="nr-notice nr-notice--error" role="alert">
          {result.error}
        </p>
      ) : null}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Uploading and resizing…" : "Upload image"}
      </button>
    </fetcher.Form>
  );
}

/** Dialog for choosing an image from the library, or uploading a new one. */
export function ImagePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (image: ImageRef) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const list = useFetcher<MediaList>();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"library" | "upload">("library");

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "library") return;
    const t = setTimeout(() => list.load(`/admin/media?${new URLSearchParams({ q, page: String(page), limit: "18" })}`), q ? 250 : 0);
    return () => clearTimeout(t);
    // list.load is stable enough for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q, page, tab]);

  const pick = (image: ImageRef) => {
    onPick(image);
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="nr-dialog" onClose={onClose} aria-labelledby="picker-title">
      <header className="nr-dialog__head">
        <h2 id="picker-title" className="nr-dialog__title">
          Choose an image
        </h2>
        <button type="button" className="nr-link" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="nr-tabs" role="tablist">
        <button type="button" role="tab" className="nr-tab" aria-selected={tab === "library"} onClick={() => setTab("library")}>
          Media library
        </button>
        <button type="button" role="tab" className="nr-tab" aria-selected={tab === "upload"} onClick={() => setTab("upload")}>
          Upload new
        </button>
      </div>

      {tab === "library" ? (
        <div className="nr-dialog__body">
          <input
            type="search"
            className="nr-input"
            placeholder="Search by name or credit"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search images"
          />
          <div className={list.state === "loading" ? "nr-picker is-loading" : "nr-picker"}>
            {list.data?.items.map((img) => (
              <button key={img.id} type="button" className="nr-picker__item" onClick={() => pick(img)}>
                <Thumb image={img} className="nr-picker__img" />
                <span className="nr-picker__name">{img.key}</span>
                <span className="nr-picker__credit">{img.credit}</span>
              </button>
            ))}
            {list.data && !list.data.items.length ? <p className="nr-muted">No images match.</p> : null}
          </div>
          {list.data && list.data.totalPages > 1 ? (
            <div className="nr-pager">
              <span>
                Page {list.data.page} of {list.data.totalPages}
              </span>
              <span className="nr-pager__links">
                {page > 1 ? (
                  <button type="button" className="nr-link" onClick={() => setPage(page - 1)}>
                    Previous
                  </button>
                ) : null}
                {page < list.data.totalPages ? (
                  <button type="button" className="nr-link" onClick={() => setPage(page + 1)}>
                    Next
                  </button>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="nr-dialog__body">
          <UploadForm compact onUploaded={pick} />
        </div>
      )}
    </dialog>
  );
}
