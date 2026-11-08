import { useEffect, type ReactNode } from "react";
import { Link, useFetcher, useNavigation } from "react-router";
import { TrendChart } from "~/components/admin/charts";
import { formatCtr, formatPosition, SearchTiles, type IndexReport, type SearchData, type SearchReport, type SearchRow } from "~/components/admin/search-console";
import { AdminPage, Empty, formatDay, formatFull, Panel } from "~/components/admin/ui";
import { adminApi } from "~/lib/admin.server";
import type { Route } from "./+types/search-console";

const CONSOLE_URL = "https://search.google.com/search-console?resource_id=https%3A%2F%2Fwww.cosmoslens.com%2F";

export async function loader({ request }: Route.LoaderArgs): Promise<SearchReport> {
  const params = new URL(request.url).searchParams;
  const days = encodeURIComponent(params.get("days") ?? "30");
  const type = encodeURIComponent(params.get("type") ?? "web");
  try {
    return await adminApi<SearchReport>(request, `/search-console?days=${days}&type=${type}`, { timeoutMs: 30_000 });
  } catch (err) {
    if (err instanceof Response) throw err; // Expired session: on to the login page.
    return { status: "error", message: "Search Console data could not be loaded just now. Reload this page to try again." };
  }
}

const RANGES = [7, 30, 90];
const TYPES = [
  { id: "web", label: "Web" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "news", label: "News" },
  { id: "discover", label: "Discover" },
];

function filterLink(days: number, type: string) {
  const query = new URLSearchParams();
  if (days !== 30) query.set("days", String(days));
  if (type !== "web") query.set("type", type);
  const text = query.toString();
  return text ? `?${text}` : ".";
}

