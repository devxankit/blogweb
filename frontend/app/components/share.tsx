import { useState } from "react";

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };

  return (
    <div className="share">
      <span className="share__label">Share</span>
      <ul className="share__list">
        <li>
          <a href={`https://bsky.app/intent/compose?text=${t}%20${u}`} target="_blank" rel="noopener">
            Bluesky
          </a>
        </li>
        <li>
          <a href={`https://x.com/intent/post?url=${u}&text=${t}`} target="_blank" rel="noopener">
            X
          </a>
        </li>
        <li>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`} target="_blank" rel="noopener">
            LinkedIn
          </a>
        </li>
        <li>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${u}`} target="_blank" rel="noopener">
            Facebook
          </a>
        </li>
        <li>
          <a href={`mailto:?subject=${t}&body=${u}`}>Email</a>
        </li>
        <li>
          <button type="button" onClick={copy} aria-live="polite">
            {copied ? "Link copied" : "Copy link"}
          </button>
        </li>
      </ul>
    </div>
  );
}
