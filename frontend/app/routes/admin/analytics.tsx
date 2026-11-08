import { Link, useNavigation } from "react-router";
import { RankBars, TrendChart } from "~/components/admin/charts";
import { AdminPage, Ago, Empty, formatFull, Panel, SectionTag } from "~/components/admin/ui";
import { adminApi } from "~/lib/admin.server";
import type { Section } from "~/lib/types";
import type { Route } from "./+types/analytics";

interface Report {
  days: number;
  truncated: boolean;
  totals: {
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
    sessions: number;
    views: number;
    totalSeconds: number;
    avgSessionSeconds: number;
    pagesPerSession: number;
    storyViews: number;
    avgStorySeconds: number;
    avgStoryDepth: number;
  };
  daily: { day: string; visitors: number; views: number }[];
  stories: {
    slug: string;
    title: string;
    section: string;
    views: number;
    readers: number;
    totalSeconds: number;
    avgSeconds: number;
    avgDepth: number;
    finishedPercent: number;
    readTimePercent: number;
  }[];
  sections: { label: string; seconds: number }[];
  topics: { label: string; seconds: number }[];
  pages: { path: string; views: number; avgSeconds: number }[];
  reach: { mark: number; percent: number }[];
  sources: { label: string; count: number }[];
  countries: { label: string; count: number }[];
  devices: { label: string; count: number }[];
  browsers: { label: string; count: number }[];
  recent: {
    id: string;
    at: string;
    country: string;
    device: string;
    source: string;
    seconds: number;
    pages: { path: string; title: string; seconds: number; depth: number }[];
  }[];
  consent: { accept: number; essential: number; reject: number };
}

export async function loader({ request }: Route.LoaderArgs) {
  const days = new URL(request.url).searchParams.get("days") ?? "30";
  const [report, sections] = await Promise.all([
    adminApi<Report>(request, `/analytics?days=${encodeURIComponent(days)}`, { timeoutMs: 30000 }),
    adminApi<(Section & { id: string })[]>(request, "/sections"),
  ]);
  return { report, sections };
}

const RANGES = [7, 30, 90];

function duration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Reading time as bars: seconds while the totals are small, then minutes. */
function timeBars(rows: { label: string; seconds: number }[]) {
  const inMinutes = Math.max(0, ...rows.map((r) => r.seconds)) >= 600;
  return {
    unit: inMinutes ? "minutes" : "seconds",
    title: inMinutes ? "Minutes read" : "Seconds read",
    value: (seconds: number) => (inMinutes ? Math.round(seconds / 60) : seconds),
  };
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="nr-stat">
      <p className="nr-stat__label">{label}</p>
      <p className="nr-stat__value">{value}</p>
      {note ? <p className="nr-stat__note">{note}</p> : null}
    </div>
  );
}

function Counts({ rows, unit, name = (s: string) => s }: { rows: { label: string; count: number }[]; unit: string; name?: (s: string) => string }) {
  if (!rows.length) return <Empty title="Nothing recorded yet." />;
  return <RankBars unit={unit} rows={rows.map((r) => ({ key: r.label, value: r.count, label: <span suppressHydrationWarning>{name(r.label)}</span> }))} />;
}

