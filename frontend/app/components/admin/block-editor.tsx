import { useRef, useState, type ReactNode } from "react";
import type { ImageRef } from "~/lib/types";
import { ImagePicker, Thumb } from "./image-picker";

/**
 * Editor for an article body: a column of typed blocks (paragraph, heading,
 * quote, figure, list, fact box), the same shape the site renders.
 * Figures hold image keys; `images` resolves them for thumbnails.
 */

export type EditorBlock =
  | { uid: string; type: "p"; html: string }
  | { uid: string; type: "h2"; text: string }
  | { uid: string; type: "h3"; text: string }
  | { uid: string; type: "quote"; text: string; cite?: string }
  | { uid: string; type: "figure"; picture: { image: string; alt: string; caption?: string }; size?: "column" | "wide" }
  | { uid: string; type: "list"; ordered?: boolean; items: string[] }
  | { uid: string; type: "aside"; title: string; items: { term: string; detail: string }[] };

type BlockType = EditorBlock["type"];

let counter = 0;
export const uid = () => `b${Date.now().toString(36)}${(counter++).toString(36)}`;

const LABELS: Record<BlockType, string> = {
  p: "Paragraph",
  h2: "Heading",
  h3: "Subheading",
  quote: "Pull quote",
  figure: "Image",
  list: "List",
  aside: "Fact box",
};

export function newBlock(type: BlockType): EditorBlock {
  switch (type) {
    case "p":
      return { uid: uid(), type, html: "" };
    case "h2":
    case "h3":
      return { uid: uid(), type, text: "" };
    case "quote":
      return { uid: uid(), type, text: "", cite: "" };
    case "figure":
      return { uid: uid(), type, picture: { image: "", alt: "", caption: "" }, size: "column" };
    case "list":
      return { uid: uid(), type, ordered: false, items: [""] };
    case "aside":
      return { uid: uid(), type, title: "", items: [{ term: "", detail: "" }] };
  }
}

/** True for a block nobody has written anything in yet. */
function isBlank(b: EditorBlock) {
  switch (b.type) {
    case "p":
      return !b.html.trim();
    case "h2":
    case "h3":
      return !b.text.trim();
    case "quote":
      return !b.text.trim() && !b.cite?.trim();
    case "figure":
      return !b.picture.image && !b.picture.alt.trim() && !b.picture.caption?.trim();
    case "list":
      return b.items.every((i) => !i.trim());
    case "aside":
      return !b.title.trim() && b.items.every((i) => !i.term.trim() && !i.detail.trim());
  }
}

/** Strips client-only fields and untouched blocks before saving. */
export function toPayload(blocks: EditorBlock[]) {
  return blocks
    .filter((b) => !isBlank(b))
    .map(({ uid: _uid, ...b }) => {
      if (b.type === "list") return { ...b, items: b.items.map((i) => i.trim()).filter(Boolean) };
      if (b.type === "aside") return { ...b, items: b.items.filter((i) => i.term.trim() || i.detail.trim()) };
      return b;
    });
}

export function countWords(blocks: EditorBlock[]) {
  const text = blocks
    .map((b) => {
      switch (b.type) {
        case "p":
          return b.html.replace(/<[^>]+>/g, " ");
        case "h2":
        case "h3":
          return b.text;
        case "figure":
          return b.picture.caption ?? "";
        case "list":
          return b.items.join(" ").replace(/<[^>]+>/g, " ");
        case "aside":
          return b.items.map((i) => `${i.term} ${i.detail}`).join(" ");
        default:
          return "";
      }
    })
    .join(" ");
  return text.match(/\S+/g)?.length ?? 0;
}

/** Wraps the selection in a textarea with inline HTML, for bold, italic and links. */
function wrap(el: HTMLTextAreaElement, before: string, after: string, onChange: (v: string) => void) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const next = value.slice(0, s) + before + value.slice(s, e) + after + value.slice(e);
  onChange(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(s + before.length, e + before.length);
  });
}

