'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  useAnalyticsOverview,
  useAnalyticsRoutes,
  type AnalyticsDays,
} from '@/lib/query/hooks';
import type { ReferrerCategory } from '@portfolio/types';
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

function formatDelta(delta?: number, isInverse = false) {
  if (delta === undefined || delta === null || Number.isNaN(delta)) return null;
  const isZero = delta === 0;
  const isPositive = isInverse ? delta < 0 : delta > 0;
  const isNegative = isInverse ? delta > 0 : delta < 0;

  const sign = delta > 0 ? '+' : '';
  const text = `${sign}${delta}% vs prev`;

  return (
    <span
      className={`analytics-delta-badge ${
        isZero
          ? 'is-neutral'
          : isPositive
            ? 'is-positive'
            : isNegative
              ? 'is-negative'
              : 'is-neutral'
      }`}
    >
      {text}
    </span>
  );
}

function categoryBadge(category: ReferrerCategory) {
  const labels: Record<ReferrerCategory, string> = {
    search: 'Search',
    social: 'Social',
    ai: 'AI Agent',
    direct: 'Direct',
    internal: 'Internal',
    referral: 'Referral',
  };
  return (
    <span className={`analytics-category-pill cat-${category}`}>
      {labels[category] || category}
    </span>
  );
}

