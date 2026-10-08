'use client';

import { useState } from 'react';
import type { RouteAnalytics, ReferrerCategory } from '@portfolio/types';
import type { AnalyticsDays } from '@/lib/query/hooks';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

function categoryBadge(category?: ReferrerCategory) {
  if (!category) return null;
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

export function AnalyticsDetail({
  data,
  days,
  onRange,
  refresh,
  busy,
  error,
}: {
  data?: Omit<RouteAnalytics, 'path'> | null;
  days: AnalyticsDays;
  onRange: (days: AnalyticsDays) => void;
  refresh: () => void;
  busy: boolean;
  error: unknown;
}) {
  const [metric, setMetric] = useState<
    'views' | 'visitors' | 'visits' | 'bounceRate'
  >('views');

  const comparison = data?.comparison;

  return (
    <div className="analytics-dashboard">
      <div className="analytics-toolbar">
        <div
          className="analytics-ranges"
          role="group"
          aria-label="Reporting period"
        >
          {(['7', '30', '90', 'all'] as const).map((value) => (
            <button
              className="adm-btn"
              key={value}
              aria-pressed={days === value}
              onClick={() => onRange(value)}
            >
              {value === 'all' ? 'All time' : `${value} days`}
            </button>
          ))}
        </div>
        <button className="adm-btn" onClick={refresh} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh data'}
        </button>
      </div>

      <p className="analytics-caption" role="status">
        {busy ? 'Updating report…' : 'Recorded visits'} · UTC calendar days ·
        estimated browsers exclude unknown identifiers
      </p>

      {error ? (
        <div className="adm-panel" role="alert">
          This report could not be updated. Use Refresh data to try again.
        </div>
      ) : !data && !busy ? (
        <div className="adm-panel">No report is available for this page.</div>
      ) : null}

      {data && (
        <>
          <div className="analytics-metrics">
            <div className="adm-panel">
              <p>Views in period</p>
              <strong>{number(data.views)}</strong>
              {formatDelta(comparison?.pageViewsDelta)}
              <span>Total recorded page hits</span>
            </div>

            <div className="adm-panel">
              <p>Unique visitors</p>
              <strong>{number(data.uniqueViews)}</strong>
              {formatDelta(comparison?.visitorsDelta)}
              <span>Estimated distinct browsers</span>
            </div>

            <div className="adm-panel">
              <p>Visits starting here</p>
              <strong>{number(data.visits)}</strong>
              {formatDelta(comparison?.visitsDelta)}
              <span>Sessions initiated on this page</span>
            </div>

            <div className="adm-panel">
              <p>Unique page views</p>
              <strong>{number(data.uniquePageViews)}</strong>
              <span>Distinct browser/path pairs</span>
            </div>

            <div className="adm-panel">
              <p>Bounce rate</p>
              <strong>{data.bounceRate ?? 0}%</strong>
              {formatDelta(comparison?.bounceRateDelta, true)}
              <span>Single-page sessions</span>
            </div>

            <div className="adm-panel">
              <p>Pages per visit</p>
              <strong>{data.viewsPerVisit ?? 0}</strong>
              {formatDelta(comparison?.viewsPerVisitDelta)}
              <span>Average session depth</span>
            </div>

            {data.likes != null && (
              <div className="adm-panel">
                <p>Likes added</p>
                <strong>{number(data.likes)}</strong>
                <span>Active appreciations in period</span>
              </div>
            )}

            <div className="adm-panel">
              <p>Views last 7 days</p>
              <strong>{number(data.viewsLast7Days)}</strong>
              <span>Rolling 7-day total</span>
            </div>

            <div className="adm-panel">
              <p>Views last 30 days</p>
              <strong>{number(data.viewsLast30Days)}</strong>
              <span>Rolling 30-day total</span>
            </div>
          </div>

          <section className="adm-panel analytics-chart">
            <div className="analytics-section-title">
              <h2>Audience trend</h2>
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

            <div className="analytics-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.daily}
                  margin={{ left: 0, right: 16, top: 20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="detailGradient"
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
                    tickFormatter={(date: string) => date.slice(5)}
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
                    dataKey={metric}
                    type="monotone"
                    stroke="var(--accent)"
                    fill="url(#detailGradient)"
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
                    {data.daily.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{number(row.views)}</td>
                        <td>{number(row.visitors)}</td>
                        <td>{number(row.visits)}</td>
                        <td>{row.bounceRate ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          {data.breakdown && (
            <section className="adm-panel">
              <h2>Visitor technology & environment</h2>
              <p className="analytics-caption">
                Breakdown of device categories, browsers, and operating systems
                on this page.
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

          <section className="adm-panel">
            <h2>Traffic sources</h2>
            <p className="analytics-caption">
              Direct / unknown includes visits without a referrer; internal
              navigation appears under your site’s origin.
            </p>
            <div className="analytics-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Referring source</th>
                    <th>Category</th>
                    <th>Views</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReferers.map((row, index) => (
                    <tr key={`${row.referer}-${index}`}>
                      <td>{row.referer}</td>
                      <td>{categoryBadge(row.category)}</td>
                      <td>{number(row.count)}</td>
                      <td>
                        {data.views
                          ? ((row.count / data.views) * 100).toFixed(1)
                          : '0'}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.topReferers.length && (
                <p>No recorded visits in this period.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
