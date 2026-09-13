import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../../admin-shell';
import { RouteAnalyticsClient } from './route-analytics-client';

export default async function RouteAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ path?: string }>;
}) {
  const { path: raw } = (await searchParams) ?? {};
  const path = raw?.trim() ? (raw.startsWith('/') ? raw : `/${raw}`) : '/';
  const me = await getSignedInUser();
  if (!me.ok)
    redirect(
      loginUrl(`/admin/analytics/route?path=${encodeURIComponent(path)}`),
    );

  return (
    <AdminShell user={me.data} current="/admin/analytics">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">Analytics · route</span>
          <h1 style={{ wordBreak: 'break-all' }}>{path}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Recorded visits, estimated browsers, and traffic sources for this
            page.
          </p>
        </div>
        <div className="adm-head-actions">
          <a href="/admin/analytics" className="adm-btn ghost">
            ← Overview
          </a>
          <a href={path} target="_blank" rel="noreferrer" className="adm-btn">
            View page ↗
          </a>
        </div>
      </div>
      <RouteAnalyticsClient path={path} />
    </AdminShell>
  );
}
