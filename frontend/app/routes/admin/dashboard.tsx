import { Link, useNavigation, useOutletContext, useSearchParams } from "react-router";
import { ColumnChart, RankBars, TrendChart } from "~/components/admin/charts";
import { AdminPage, Ago, Empty, formatCount, formatFull, Panel, SectionTag, StatusBadge, type StoryStatus } from "~/components/admin/ui";
import { adminApi, type AdminUser } from "~/lib/admin.server";
import type { Route } from "./+types/dashboard";

interface Stats {
  days: number;
  views: { period: number; previous: number; allTime: number; daily: { day: string; views: number }[] };
  articles: { published: number; scheduled: number; drafts: number };
  authors: number;
  subscribers: { active: number; new: number; daily: { day: string; count: number }[] };
  messages: { unread: number; total: number };
  topArticles: { id: string; title: string; slug: string; section: string; views: number }[];
  topPages: { path: string; views: number }[];
  sections: { slug: string; name: string; articles: number; views: number }[];
  recentMessages: { id: string; name: string; topic: string; message: string; read: boolean; createdAt: string }[];
  recentArticles: { id: string; title: string; slug: string; section: string; status: StoryStatus; updatedAt: string }[];
}

export async function loader({ request }: Route.LoaderArgs) {
  const days = new URL(request.url).searchParams.get("days") ?? "30";
  return adminApi<Stats>(request, `/stats?days=${encodeURIComponent(days)}`);
}

const RANGES = [7, 30, 90];

function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  if (!before) return <p className="nr-stat__note">No earlier period to compare yet</p>;
  const change = ((now - before) / before) * 100;
  const dir = change > 0.5 ? "up" : change < -0.5 ? "down" : "flat";
  return (
    <p className={`nr-stat__delta nr-stat__delta--${dir}`}>
      <span aria-hidden="true">{dir === "up" ? "▲" : dir === "down" ? "▼" : "■"}</span> {dir === "flat" ? "No change" : `${Math.abs(change).toFixed(0)}%`}{" "}
      <span>vs the previous {days} days</span>
    </p>
  );
}