function RichText({
  value,
  onChange,
  label,
  rows = 4,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  rows?: number;
  error?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const tool = (before: string, after: string) => () => ref.current && wrap(ref.current, before, after, onChange);
  const link = () => {
    if (!ref.current) return;
    const href = window.prompt("Link address (a full URL, or a path on this site such as /articles/…)", "https://");
    if (href && href !== "https://") wrap(ref.current, `<a href="${href.replace(/"/g, "&quot;")}">`, "</a>", onChange);
  };
  return (
    <div className="nr-rich">
      <div className="nr-rich__tools" role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" onClick={tool("<strong>", "</strong>")} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button type="button" onClick={tool("<em>", "</em>")} title="Italic (Ctrl+I)">
          <em>I</em>
        </button>
        <button type="button" onClick={link} title="Link (Ctrl+K)">
          Link
        </button>
        <button type="button" onClick={tool("<sup>", "</sup>")} title="Superscript">
          x<sup>2</sup>
        </button>
        <button type="button" onClick={tool("<sub>", "</sub>")} title="Subscript">
          x<sub>2</sub>
        </button>
      </div>
      <textarea
        ref={ref}
        className="nr-input nr-textarea nr-rich__text"
        rows={rows}
        value={value}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          const k = e.key.toLowerCase();
          if (k === "b") (e.preventDefault(), tool("<strong>", "</strong>")());
          if (k === "i") (e.preventDefault(), tool("<em>", "</em>")());
          if (k === "k") (e.preventDefault(), link());
        }}
      />
    </div>
  );
}