function MetricsTable({ rows, heading, cell }: { rows: SearchRow[]; heading: string; cell?: (row: SearchRow) => ReactNode }) {
  return (
    <div className="nr-table-wrap">
      <table className="nr-table nr-table--report">
        <thead>
          <tr>
            <th scope="col">{heading}</th>
            <th scope="col" className="num">Clicks</th>
            <th scope="col" className="num"><abbr title="Impressions">Impr.</abbr></th>
            <th scope="col" className="num">CTR</th>
            <th scope="col" className="num"><abbr title="Average position">Pos.</abbr></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="nr-table__label">{cell ? cell(row) : row.key}</td>
              <td className="num">{formatFull(row.clicks)}</td>
              <td className="num">{formatFull(row.impressions)}</td>
              <td className="num">{formatCtr(row.ctr)}</td>
              <td className="num">{formatPosition(row.position)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Performance({ data }: { data: SearchData }) {
  const label = TYPES.find((t) => t.id === data.type)?.label ?? "Web";
  if (!data.totals.impressions) {
    return (
      <Empty title={`Google has no ${label} search data for this period yet.`}>
        New sites usually take a few days to appear. Numbers will show up here on their own.
      </Empty>
    );
  }

  const shown = data.daily.filter((d) => d.impressions > 0);
  const origin = data.site.replace(/\/$/, "");
  const period = <span className="nr-muted">Last {data.days} days</span>;

  return (
    <>
      <div className="nr-grid-2">
        <Panel title="Clicks per day">
          <TrendChart points={data.daily.map((d) => ({ day: d.day, value: d.clicks }))} unit="clicks" label={`Clicks from Google per day, last ${data.days} days`} />
        </Panel>
        <Panel title="Impressions per day">
          <TrendChart points={data.daily.map((d) => ({ day: d.day, value: d.impressions }))} unit="impressions" label={`Impressions on Google per day, last ${data.days} days`} />
        </Panel>
        <Panel title="CTR per day">
          <TrendChart points={shown.map((d) => ({ day: d.day, value: Math.round(d.ctr * 1000) / 10 }))} unit="percent CTR" label={`Click-through rate per day, last ${data.days} days`} />
        </Panel>
        <Panel title="Average position per day" aside={<span className="nr-muted">Lower is better</span>}>
          <TrendChart points={shown.map((d) => ({ day: d.day, value: Math.round(d.position * 10) / 10 }))} unit="average position" label={`Average position on Google per day, last ${data.days} days`} />
        </Panel>
      </div>

      <Panel title="Top searches" aside={period}>
        {data.queries.length ? <MetricsTable rows={data.queries} heading="Search" /> : <Empty title="No search terms to show.">Google hides rare searches and doesn't report them for Discover.</Empty>}
      </Panel>

      <Panel title="Top pages" aside={period}>
        {data.pages.length ? (
          <MetricsTable
            rows={data.pages}
            heading="Page"
            cell={(row) => (
              <a href={row.key} target="_blank" rel="noopener" className="nr-path">
                {row.key.replace(origin, "") || "/"}
              </a>
            )}
          />
        ) : (
          <Empty title="No pages to show." />
        )}
      </Panel>

      <div className="nr-grid-2">
        <Panel title="Countries" aside={period}>
          {data.countries.length ? <MetricsTable rows={data.countries} heading="Country" cell={(row) => row.key.toUpperCase()} /> : <Empty title="No countries to show." />}
        </Panel>
        <Panel title="Devices" aside={period}>
          {data.devices.length ? (
            <MetricsTable rows={data.devices} heading="Device" cell={(row) => row.key[0] + row.key.slice(1).toLowerCase()} />
          ) : (
            <Empty title="No devices to show." />
          )}
        </Panel>
      </div>

      {data.appearances.length ? (
        <Panel title="Search appearance" aside={period}>
          <MetricsTable rows={data.appearances} heading="Appearance" />
        </Panel>
      ) : null}
    </>
  );
}

const VERDICTS: Record<string, { status: string; label: string }> = {
  PASS: { status: "published", label: "On Google" },
  FAIL: { status: "failed", label: "Problem" },
  UNKNOWN: { status: "draft", label: "Could not check" },
};
const NOT_YET = { status: "scheduled", label: "Not on Google yet" };

/** Asking Google about every page can take half a minute, so it loads after the page has rendered. */
function IndexSection() {
  const fetcher = useFetcher<IndexReport>();
  useEffect(() => {
    if (fetcher.state === "idle" && !fetcher.data) fetcher.load("/admin/search-console/index-status");
    // Runs once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (fetcher.data) return <IndexPanel result={fetcher.data} />;
  return (
    <Panel title="Pages on Google">
      <p className="nr-muted">Asking Google about each page. This can take up to half a minute.</p>
    </Panel>
  );
}

function IndexPanel({ result }: { result: IndexReport }) {
  if (result.status !== "ok") {
    return (
      <Panel title="Pages on Google">
        <p className="nr-muted">{result.status === "error" ? result.message : "Connect Search Console to see this."}</p>
      </Panel>
    );
  }
  const onGoogle = result.pages.filter((p) => p.verdict === "PASS").length;
  return (
    <Panel title="Pages on Google" aside={<span className="nr-muted">{onGoogle} of {result.pages.length} pages indexed</span>}>
      <div className="nr-table-wrap">
        <table className="nr-table nr-table--report">
          <thead>
            <tr>
              <th scope="col">Page</th>
              <th scope="col">Status</th>
              <th scope="col">Google says</th>
              <th scope="col">Last crawled</th>
              <th scope="col"><span className="visually-hidden">Open in Search Console</span></th>
            </tr>
          </thead>
          <tbody>
            {result.pages.map((p) => {
              const verdict = VERDICTS[p.verdict] ?? NOT_YET;
              return (
                <tr key={p.path}>
                  <td className="nr-table__label">
                    <a href={p.path} target="_blank" rel="noopener">
                      {p.title}
                    </a>
                  </td>
                  <td>
                    <span className={`nr-status nr-status--${verdict.status}`}>{verdict.label}</span>
                  </td>
                  <td className="nr-muted">{p.coverage || "–"}</td>
                  <td className="nr-nowrap">{p.lastCrawl ? formatDay(p.lastCrawl) : "Never"}</td>
                  <td className="nr-nowrap">
                    {p.link ? (
                      <a href={p.link} target="_blank" rel="noopener">
                        Inspect
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SitemapsPanel({ data }: { data: SearchData }) {
  return (
    <Panel title="Sitemaps">
      {data.sitemaps.length ? (
        <div className="nr-table-wrap">
          <table className="nr-table nr-table--report">
            <thead>
              <tr>
                <th scope="col">Sitemap</th>
                <th scope="col">Status</th>
                <th scope="col">Last read by Google</th>
                <th scope="col" className="num">Pages listed</th>
              </tr>
            </thead>
            <tbody>
              {data.sitemaps.map((s) => (
                <tr key={s.path}>
                  <td className="nr-table__label">{s.path}</td>
                  <td>
                    {s.errors ? (
                      <span className="nr-status nr-status--failed">{s.errors} {s.errors === 1 ? "error" : "errors"}</span>
                    ) : s.pending ? (
                      <span className="nr-status nr-status--scheduled">Waiting for Google</span>
                    ) : (
                      <span className="nr-status nr-status--published">Read successfully</span>
                    )}
                  </td>
                  <td className="nr-nowrap">{s.lastDownloaded ? formatDay(s.lastDownloaded) : "Not yet"}</td>
                  <td className="num">{formatFull(s.submitted)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No sitemaps submitted." />
      )}
    </Panel>
  );
}

function Setup() {
  return (
    <Panel title="Connect Google Search Console">
      <p>This takes about five minutes and is free. You only do it once.</p>
      <ol className="nr-steps">
        <li>
          In <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a>, create a project and enable the <strong>Google Search Console API</strong>.
        </li>
        <li>
          Under <strong>IAM &amp; Admin, Service Accounts</strong>, create a service account. Open it, then choose <strong>Keys, Add key, JSON</strong> to download its key file.
        </li>
        <li>
          In <a href={CONSOLE_URL} target="_blank" rel="noopener">Search Console</a>, open <strong>Settings, Users and permissions</strong> and add the service account's email address with <strong>Full</strong> permission. The connection itself can only read.
        </li>
        <li>
          In Vercel, open the <strong>cosmoslens-api</strong> project and add an environment variable named <code>GSC_SERVICE_ACCOUNT_JSON</code>. Paste the whole key file as its value, then redeploy.
        </li>
      </ol>
      <p className="nr-muted">Keep the key file private, and don't paste it into chat or commit it to GitHub.</p>
    </Panel>
  );
}

export default function SearchConsole({ loaderData }: Route.ComponentProps) {
  const report = loaderData;
  const refreshing = useNavigation().state === "loading";
  const ok = report.status === "ok";

  return (
    <AdminPage
      title="Google Search"
      lede={
        ok
          ? `From Google Search Console, ${formatDay(report.start)} to ${formatDay(report.end)}. Google's data runs about two days behind.`
          : "Your clicks, rankings and indexing, straight from Google Search Console."
      }
      actions={
        <a href={CONSOLE_URL} target="_blank" rel="noopener" className="button button--quiet">
          Open Search Console
        </a>
      }
    >
      {report.status === "not_configured" ? <Setup /> : null}

      {report.status === "error" ? (
        <div className="nr-notice nr-notice--error" role="alert">
          <p>{report.message}</p>
        </div>
      ) : null}

      {ok ? (
        <>
          <div className="nr-controls">
            <nav className="nr-range" aria-label="Date range">
              {RANGES.map((d) => (
                <Link key={d} to={filterLink(d, report.type)} className="nr-range__opt" aria-current={report.days === d ? "true" : undefined} preventScrollReset>
                  Last {d} days
                </Link>
              ))}
            </nav>
            <nav className="nr-range" aria-label="Search type">
              {TYPES.map((t) => (
                <Link key={t.id} to={filterLink(report.days, t.id)} className="nr-range__opt" aria-current={report.type === t.id ? "true" : undefined} preventScrollReset>
                  {t.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={refreshing ? "nr-dash is-refreshing" : "nr-dash"}>
            <SearchTiles data={report} />
            <Performance data={report} />
            <IndexSection />
            <SitemapsPanel data={report} />
            <p className="nr-muted">
              Google doesn't share its Page indexing summary, Core Web Vitals, Links, Enhancements, Manual actions or Security reports through its API.{" "}
              <a href={CONSOLE_URL} target="_blank" rel="noopener">
                See those in Search Console
              </a>
              .
            </p>
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}
