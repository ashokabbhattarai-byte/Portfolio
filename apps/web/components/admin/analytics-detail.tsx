'use client';
import type { RouteAnalytics } from '@portfolio/types';
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
          Refresh data
        </button>
      </div>
      <p className="analytics-caption" role="status">
        {busy ? 'Updating…' : 'Recorded visits'} · UTC calendar days · estimated
        browsers exclude unknown identifiers
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
            {[
              ['Views in selected period', data.views],
              ['Unique visitors (estimated)', data.uniqueViews],
              ['Visits starting on this page', data.visits],
              ...(data.likes != null
                ? [['Likes added in this period', data.likes]]
                : []),
              ['Views in last 7 days', data.viewsLast7Days],
              ['Views in last 30 days', data.viewsLast30Days],
            ].map(([label, value]) => (
              <div className="adm-panel" key={label}>
                <p>{label}</p>
                <strong>{Number(value).toLocaleString()}</strong>
              </div>
            ))}
          </div>
          <section className="adm-panel analytics-chart">
            <h2>Daily views</h2>
            <div className="analytics-chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string) => date.slice(5)}
                    minTickGap={32}
                  />
                  <YAxis allowDecimals={false} width={44} />
                  <Tooltip />
                  <Area
                    dataKey="views"
                    type="linear"
                    stroke="var(--accent)"
                    fill="var(--accent)"
                    fillOpacity={0.12}
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
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((row) => (
                      <tr key={row.date}>
                        <td>{row.date}</td>
                        <td>{row.views.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
          <section className="adm-panel">
            <h2>Traffic sources</h2>
            <p className="analytics-caption">
              Selected period. Direct / unknown includes visits without a
              referrer; internal navigation appears under your site’s origin.
            </p>
            <div className="analytics-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Referring source</th>
                    <th>Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topReferers.map((row) => (
                    <tr key={row.referer}>
                      <td>{row.referer}</td>
                      <td>{row.count.toLocaleString()}</td>
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
