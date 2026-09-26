'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  useAnalyticsOverview,
  useAnalyticsRoutes,
  type AnalyticsDays,
} from '@/lib/query/hooks';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
const ranges = ['7', '30', '90', 'all'] as const;
const number = (value: number) => value.toLocaleString();
export function AnalyticsClient() {
  const [days, setDays] = useState<AnalyticsDays>('30');
  const [search, setSearch] = useState('');
  const [metric, setMetric] = useState<'views' | 'visitors' | 'visits'>(
    'views',
  );
  const overview = useAnalyticsOverview(days);
  const routes = useAnalyticsRoutes(days);
  const data = overview.data;
  const rows = (routes.data || []).filter((row) =>
    row.path.toLowerCase().includes(search.toLowerCase()),
  );
  function exportCsv() {
    const escape = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ['Page', 'Views', 'Estimated browsers', 'Last view (UTC)'],
      ...rows.map((row) => [
        row.path,
        row.views,
        row.unique,
        row.lastViewed || '',
      ]),
    ]
      .map((row) => row.map(escape).join(','))
      .join('\n');
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `page-views-${days}-days.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="analytics-dashboard">
      <div className="analytics-toolbar">
        <div
          className="analytics-ranges"
          role="group"
          aria-label="Reporting period"
        >
          {ranges.map((range) => (
            <button
              key={range}
              className="adm-btn"
              aria-pressed={days === range}
              onClick={() => setDays(range)}
            >
              {range === 'all' ? 'All time' : `${range} days`}
            </button>
          ))}
        </div>
        <button
          className="adm-btn"
          disabled={overview.isFetching || routes.isFetching}
          onClick={() => {
            void overview.refetch();
            void routes.refetch();
          }}
        >
          Refresh data
        </button>
      </div>
      <p className="analytics-caption" role="status">
        {overview.isFetching
          ? 'Updating report…'
          : overview.dataUpdatedAt
            ? `Updated ${new Date(overview.dataUpdatedAt).toLocaleTimeString()} · refreshes every 30 seconds`
            : 'Waiting for recorded visits'}{' '}
        · UTC calendar days, including today
      </p>
      {overview.error ? (
        <div role="alert" className="adm-panel">
          Could not update the report.{' '}
          {data
            ? 'Showing the last successful result.'
            : 'Use Refresh data to try again.'}
        </div>
      ) : null}
      {!data && overview.isLoading ? (
        <div className="adm-panel" role="status">
          Loading recorded visits…
        </div>
      ) : null}
      {data && (
        <>
          <div className="analytics-metrics">
            {[
              ['Page views', data.totals.pageViews, 'All tracked public pages'],
              [
                'Visits',
                data.totals.visits,
                'Sessions starting in this period',
              ],
              [
                'Unique page views',
                data.totals.uniquePageViews,
                'One browser per page in this period',
              ],
              [
                'Blog likes',
                data.totals.likes,
                'Active likes added in this period',
              ],
              ['Blog views', data.totals.blogViews, 'Article detail views'],
              [
                'Project views',
                data.totals.projectViews,
                'Project detail visits',
              ],
              [
                'Unique visitors',
                data.totals.uniqueVisitors,
                'Estimated distinct browsers',
              ],
            ].map(([label, value, hint]) => (
              <div className="adm-panel" key={label}>
                <p>{label}</p>
                <strong>{number(Number(value))}</strong>
                <span>{hint}</span>
              </div>
            ))}
          </div>
          <section className="adm-panel analytics-chart">
            <div className="analytics-section-title">
              <h2>Audience over time</h2>
              <span>
                {days === 'all'
                  ? 'All recorded dates'
                  : `${days} calendar days`}
              </span>
            </div>
            <div
              className="analytics-ranges"
              role="group"
              aria-label="Chart metric"
            >
              {(['views', 'visitors', 'visits'] as const).map((value) => (
                <button
                  className="adm-btn"
                  key={value}
                  aria-pressed={metric === value}
                  onClick={() => setMetric(value)}
                >
                  {value === 'views'
                    ? 'Page views'
                    : value === 'visitors'
                      ? 'Unique visitors'
                      : 'Visits'}
                </button>
              ))}
            </div>
            {data.totals.pageViews === 0 && (
              <p>
                No recorded views in this period. Counts appear after visitors
                open public pages.
              </p>
            )}
            <div
              className="analytics-chart-area"
              role="img"
              aria-label={`Daily ${metric} across ${data.daily.length} days. Values available in the daily data table.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.daily}
                  margin={{ left: 0, right: 16, top: 20, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="var(--line)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => v.slice(5)}
                    tick={{ fontSize: 12 }}
                    minTickGap={32}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12 }}
                    width={44}
                  />
                  <Tooltip labelFormatter={(date) => `${date} · UTC`} />
                  <Area
                    type="linear"
                    dataKey={metric}
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <details className="analytics-caption">
              <summary>Daily data table</summary>
              <div className="analytics-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date (UTC)</th>
                      <th>Views</th>
                      <th>Unique visitors</th>
                      <th>Visits</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{number(day.views)}</td>
                        <td>{number(day.visitors)}</td>
                        <td>{number(day.visits)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <div className="analytics-columns">
            <section className="adm-panel">
              <h2>Most-read articles</h2>
              {data.topBlogs.length ? (
                data.topBlogs.map(({ blog, views }, index) => (
                  <Link
                    className="analytics-ranking"
                    key={blog.id}
                    href={`/admin-252755/analytics/blogs/${blog.id}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{blog.title}</strong>
                    <span>{number(views)} views ↗</span>
                  </Link>
                ))
              ) : (
                <p className="analytics-caption">
                  No article views in this period.
                </p>
              )}
            </section>
            <section className="adm-panel">
              <h2>Most-viewed projects</h2>
              {data.topProjects.length ? (
                data.topProjects.map(({ project, views }, index) => (
                  <Link
                    className="analytics-ranking"
                    key={project.id}
                    href={`/admin-252755/analytics/route?path=${encodeURIComponent(`/projects/${project.slug}`)}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{project.title}</strong>
                    <span>{number(views)} views ↗</span>
                  </Link>
                ))
              ) : (
                <p className="analytics-caption">
                  No project views in this period.
                </p>
              )}
            </section>
          </div>
          <section className="adm-panel">
            <div className="analytics-section-title">
              <h2>Every page, accounted for</h2>
              <button
                className="adm-btn"
                disabled={!routes.data || !!routes.error}
                onClick={exportCsv}
              >
                Export CSV ↓
              </button>
            </div>
            <label className="analytics-search">
              Find a page
              <input
                type="search"
                placeholder="Search page address…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {routes.error ? (
              <p role="alert">Page breakdown unavailable. Refresh to retry.</p>
            ) : routes.isLoading ? (
              <p role="status">Loading page breakdown…</p>
            ) : (
              <div className="analytics-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Views</th>
                      <th>Estimated browsers</th>
                      <th>Last visit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.path}>
                        <td>
                          <Link
                            href={`/admin-252755/analytics/route?path=${encodeURIComponent(row.path)}`}
                          >
                            {row.path} ↗
                          </Link>
                        </td>
                        <td>{number(row.views)}</td>
                        <td>{number(row.unique)}</td>
                        <td>
                          {row.lastViewed
                            ? new Date(row.lastViewed).toLocaleString()
                            : 'No visits'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!rows.length && <p>No pages match your search.</p>}
              </div>
            )}
          </section>
          <div className="analytics-columns">
            <section className="adm-panel">
              <h2>Traffic sources</h2>
              <p className="analytics-caption">
                Page views by referring origin. Direct / unknown includes
                missing referrers; internal navigation appears under your own
                origin.
              </p>
              <div className="analytics-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Views</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferers.map((row) => (
                      <tr key={row.referer}>
                        <td>{row.referer}</td>
                        <td>{number(row.count)}</td>
                        <td>
                          {data.totals.pageViews
                            ? (
                                (row.count / data.totals.pageViews) *
                                100
                              ).toFixed(1)
                            : '0'}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.topReferers.length && (
                <p className="analytics-caption">
                  No traffic sources recorded.
                </p>
              )}
            </section>
            <section className="adm-panel">
              <h2>Articles readers appreciate</h2>
              <p className="analytics-caption">
                Active likes added in the selected period. Removed likes are
                excluded.
              </p>
              {data.mostLiked.map(({ blog, likes }) => (
                <Link
                  className="analytics-ranking analytics-ranking-likes"
                  key={blog.id}
                  href={`/admin-252755/analytics/blogs/${blog.id}`}
                >
                  <strong>{blog.title}</strong>
                  <span>{number(likes)} likes</span>
                </Link>
              ))}
              {!data.mostLiked.length && (
                <p className="analytics-caption">
                  No likes recorded in this period.
                </p>
              )}
            </section>
          </div>
          <section className="adm-panel">
            <h2>Topics readers explore</h2>
            <p className="analytics-caption">
              Views within this period. An article with multiple topics
              contributes to each topic.
            </p>
            <div className="analytics-topics">
              {data.byTag.map((row) => (
                <span key={row.tag}>
                  {row.tag}
                  <strong>{number(row.views)}</strong>
                </span>
              ))}
              {!data.byTag.length && <p>No topic views recorded.</p>}
            </div>
          </section>
        </>
      )}
      <details className="adm-panel analytics-method">
        <summary>How these numbers are measured</summary>
        <p>
          A page view is a visible public-page visit. Return visits and reloads
          count again; tracking retries, hash links and filter-only changes do
          not. Known bots and visitors with a valid editor session are excluded
          from new events.
        </p>
        <p>
          Estimated browsers use a random identifier saved in the visitor’s
          browser. Clearing storage or using another device can count
          separately; blocked tracking and privacy preferences reduce coverage.
          Visitor and visit reports use the current browser identifiers only;
          legacy IP-based records remain in page-view totals. No missing
          historical visits are invented.
        </p>
        <p>
          A visit starts on the first page view after at least 30 minutes of
          inactivity. Visits count in the period they start; crossing midnight
          does not start a new visit. Unknown identifiers are excluded. Unique
          page views count each browser once per page across the selected
          period. Daily unique visitors should not be added together to
          calculate the period’s unique visitors.
        </p>
        <p>
          Reports use UTC calendar days and database-recorded events. Zero means
          no recorded events in the selected period. Public article counts are
          lifetime recorded views. Referrers may be unavailable; new events
          store only the referring origin.
        </p>
      </details>
    </div>
  );
}
