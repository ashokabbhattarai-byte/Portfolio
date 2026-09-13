import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../../admin-shell';
import { ActivityClient } from './activity-client';

export default async function AdminActivityPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/ai/activity'));

  return (
    <AdminShell user={me.data} current="/admin/ai/activity">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">AI · activity</span>
          <h1>Activity log</h1>
          <p>
            Every publish, schedule, upload and key change, and who made it —
            you, an AI key, or the scheduler. Secrets are never recorded.
          </p>
        </div>
      </div>

      <ActivityClient />
    </AdminShell>
  );
}
