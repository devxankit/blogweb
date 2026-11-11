---
name: cosmoslens-editorial
description: Use when planning, writing, fact-checking, updating or publishing any CosmosLens story, choosing topics, or preparing the site for Google Search and AdSense. Sets the originality, sourcing and publishing rules the site's Editorial Standards page promises readers.
---

# CosmosLens editorial workflow

CosmosLens discloses on its About and Editorial Standards pages that AI tools help with research and drafting, and that every story is checked against its sources. This workflow is how that promise is kept.

## What counts as original here

Rewording what other sites say is not original, even if a plagiarism checker passes it. Every new story must add at least one of these:

- A calculation or dataset we produced ourselves, with the method shown.
- An angle no general guide covers, usually a local one (India, specific cities, this year's circumstances).
- A correction or sharper explanation of something widely repeated, with evidence.
- First-hand material from a real person, supplied by the site owner.

If a topic offers none of these, do not write it.

## Hard rules

- Never invent people, quotes, credentials, studies, observations or first-hand experience. Write "we calculated", never "we observed", unless someone really did.
- Never add a fake or human-sounding author. The byline stays "CosmosLens Editors" unless a real contributor is named.
- Never use tools or techniques meant to disguise AI use or beat AI detectors. Readers are told how stories are made.
- Do not backdate. A real revision uses the "updated" date.
- When sources disagree, go to the primary source and say what is uncertain.

## Steps for each story

1. **Check the topic.** Read the current story list so it does not overlap an existing one. Name the search question it answers and the original element it adds.
   - **Research the search demand first:** run `npm run keywords -- "<topic>" "<alternative angle>"` in `backend/`. It reports Google autocomplete for India and the US, Wikipedia interest, Bing search counts (once `BING_WEBMASTER_API_KEY` is set) and the searches the site already appears for in Search Console. Choose the angle with real demand that the original element can answer better than page 1 does: check page 1 with a web search. Put the main phrase people type in the Search title and the first paragraph, and answer the questions autocomplete shows (often "in india", "date and time", "in hindi", "upsc") where they fit. Never bend facts to fit a keyword.
2. **Research from primary sources.** Prefer agencies, catalogs, papers and official statements. Treat aggregator sites as leads only.
3. **Calculate.** Keep the scripts. Cross-check results against a published catalog where one exists.
4. **Draft in the house voice.** Plain, exact, unhurried. Open with the specific finding. No generic introductions or conclusions, and no filler sections added for length. Use the length the subject needs; roughly 1,000 to 2,000 words is typical.
5. **Fact-check before publishing.** Re-read every number, name and date against its source. Remove any claim you cannot trace. This is the step the site promises readers.
6. **Finish the page.** Search title (70 characters at most), description (200 at most), descriptive alt text, 2 or 3 internal links that help the reader, a "How we worked this out" section when there are calculations, and a Sources list.
7. **Check every image license** on its source page and record the credit, license and URL. Public domain, CC BY, CC BY-SA and GODL-India are acceptable. Open each image and confirm it shows what the caption says.
8. **Publish through the admin API** so validation, cache refresh and word counts all run. Local and live share one database, so a save is live immediately.
9. **Verify the live page** after publishing: status, rendering, images and sitemap entry.

## Pace

Publish about two or three stories a week, using the scheduled date field. Do not release batches on one day: Google's scaled content abuse policy targets volume without value, however the pages were made. Quality outranks count.

## Keep it true afterwards

Dated stories need revisiting. When a predicted event passes or a target date moves, update the story and set its revised date.
