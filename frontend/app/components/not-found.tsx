import { Link } from "react-router";
import { site } from "~/config/site";

export function NotFound() {
  return (
    <div className="container">
      <title>{`Page not found | ${site.name}`}</title>
      <meta name="robots" content="noindex" />
      <div className="not-found">
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">Nothing at this address</h1>
        <p className="not-found__text">
          The page may have moved, or the link may be mistyped. Like most of the universe, it might simply be very dark. Try a
          search, or start from the front page.
        </p>
        <div className="not-found__actions">
          <Link className="button" to="/search">
            Search the archive
          </Link>
          <Link className="button button--quiet" to="/">
            Go to the front page
          </Link>
        </div>
      </div>
    </div>
  );
}
