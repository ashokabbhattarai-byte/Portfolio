import { getCertifications, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { CertificationsClient } from './certifications-client';

export default async function Page() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: data } = await loadAdminPage(
    '/admin/certifications',
    () => getCertifications(),
  );
  return (
    <AdminShell user={me} current="/admin/certifications">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · certifications</span>
          <h1>Certifications</h1>
          <p>Further learning on the About page.</p>
        </div>
      </div>
      {!data.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{data.message}</p>
        </div>
      ) : (
        <CertificationsClient initial={data.data} />
      )}
    </AdminShell>
  );
}
