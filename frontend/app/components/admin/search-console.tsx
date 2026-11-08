import { Link } from "react-router";
import { Delta, formatFull, Panel } from "./ui";

/* Data from the API's /admin/search-console endpoints */

export interface SearchMetrics {
  clicks: number;
  impressions: number;
  /** A fraction from 0 to 1. */
  ctr: number;
  /** Average ranking; lower is better, and 0 means no data. */
  position: number;
}

export interface SearchRow extends SearchMetrics {
  key: string;
}

export interface SearchData {
  status: "ok";
  site: string;
  type: string;
  days: number;
  start: string;
  end: string;
  totals: SearchMetrics;
  previous: SearchMetrics;
  daily: (SearchMetrics & { day: string })[];
  queries: SearchRow[];
  pages: SearchRow[];
  countries: SearchRow[];
  devices: SearchRow[];
  appearances: SearchRow[];
  sitemaps: { path: string; lastSubmitted: string | null; lastDownloaded: string | null; pending: boolean; errors: number; warnings: number; submitted: number }[];
}

export type SearchProblem = { status: "not_configured" } | { status: "error"; message: string };
export type SearchReport = SearchProblem | SearchData;

export type IndexReport =
  | SearchProblem
  | {
      status: "ok";
      checkedAt: string;
      pages: { path: string; title: string; verdict: string; coverage: string; lastCrawl: string | null; link: string | null }[];
    };

export const formatCtr = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
export const formatPosition = (position: number) => (position ? position.toFixed(1) : "–");

/** The four headline numbers, as Search Console shows them. */
export function SearchTiles({ data }: { data: SearchData }) {
  const { totals, previous, days } = data;
  const compared = (value: string) => (previous.impressions ? `Was ${value} in the previous ${days} days` : "No earlier period to compare yet");
  return (
    <div className="nr-stats">
      <div className="nr-stat nr-stat--hero">
        <p className="nr-stat__label">Clicks from Google</p>
        <p className="nr-stat__value">{formatFull(totals.clicks)}</p>
        <Delta now={totals.clicks} before={previous.clicks} days={days} />
      </div>
      <div className="nr-stat">
        <p className="nr-stat__label">Impressions</p>
        <p className="nr-stat__value">{formatFull(totals.impressions)}</p>
        <Delta now={totals.impressions} before={previous.impressions} days={days} />
      </div>
      <div className="nr-stat">
        <p className="nr-stat__label">Average CTR</p>
        <p className="nr-stat__value">{totals.impressions ? formatCtr(totals.ctr) : "–"}</p>
        <p className="nr-stat__note">{compared(formatCtr(previous.ctr))}</p>
      </div>
      <div className="nr-stat">
        <p className="nr-stat__label">Average position</p>
        <p className="nr-stat__value">{formatPosition(totals.position)}</p>
        <p className="nr-stat__note">{compared(formatPosition(previous.position))}</p>
      </div>
    </div>
  );
}

/** The dashboard's view; the full report lives at /admin/search-console. */
export function SearchSummary({ report }: { report: SearchReport | null }) {
  if (!report) return null;
  if (report.status !== "ok") {
    return (
      <Panel title="Google Search" aside={<Link to="/admin/search-console">{report.status === "error" ? "See what went wrong" : "Connect it"}</Link>}>
        <p className="nr-muted">
          {report.status === "error" ? "Search Console data could not be loaded." : "Connect Google Search Console to see your clicks and rankings here."}
        </p>
      </Panel>
    );
  }
  return (
    <section aria-label="Google Search">
      <header className="nr-panel__head">
        <h2 className="nr-panel__title">Google Search</h2>
        <Link to={report.days === 30 ? "/admin/search-console" : `/admin/search-console?days=${report.days}`}>Full report</Link>
      </header>
      <SearchTiles data={report} />
    </section>
  );
}
