import { redirect } from 'next/navigation';
import {
  getEducation,
  getSignedInUser,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { EducationClient } from './education-client';

export default async function Page() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/education'));
  const data = await getEducation();
  redirectIfSignedOut(data, '/admin/education');
  return (
    <AdminShell user={me.data} current="/admin/education">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · education</span>
          <h1>Education</h1>
          <p>Degrees and notes.</p>
        </div>
      </div>
      {!data.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{data.message}</p>
        </div>
      ) : (
        <EducationClient initial={data.data} />
      )}
    </AdminShell>
  );
}
