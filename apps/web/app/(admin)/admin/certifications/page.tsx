import { redirect } from 'next/navigation';
import {
  getCertifications,
  getSignedInUser,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { CertificationsClient } from './certifications-client';

export default async function Page() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/certifications'));
  const data = await getCertifications();
  redirectIfSignedOut(data, '/admin/certifications');
  return (
    <AdminShell user={me.data} current="/admin/certifications">
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
