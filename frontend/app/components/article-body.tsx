import { Fragment, forwardRef } from "react";
import { slugify } from "~/lib/text";
import type { Block, SectionSlug } from "~/lib/types";
import { AdSlot } from "./ad-slot";
import { Caption, Img } from "./img";

function renderBlock(block: Block, key: number) {
  switch (block.type) {
    case "p":
      // Body HTML comes from our own CMS (sanitized server-side before storage).
      return <p key={key} dangerouslySetInnerHTML={{ __html: block.html }} />;
    case "h2":
      return (
        <h2 key={key} id={slugify(block.text)}>
          {block.text}
        </h2>
      );
    case "h3":
      return <h3 key={key}>{block.text}</h3>;
    case "quote":
      return (
        <blockquote key={key} className="pull-quote">
          <p>{block.text}</p>
          {block.cite ? <cite>{block.cite}</cite> : null}
        </blockquote>
      );
    case "figure":
      return (
        <figure key={key} className={block.size === "wide" ? "figure figure--wide" : "figure"}>
          <div className="figure__media">
            <Img
              image={block.picture.image}
              alt={block.picture.alt}
              sizes={block.size === "wide" ? "(max-width: 1000px) 100vw, 960px" : "(max-width: 720px) 100vw, 672px"}
            />
          </div>
          <Caption image={block.picture.image} caption={block.picture.caption} />
        </figure>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List key={key}>
          {block.items.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </List>
      );
    }
    case "aside":
      return (
        <aside key={key} className="facts" aria-label={block.title}>
          <h3 className="facts__title">{block.title}</h3>
          <dl className="facts__list">
            {block.items.map((item) => (
              <div key={item.term} className="facts__row">
                <dt>{item.term}</dt>
                <dd>{item.detail}</dd>
              </div>
            ))}
          </dl>
        </aside>
      );
  }
}

/**
 * Where in-article ads go: after the fourth paragraph, then roughly every
 * nine blocks, never directly before a heading or after the last block.
 */
function adPositions(blocks: Block[]) {
  const positions = new Set<number>();
  let paragraphs = 0;
  let sinceLast = 0;
  blocks.forEach((block, i) => {
    sinceLast++;
    if (block.type === "p") paragraphs++;
    const next = blocks[i + 1];
    const okNeighbor = block.type === "p" && next && next.type === "p";
    if (okNeighbor && paragraphs >= 4 && (positions.size === 0 || sinceLast >= 9) && i < blocks.length - 3) {
      positions.add(i);
      sinceLast = 0;
    }
  });
  return positions;
}

export const ArticleBody = forwardRef<HTMLDivElement, { blocks: Block[]; section: SectionSlug }>(function ArticleBody(
  { blocks, section },
  ref,
) {
  const ads = adPositions(blocks);
  return (
    <div ref={ref} className="prose" data-section={section}>
      {blocks.map((block, i) => (
        <Fragment key={i}>
          {renderBlock(block, i)}
          {ads.has(i) ? <AdSlot variant="inline" /> : null}
        </Fragment>
      ))}
    </div>
  );
});