function AddBlock({ onAdd, label = "Add block" }: { onAdd: (type: BlockType) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={open ? "nr-add is-open" : "nr-add"}>
      <button type="button" className="nr-add__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span aria-hidden="true">+</span> {label}
      </button>
      {open ? (
        <div className="nr-add__menu">
          {(Object.keys(LABELS) as BlockType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onAdd(t);
                setOpen(false);
              }}
            >
              {LABELS[t]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BlockEditor({
  blocks,
  onChange,
  images,
  onImage,
  errors,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  images: Record<string, ImageRef | null>;
  onImage: (image: ImageRef) => void;
  /** API field errors, keyed like "body.3.html". */
  errors: Record<string, string>;
}) {
  const [picking, setPicking] = useState<string | null>(null);

  const update = (i: number, patch: Partial<EditorBlock>) =>
    onChange(blocks.map((b, n) => (n === i ? ({ ...b, ...patch } as EditorBlock) : b)));
  const insert = (at: number, type: BlockType) => {
    const next = [...blocks];
    next.splice(at, 0, newBlock(type));
    onChange(next);
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => {
    const b = blocks[i];
    const empty =
      (b.type === "p" && !b.html.trim()) || ((b.type === "h2" || b.type === "h3") && !b.text.trim()) || (b.type === "figure" && !b.picture.image);
    if (!empty && !window.confirm(`Remove this ${LABELS[b.type].toLowerCase()}?`)) return;
    onChange(blocks.filter((_, n) => n !== i));
  };
  // Blank blocks are not sent, so the API's block numbers skip them.
  let sent = -1;
  const sentIndex = blocks.map((b) => (isBlank(b) ? -1 : ++sent));
  const errorFor = (i: number) => {
    const n = sentIndex[i];
    if (n < 0) return undefined;
    return Object.entries(errors)
      .filter(([k]) => k === `body.${n}` || k.startsWith(`body.${n}.`))
      .map(([, v]) => v)[0];
  };

  const field = (label: string, input: ReactNode, hint?: string) => (
    <label className="nr-block__field">
      <span className="nr-block__label">{label}</span>
      {input}
      {hint ? <span className="nr-field__hint">{hint}</span> : null}
    </label>
  );

  return (
    <div className="nr-blocks">
      {blocks.map((b, i) => {
        const error = errorFor(i);
        return (
          <div key={b.uid} className={`nr-block nr-block--${b.type}${error ? " has-error" : ""}`}>
            <div className="nr-block__bar">
              <span className="nr-block__type">{LABELS[b.type]}</span>
              <span className="nr-block__tools">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" title="Move up">
                  ↑
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Move down" title="Move down">
                  ↓
                </button>
                <button type="button" onClick={() => remove(i)} aria-label={`Remove ${LABELS[b.type].toLowerCase()}`} title="Remove">
                  ×
                </button>
              </span>
            </div>

            {b.type === "p" ? <RichText label={`Paragraph ${i + 1}`} value={b.html} onChange={(html) => update(i, { html })} error={error} /> : null}

            {b.type === "h2" || b.type === "h3" ? (
              <input
                className={`nr-input nr-block__heading nr-block__heading--${b.type}`}
                value={b.text}
                placeholder={b.type === "h2" ? "Section heading" : "Subheading"}
                aria-label={LABELS[b.type]}
                onChange={(e) => update(i, { text: e.target.value })}
              />
            ) : null}

            {b.type === "quote" ? (
              <>
                <textarea
                  className="nr-input nr-textarea nr-block__quote"
                  rows={2}
                  value={b.text}
                  placeholder="A short line from the story, set large"
                  aria-label="Quote"
                  onChange={(e) => update(i, { text: e.target.value })}
                />
                {field(
                  "Attribution",
                  <input className="nr-input" value={b.cite ?? ""} onChange={(e) => update(i, { cite: e.target.value })} placeholder="Optional" />,
                )}
              </>
            ) : null}

            {b.type === "figure" ? (
              <div className="nr-figure">
                <button type="button" className="nr-figure__pick" onClick={() => setPicking(b.uid)}>
                  {b.picture.image ? <Thumb image={images[b.picture.image]} className="nr-figure__img" /> : <span className="nr-figure__placeholder">Choose an image</span>}
                </button>
                <div className="nr-figure__fields">
                  {field(
                    "Alt text",
                    <input
                      className="nr-input"
                      value={b.picture.alt}
                      onChange={(e) => update(i, { picture: { ...b.picture, alt: e.target.value } })}
                      placeholder="What the image shows, for readers who cannot see it"
                    />,
                  )}
                  {field(
                    "Caption",
                    <textarea
                      className="nr-input nr-textarea"
                      rows={2}
                      value={b.picture.caption ?? ""}
                      onChange={(e) => update(i, { picture: { ...b.picture, caption: e.target.value } })}
                    />,
                    "The credit and license are added automatically.",
                  )}
                  {field(
                    "Width",
                    <select className="nr-input nr-select" value={b.size ?? "column"} onChange={(e) => update(i, { size: e.target.value as "column" | "wide" })}>
                      <option value="column">Text column</option>
                      <option value="wide">Wide</option>
                    </select>,
                  )}
                </div>
              </div>
            ) : null}

            {b.type === "list" ? (
              <>
                <textarea
                  className="nr-input nr-textarea"
                  rows={Math.max(3, b.items.length + 1)}
                  value={b.items.join("\n")}
                  aria-label="List items, one per line"
                  placeholder="One item per line"
                  onChange={(e) => update(i, { items: e.target.value.split("\n") })}
                />
                <label className="nr-check">
                  <input type="checkbox" checked={Boolean(b.ordered)} onChange={(e) => update(i, { ordered: e.target.checked })} /> Numbered list
                </label>
              </>
            ) : null}

            {b.type === "aside" ? (
              <div className="nr-aside">
                {field("Title", <input className="nr-input" value={b.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Key numbers" />)}
                {b.items.map((row, r) => (
                  <div key={r} className="nr-aside__row">
                    <input
                      className="nr-input"
                      value={row.term}
                      aria-label={`Row ${r + 1} term`}
                      placeholder="Term"
                      onChange={(e) => update(i, { items: b.items.map((x, n) => (n === r ? { ...x, term: e.target.value } : x)) })}
                    />
                    <input
                      className="nr-input"
                      value={row.detail}
                      aria-label={`Row ${r + 1} detail`}
                      placeholder="Detail"
                      onChange={(e) => update(i, { items: b.items.map((x, n) => (n === r ? { ...x, detail: e.target.value } : x)) })}
                    />
                    <button
                      type="button"
                      className="nr-link"
                      aria-label={`Remove row ${r + 1}`}
                      onClick={() => update(i, { items: b.items.filter((_, n) => n !== r) })}
                      disabled={b.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="nr-link" onClick={() => update(i, { items: [...b.items, { term: "", detail: "" }] })}>
                  Add a row
                </button>
              </div>
            ) : null}

            {error ? <p className="nr-field__error">{error}</p> : null}
            <AddBlock onAdd={(t) => insert(i + 1, t)} label="Insert below" />
          </div>
        );
      })}

      {blocks.length === 0 ? <AddBlock onAdd={(t) => insert(0, t)} label="Add the first block" /> : null}

      <ImagePicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(image) => {
          onImage(image);
          const i = blocks.findIndex((b) => b.uid === picking);
          const b = blocks[i];
          if (b?.type === "figure") update(i, { picture: { ...b.picture, image: image.key } });
        }}
      />
    </div>
  );
}