export default function Analytics({ loaderData }: Route.ComponentProps) {
  const { report: r, sections } = loaderData;
  const refreshing = useNavigation().state === "loading";
  const sectionName = new Map(sections.map((s) => [s.slug, s.name]));
  const choices = r.consent.accept + r.consent.essential + r.consent.reject;
  const sectionTime = timeBars(r.sections);
  const topicTime = timeBars(r.topics);
  const share = (n: number) => (choices ? `${Math.round((n / choices) * 100)}%` : "0%");

  return (
    <AdminPage
      title="Reader activity"
      lede="What readers do on the site: where they go, what they read, how long they stay. This covers only visitors who chose “Accept all”, so totals are lower than the page-view count on the dashboard. Bots and signed-in staff are left out."
    >
      <nav className="nr-range" aria-label="Date range">
        {RANGES.map((d) => (
          <Link key={d} to={d === 30 ? "." : `?days=${d}`} className="nr-range__opt" aria-current={r.days === d ? "true" : undefined} preventScrollReset>
            Last {d} days
          </Link>
        ))}
      </nav>

      <div className={refreshing ? "nr-dash is-refreshing" : "nr-dash"}>
        <section className="nr-stats" aria-label="Key numbers">
          <div className="nr-stat nr-stat--hero">
            <p className="nr-stat__label">Visitors who shared activity</p>
            <p className="nr-stat__value">{formatFull(r.totals.visitors)}</p>
            <p className="nr-stat__note">
              {formatFull(r.totals.newVisitors)} new, {formatFull(r.totals.returningVisitors)} returning
            </p>
          </div>
          <Stat label="Time per visit" value={duration(r.totals.avgSessionSeconds)} note={`${r.totals.pagesPerSession} pages per visit`} />
          <Stat label="Time on a story" value={duration(r.totals.avgStorySeconds)} note={`${r.totals.avgStoryDepth}% of the story reached, on average`} />
          <Stat label="Total reading time" value={duration(r.totals.totalSeconds)} note={`${formatFull(r.totals.views)} pages viewed`} />
        </section>

        <Panel title="Visitors per day">
          <TrendChart
            points={r.daily.map((d) => ({ day: d.day, value: d.visitors }))}
            unit="visitors"
            label={`Visitors per day, last ${r.days} days`}
            emptyText="No activity yet. It appears here as visitors accept analytics cookies."
          />
        </Panel>

        <Panel title="What got attention" aside={<span className="nr-muted">Stories, by total reading time</span>}>
          {r.stories.length ? (
            <div className="nr-table-wrap nr-table-wrap--flush">
              <table className="nr-table">
                <thead>
                  <tr>
                    <th scope="col">Story</th>
                    <th scope="col" className="num">Views</th>
                    <th scope="col" className="num">Readers</th>
                    <th scope="col" className="num">Avg. time</th>
                    <th scope="col" className="num" title="Average distance through the story">Reached</th>
                    <th scope="col" className="num" title="Readers who got to at least 90% of the story">Finished</th>
                    <th scope="col" className="num" title="Average time as a share of the estimated reading time">Of read time</th>
                    <th scope="col" className="num">Total time</th>
                  </tr>
                </thead>
                <tbody>
                  {r.stories.map((s) => (
                    <tr key={s.slug}>
                      <td>
                        <a href={`/articles/${s.slug}`} target="_blank" rel="noopener" className="nr-rank__link">
                          {s.title}
                        </a>
                        <div>
                          <SectionTag slug={s.section} name={sectionName.get(s.section)} />
                        </div>
                      </td>
                      <td className="num">{formatFull(s.views)}</td>
                      <td className="num">{formatFull(s.readers)}</td>
                      <td className="num">{duration(s.avgSeconds)}</td>
                      <td className="num">{s.avgDepth}%</td>
                      <td className="num">{s.finishedPercent}%</td>
                      <td className="num">{s.readTimePercent}%</td>
                      <td className="num">{duration(s.totalSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No story has been read yet." />
          )}
        </Panel>

        <div className="nr-grid-2">
          <Panel title="Attention by section" aside={<span className="nr-muted">{sectionTime.title}</span>}>
            {r.sections.length ? (
              <RankBars
                unit={sectionTime.unit}
                rows={r.sections.map((s) => ({
                  key: s.label,
                  section: s.label,
                  value: sectionTime.value(s.seconds),
                  label: <SectionTag slug={s.label} name={sectionName.get(s.label)} />,
                }))}
              />
            ) : (
              <Empty title="Nothing recorded yet." />
            )}
          </Panel>
          <Panel title="Attention by topic" aside={<span className="nr-muted">{topicTime.title}</span>}>
            {r.topics.length ? (
              <RankBars unit={topicTime.unit} rows={r.topics.map((t) => ({ key: t.label, value: topicTime.value(t.seconds), label: t.label }))} />
            ) : (
              <Empty title="Nothing recorded yet." />
            )}
          </Panel>
        </div>

        <div className="nr-grid-2">
          <Panel title="How far readers get" aside={<span className="nr-muted">Share of story views</span>}>
            {r.totals.storyViews ? (
              <RankBars unit="percent of views" rows={r.reach.map((m) => ({ key: String(m.mark), value: m.percent, label: m.mark === 100 ? "Finished the story" : `Reached ${m.mark}%` }))} />
            ) : (
              <Empty title="Nothing recorded yet." />
            )}
          </Panel>
          <Panel title="Other pages visited">
            {r.pages.length ? (
              <table className="nr-table nr-table--compact">
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col" className="num">Views</th>
                    <th scope="col" className="num">Avg. time</th>
                  </tr>
                </thead>
                <tbody>
                  {r.pages.map((p) => (
                    <tr key={p.path}>
                      <td className="nr-path">{p.path}</td>
                      <td className="num">{formatFull(p.views)}</td>
                      <td className="num">{duration(p.avgSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty title="Nothing recorded yet." />
            )}
          </Panel>
        </div>

        <div className="nr-grid-2">
          <Panel title="Where visits come from" aside={<span className="nr-muted">Visits</span>}>
            <Counts rows={r.sources} unit="visits" />
          </Panel>
          <Panel title="Countries" aside={<span className="nr-muted">Visitors</span>}>
            <Counts rows={r.countries} unit="visitors" name={countryName} />
          </Panel>
          <Panel title="Devices" aside={<span className="nr-muted">Visitors</span>}>
            <Counts rows={r.devices} unit="visitors" />
          </Panel>
          <Panel title="Browsers" aside={<span className="nr-muted">Visitors</span>}>
            <Counts rows={r.browsers} unit="visitors" />
          </Panel>
        </div>

        <Panel title="Cookie choices" aside={<span className="nr-muted">Last {r.days} days</span>}>
          {choices ? (
            <RankBars
              unit="choices"
              rows={[
                { key: "accept", value: r.consent.accept, label: `Accept all (${share(r.consent.accept)})` },
                { key: "essential", value: r.consent.essential, label: `Essentials only (${share(r.consent.essential)})` },
                { key: "reject", value: r.consent.reject, label: `Reject all (${share(r.consent.reject)})` },
              ]}
            />
          ) : (
            <Empty title="No choices recorded yet." />
          )}
        </Panel>

        <Panel title="Recent visits" aside={<span className="nr-muted">Anonymous; no names or IP addresses are stored</span>}>
          {r.recent.length ? (
            <ul className="nr-list">
              {r.recent.map((v) => (
                <li key={v.id} className="nr-list__row">
                  <div>
                    <p className="nr-list__title" suppressHydrationWarning>
                      {[v.country ? countryName(v.country) : "", v.device, v.source].filter(Boolean).join(", ")}
                    </p>
                    <ol className="nr-journey">
                      {v.pages.map((p, i) => (
                        <li key={i}>
                          {p.title} <span className="nr-muted">{duration(p.seconds)}{p.path.startsWith("/articles/") ? `, reached ${p.depth}%` : ""}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <span className="nr-muted nr-nowrap">
                    <Ago date={v.at} />, {duration(v.seconds)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No visits recorded yet." />
          )}
        </Panel>

        {r.truncated ? <p className="nr-field__hint">This range holds more visits than the report can read at once, so only the newest are included.</p> : null}
      </div>
    </AdminPage>
  );
}
