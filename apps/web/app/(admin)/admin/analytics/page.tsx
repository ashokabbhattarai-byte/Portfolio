import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { AnalyticsClient } from './analytics-client';

export default async function AnalyticsPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/analytics'));

  return (
    <AdminShell user={me.data} current="/admin/analytics">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">Analytics · portfolio</span>
          <h1>Portfolio analytics</h1>
          <p>
            Understand how readers discover your work. Recorded page views,
            article readership, and project performance in one place.
          </p>
        </div>
      </div>
      <AnalyticsClient />
    </AdminShell>
  );
}
