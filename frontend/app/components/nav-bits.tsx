import { Link } from "react-router";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, i) =>
          i === items.length - 1 ? (
            <li key={item.path} aria-current="page">
              {item.name}
            </li>
          ) : (
            <li key={item.path}>
              <Link to={item.path}>{item.name}</Link>
            </li>
          ),
        )}
      </ol>
    </nav>
  );
}

/** Path-based pagination (/x, /x/page/2) so every page can be prerendered. */
export function Pagination({ base, page, totalPages }: { base: string; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => (p === 1 ? base : `${base}/page/${p}`);
  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link to={href(page - 1)} rel="prev">
          Newer stories
        </Link>
      ) : (
        <span className="pagination__placeholder" />
      )}
      <span className="pagination__status">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link to={href(page + 1)} rel="next">
          Older stories
        </Link>
      ) : (
        <span className="pagination__placeholder" />
      )}
    </nav>
  );
}
