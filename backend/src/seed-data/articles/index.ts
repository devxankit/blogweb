import type { Article } from "../types";
import { cosmos } from "./cosmos";
import { exploration } from "./exploration";
import { ideas } from "./ideas";
import { life } from "./life";
import { physics } from "./physics";
import { planets } from "./planets";

export const articles: Article[] = [...exploration, ...cosmos, ...planets, ...physics, ...life, ...ideas].sort(
  (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
);

/** Mock popularity ranking until real analytics exist. */
export const mostReadSlugs = [
  "voyager-one-light-day-from-home",
  "the-universe-is-expanding-at-two-speeds",
  "the-leopard-spots-of-cheyava-falls",
  "how-to-read-the-sky-of-a-world-you-will-never-see",
  "what-tardigrades-know-about-surviving-space",
];

/** Long reads chosen by the editors for the home page band. */
export const editorsPickSlugs = [
  "henrietta-leavitts-ruler",
  "time-is-what-clocks-do",
  "an-ocean-under-the-ice",
];
