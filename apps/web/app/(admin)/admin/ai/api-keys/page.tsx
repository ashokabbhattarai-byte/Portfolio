import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../../admin-shell';
import { ApiKeysClient } from './api-keys-client';

export default async function AdminApiKeysPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/ai/api-keys'));

  /* Issuing a key grants publishing rights, so it is an ADMIN action. The API
     enforces this too; this only avoids rendering a page that would 403. */
  if (me.data.role !== 'ADMIN') {
    return (
      <AdminShell user={me.data} current="/admin/ai/api-keys">
        <div className="adm-head">
          <div>
            <span className="adm-eyebrow">AI · keys</span>
            <h1>API keys</h1>
          </div>
        </div>
        <div className="adm-panel">
          <p>Only an administrator can issue or revoke API keys.</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell user={me.data} current="/admin/ai/api-keys">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">AI · keys</span>
          <h1>API keys</h1>
          <p>
            Scoped keys let external agents draft and manage articles through{' '}
            <code>/api/v1/ai</code> without your admin password. Keys are shown
            once and stored only as a hash.
          </p>
        </div>
      </div>

      <ApiKeysClient />
    </AdminShell>
  );
}
