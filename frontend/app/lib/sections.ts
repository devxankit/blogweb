// Sections are managed in the admin panel. The root loader fetches them once
// per page load, and components read them from there.
import { useRouteLoaderData } from "react-router";
import type { Section } from "./types";

/** The six original sections have theme-tuned line colors in tokens.css. */
export const BUILT_IN_SECTIONS = new Set(["cosmos", "planets", "exploration", "physics", "life", "ideas"]);

interface RootData {
  sections: Section[];
}

export function useSections(): Section[] {
  return (useRouteLoaderData("root") as RootData | undefined)?.sections ?? [];
}

export function useSection(slug: string | undefined): Section | null {
  const sections = useSections();
  return slug ? sections.find((s) => s.slug === slug) ?? null : null;
}

/** CSS for the line colors of sections added after launch. */
export function sectionColorCss(sections: Section[]) {
  return sections
    .filter((s) => !BUILT_IN_SECTIONS.has(s.slug) && /^#[0-9a-fA-F]{6}$/.test(s.color ?? "") && /^[a-z0-9-]+$/.test(s.slug))
    .map((s) => `[data-section="${s.slug}"]{--line:${s.color}}`)
    .join("");
}
