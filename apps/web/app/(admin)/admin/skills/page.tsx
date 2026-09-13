import { getSkills, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { SkillsClient } from './skills-client';

export default async function Page() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: data } = await loadAdminPage('/admin/skills', () =>
    getSkills(),
  );
  return (
    <AdminShell user={me} current="/admin/skills">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · skills</span>
          <h1>Skills</h1>
          <p>Grouped skill sets shown on the About page.</p>
        </div>
      </div>
      {!data.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{data.message}</p>
        </div>
      ) : (
        <SkillsClient initial={data.data} />
      )}
    </AdminShell>
  );
}
