import { getEducation, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { EducationClient } from './education-client';

export default async function Page() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: data } = await loadAdminPage('/admin/education', () =>
    getEducation(),
  );
  return (
    <AdminShell user={me} current="/admin/education">
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