export default function Dashboard({ loaderData: s }: Route.ComponentProps) {
  const { user } = useOutletContext<{ user: AdminUser }>();
  const [params] = useSearchParams();
  const refreshing = useNavigation().state === "loading";
  const sections = [...s.sections].sort((a, b) => b.views - a.views || b.articles - a.articles);
  const sectionName = new Map(s.sections.map((sec) => [sec.slug, sec.name]));

  return (
    <AdminPage
      title={`Welcome back, ${user.name}`}
      lede="Readership, publishing and reader mail at a glance. Page views are counted for readers only: bots and admin pages are left out."
      actions={
        <Link to="/admin/articles/new" className="button">
          New story
        </Link>
      }
    >
      <nav className="nr-range" aria-label="Date range">
        {RANGES.map((d) => (
          <Link
            key={d}
            to={d === 30 ? "." : `?days=${d}`}
            className="nr-range__opt"
            aria-current={s.days === d ? "true" : undefined}
            preventScrollReset
          >
            Last {d} days
          </Link>
        ))}
        {params.get("days") && !RANGES.includes(Number(params.get("days"))) ? <span>Showing the last 30 days</span> : null}
      </nav>

      <div className={refreshing ? "nr-dash is-refreshing" : "nr-dash"}>
        <section className="nr-stats" aria-label="Key numbers">
          <div className="nr-stat nr-stat--hero">
            <p className="nr-stat__label">Page views, last {s.days} days</p>
            <p className="nr-stat__value">{formatFull(s.views.period)}</p>
            <Delta now={s.views.period} before={s.views.previous} days={s.days} />
          </div>
          <div className="nr-stat">
            <p className="nr-stat__label">Published stories</p>
            <p className="nr-stat__value">{formatFull(s.articles.published)}</p>
            <p className="nr-stat__note">
              <Link to="/admin/articles?status=scheduled">{s.articles.scheduled} scheduled</Link>,{" "}
              <Link to="/admin/articles?status=draft">{s.articles.drafts} in draft</Link>
            </p>
          </div>
          <div className="nr-stat">
            <p className="nr-stat__label">Newsletter subscribers</p>
            <p className="nr-stat__value">{formatFull(s.subscribers.active)}</p>
            <p className="nr-stat__note">
              {s.subscribers.new} new in the last {s.days} days
            </p>
          </div>
          <div className="nr-stat">
            <p className="nr-stat__label">Unread messages</p>
            <p className="nr-stat__value">{formatFull(s.messages.unread)}</p>
            <p className="nr-stat__note">
              <Link to="/admin/messages">{formatFull(s.messages.total)} in total</Link>
            </p>
          </div>
        </section>

        <Panel title="Page views per day" aside={<span className="nr-muted">{formatCount(s.views.allTime)} story views all time</span>}>
          <TrendChart
            points={s.views.daily.map((d) => ({ day: d.day, value: d.views }))}
            unit="page views"
            label={`Page views per day, last ${s.days} days`}
            emptyText="No visits recorded in this period yet. Views appear here as readers open pages."
          />
        </Panel>

        <div className="nr-grid-2">
          <Panel title="Most read stories" aside={<span className="nr-muted">Last {s.days} days</span>}>
            {s.topArticles.length ? (
              <RankBars
                unit="views"
                rows={s.topArticles.map((a) => ({
                  key: a.id,
                  section: a.section,
                  value: a.views,
                  label: (
                    <Link to={`/admin/articles/${a.id}`} className="nr-rank__link">
                      {a.title}
                    </Link>
                  ),
                }))}
              />
            ) : (
              <Empty title="No story views yet.">Stories appear here once readers open them.</Empty>
            )}
          </Panel>

          <Panel title="Views by section" aside={<span className="nr-muted">Last {s.days} days</span>}>
            {sections.length ? (
              <RankBars
                unit="views"
                rows={sections.map((sec) => ({
                  key: sec.slug,
                  section: sec.slug,
                  value: sec.views,
                  label: (
                    <span>
                      <SectionTag slug={sec.slug} name={sec.name} />{" "}
                      <span className="nr-muted">
                        {sec.articles} {sec.articles === 1 ? "story" : "stories"}
                      </span>
                    </span>
                  ),
                }))}
              />
            ) : (
              <Empty title="No sections yet." />
            )}
          </Panel>
        </div>

        <div className="nr-grid-2">
          <Panel title="New subscribers per day">
            <ColumnChart
              points={s.subscribers.daily.map((d) => ({ day: d.day, value: d.count }))}
              unit="new subscribers"
              label={`New newsletter subscribers per day, last ${s.days} days`}
              emptyText="No sign-ups in this period yet."
            />
          </Panel>

          <Panel title="Most visited pages" aside={<span className="nr-muted">Last {s.days} days</span>}>
            {s.topPages.length ? (
              <table className="nr-table nr-table--compact">
                <thead>
                  <tr>
                    <th scope="col">Page</th>
                    <th scope="col" className="num">
                      Views
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.topPages.map((p) => (
                    <tr key={p.path}>
                      <td>
                        <a href={p.path} target="_blank" rel="noopener" className="nr-path">
                          {p.path}
                        </a>
                      </td>
                      <td className="num">{formatFull(p.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Empty title="No visits recorded yet." />
            )}
          </Panel>
        </div>

        <div className="nr-grid-2">
          <Panel title="Recently edited" aside={<Link to="/admin/articles">All stories</Link>}>
            <ul className="nr-list">
              {s.recentArticles.map((a) => (
                <li key={a.id} className="nr-list__row">
                  <div>
                    <Link to={`/admin/articles/${a.id}`} className="nr-list__title">
                      {a.title}
                    </Link>
                    <p className="nr-list__meta">
                      <SectionTag slug={a.section} name={sectionName.get(a.section)} /> <span>Edited <Ago date={a.updatedAt} /></span>
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Latest messages" aside={<Link to="/admin/messages">All messages</Link>}>
            {s.recentMessages.length ? (
              <ul className="nr-list">
                {s.recentMessages.map((m) => (
                  <li key={m.id} className={m.read ? "nr-list__row" : "nr-list__row is-unread"}>
                    <div>
                      <Link to={`/admin/messages#m-${m.id}`} className="nr-list__title">
                        {m.name}
                      </Link>
                      <p className="nr-list__excerpt">{m.message}</p>
                    </div>
                    <span className="nr-muted nr-nowrap"><Ago date={m.createdAt} /></span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty title="No messages yet.">Messages sent through the contact page land here.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
