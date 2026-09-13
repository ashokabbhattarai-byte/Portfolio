import { getExperience, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { ExperienceClient } from './experience-client';

export default async function AdminExperiencePage() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: data } = await loadAdminPage(
    '/admin/experience',
    () => getExperience(),
  );
  return (
    <AdminShell user={me} current="/admin/experience">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · experience</span>
          <h1>Experience</h1>
          <p>
            Roles ordered by position. The public About page renders them in
            this order.
          </p>
        </div>
      </div>
      {!data.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{data.message}</p>
        </div>
      ) : (
        <ExperienceClient initial={data.data} />
      )}
    </AdminShell>
  );
}