export function AnalyticsClient() {
  const [days, setDays] = useState<AnalyticsDays>('30');
  const [search, setSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState<
    'all' | 'blog' | 'projects' | 'core'
  >('all');
  const [metric, setMetric] = useState<
    'views' | 'visitors' | 'visits' | 'bounceRate'
  >('views');

  const overview = useAnalyticsOverview(days);
  const routes = useAnalyticsRoutes(days);
  const data = overview.data;

  const filteredRoutes = (routes.data || [])
    .filter((row) => {
      if (routeFilter === 'blog') return row.path.startsWith('/blog');
      if (routeFilter === 'projects') return row.path.startsWith('/projects');
      if (routeFilter === 'core')
        return (
          row.path === '/' ||
          row.path === '/about' ||
          row.path === '/contact' ||
          row.path === '/projects' ||
          row.path === '/blog'
        );
      return true;
    })
    .filter((row) => row.path.toLowerCase().includes(search.toLowerCase()));

  function exportCsv() {
    const escape = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;
    const csv = [
      ['Page', 'Views', 'Estimated browsers', 'Last view (UTC)'],
      ...filteredRoutes.map((row) => [
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

  const comparison = data?.comparison;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-toolbar">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
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
          {data?.realtime && (
            <div className="analytics-live-badge">
              <span className="analytics-live-dot" />
              <span>
                <strong>{data.realtime.activeLast5Min}</strong> active now ·{' '}
                {data.realtime.viewsLast30Min} views in 30m
              </span>
            </div>
          )}
        </div>

        <button
          className="adm-btn"
          disabled={overview.isFetching || routes.isFetching}
          onClick={() => {
            void overview.refetch();
            void routes.refetch();
          }}
        >
          {overview.isFetching ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      <p className="analytics-caption" role="status">
        {overview.isFetching
          ? 'Updating analytics report…'
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
          {/* Key Metrics Grid */}
          <div className="analytics-metrics">
            <div className="adm-panel">
              <p>Page views</p>
              <strong>{number(data.totals.pageViews)}</strong>
              {formatDelta(comparison?.pageViewsDelta)}
              <span>All tracked public pages</span>
            </div>

            <div className="adm-panel">
              <p>Visits (Sessions)</p>
              <strong>{number(data.totals.visits)}</strong>
              {formatDelta(comparison?.visitsDelta)}
              <span>Sessions starting in period</span>
            </div>

            <div className="adm-panel">
              <p>Unique visitors</p>
              <strong>{number(data.totals.uniqueVisitors)}</strong>
              {formatDelta(comparison?.visitorsDelta)}
              <span>Estimated distinct browsers</span>
            </div>

            <div className="adm-panel">
              <p>Unique page views</p>
              <strong>{number(data.totals.uniquePageViews)}</strong>
              <span>Distinct browser/path pairs</span>
            </div>

            <div className="adm-panel">
              <p>Bounce rate</p>
              <strong>{data.totals.bounceRate ?? 0}%</strong>
              {formatDelta(comparison?.bounceRateDelta, true)}
              <span>Single-page sessions</span>
            </div>

            <div className="adm-panel">
              <p>Pages per visit</p>
              <strong>{data.totals.viewsPerVisit ?? 0}</strong>
              {formatDelta(comparison?.viewsPerVisitDelta)}
              <span>Average session depth</span>
            </div>

            <div className="adm-panel">
              <p>Blog views</p>
              <strong>{number(data.totals.blogViews)}</strong>
              <span>Article detail reads</span>
            </div>

            <div className="adm-panel">
              <p>Project views</p>
              <strong>{number(data.totals.projectViews)}</strong>
              <span>Project case study visits</span>
            </div>

            <div className="adm-panel">
              <p>Blog likes</p>
              <strong>{number(data.totals.likes)}</strong>
              <span>Active reader appreciations</span>
            </div>

            <div className="adm-panel">
              <p>Audience breakdown</p>
              <strong style={{ fontSize: 22, marginTop: 22, marginBottom: 20 }}>
                {number(data.totals.newVisitors ?? 0)} new /{' '}
                {number(data.totals.returningVisitors ?? 0)} returning
              </strong>
              <span>New vs returning visitors</span>
            </div>
          </div>

          {/* Interactive Chart */}
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
              style={{ marginTop: 12 }}
            >
              {(
                [
                  ['views', 'Page views'],
                  ['visitors', 'Unique visitors'],
                  ['visits', 'Visits'],
                  ['bounceRate', 'Bounce rate (%)'],
                ] as const
              ).map(([value, label]) => (
                <button
                  className="adm-btn"
                  key={value}
                  aria-pressed={metric === value}
                  onClick={() => setMetric(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {data.totals.pageViews === 0 && (
              <p style={{ marginTop: 16 }}>
                No recorded views in this period. Counts appear after visitors
                open public pages.
              </p>
            )}

            <div
              className="analytics-chart-area"
              role="img"
              aria-label={`Daily ${metric} across ${data.daily.length} days.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.daily}
                  margin={{ left: 0, right: 16, top: 20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="analyticsGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--accent)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--accent)"
                        stopOpacity={0.0}
                      />
                    </linearGradient>
                  </defs>
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
                    allowDecimals={metric === 'bounceRate'}
                    tick={{ fontSize: 12 }}
                    width={44}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0]?.payload;
                      if (!item) return null;
                      return (
                        <div className="analytics-custom-tooltip">
                          <p>{label} (UTC)</p>
                          <div className="tooltip-row">
                            <span>Page views:</span>
                            <span>{number(item.views || 0)}</span>
                          </div>
                          <div className="tooltip-row">
                            <span>Unique visitors:</span>
                            <span>{number(item.visitors || 0)}</span>
                          </div>
                          <div className="tooltip-row">
                            <span>Visits:</span>
                            <span>{number(item.visits || 0)}</span>
                          </div>
                          <div className="tooltip-row">
                            <span>Bounce rate:</span>
                            <span>{item.bounceRate || 0}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke="var(--accent)"
                    fill="url(#analyticsGradient)"
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
                      <th>Bounce rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((day) => (
                      <tr key={day.date}>
                        <td>{day.date}</td>
                        <td>{number(day.views)}</td>
                        <td>{number(day.visitors)}</td>
                        <td>{number(day.visits)}</td>
                        <td>{day.bounceRate ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          {/* Technology & Visitor Environment Breakdown */}
          {data.breakdown && (
            <section className="adm-panel">
              <h2>Visitor technology & devices</h2>
              <p className="analytics-caption">
                Client environment breakdown deduced from anonymous user agents
                in this period.
              </p>

              <div className="analytics-tech-grid">
                <div className="analytics-tech-card">
                  <h3>Devices</h3>
                  {data.breakdown.devices.length ? (
                    data.breakdown.devices.map((device) => (
                      <div className="analytics-bar-row" key={device.name}>
                        <div className="analytics-bar-info">
                          <span>{device.name}</span>
                          <span>
                            {number(device.count)} ({device.percentage}%)
                          </span>
                        </div>
                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill"
                            style={{ width: `${device.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="analytics-caption">No device data yet.</p>
                  )}
                </div>

                <div className="analytics-tech-card">
                  <h3>Browsers</h3>
                  {data.breakdown.browsers.length ? (
                    data.breakdown.browsers.map((browser) => (
                      <div className="analytics-bar-row" key={browser.name}>
                        <div className="analytics-bar-info">
                          <span>{browser.name}</span>
                          <span>
                            {number(browser.count)} ({browser.percentage}%)
                          </span>
                        </div>
                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill"
                            style={{ width: `${browser.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="analytics-caption">No browser data yet.</p>
                  )}
                </div>

                <div className="analytics-tech-card">
                  <h3>Operating Systems</h3>
                  {data.breakdown.os.length ? (
                    data.breakdown.os.map((os) => (
                      <div className="analytics-bar-row" key={os.name}>
                        <div className="analytics-bar-info">
                          <span>{os.name}</span>
                          <span>
                            {number(os.count)} ({os.percentage}%)
                          </span>
                        </div>
                        <div className="analytics-bar-track">
                          <div
                            className="analytics-bar-fill"
                            style={{ width: `${os.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="analytics-caption">No OS data yet.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Traffic Sources Breakdown */}
          <div className="analytics-columns">
            <section className="adm-panel">
              <h2>Traffic sources</h2>
              <p className="analytics-caption">
                Page views by referring origin and acquisition channel.
              </p>

              {data.breakdown?.categories &&
                data.breakdown.categories.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 16,
                    }}
                  >
                    {data.breakdown.categories.map((cat) => (
                      <div
                        key={cat.category}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          border: '1px solid var(--line)',
                          borderRadius: 16,
                          fontSize: 12,
                        }}
                      >
                        {categoryBadge(cat.category)}
                        <strong>{cat.percentage}%</strong>
                      </div>
                    ))}
                  </div>
                )}

              <div className="analytics-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Category</th>
                      <th>Views</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topReferers.map((row, index) => (
                      <tr key={`${row.referer}-${index}`}>
                        <td>{row.referer}</td>
                        <td>{categoryBadge(row.category || 'referral')}</td>
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
                Active likes added in the selected period.
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

          {/* Top Content Rankings */}
          <div className="analytics-columns">
            <section className="adm-panel">
              <h2>Most-read articles</h2>
              {data.topBlogs.length ? (
                data.topBlogs.map(({ blog, views, likes }, index) => (
                  <Link
                    className="analytics-ranking"
                    key={blog.id}
                    href={`/admin-252755/analytics/blogs/${blog.id}`}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{blog.title}</strong>
                    <span>
                      {number(views)} views
                      {likes ? ` · ${likes} likes` : ''} ↗
                    </span>
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

          {/* Topics Explored */}
          <section className="adm-panel">
            <h2>Topics readers explore</h2>
            <p className="analytics-caption">
              Views within this period. Articles with multiple topics contribute
              to each topic.
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

          {/* Complete Pages Breakdown with Filters & CSV */}
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

            <div className="analytics-filter-tabs">
              {(
                [
                  ['all', 'All Pages'],
                  ['blog', 'Articles (/blog)'],
                  ['projects', 'Projects (/projects)'],
                  ['core', 'Core Pages'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  className="adm-btn tiny"
                  aria-pressed={routeFilter === val}
                  onClick={() => setRouteFilter(val)}
                >
                  {label}
                </button>
              ))}
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
                    {filteredRoutes.map((row) => (
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
                {!filteredRoutes.length && <p>No pages match your search.</p>}
              </div>
            )}
          </section>
        </>
      )}

      {/* Methodology & Measurement details */}
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
