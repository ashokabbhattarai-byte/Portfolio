import { redirect } from 'next/navigation';
import {
  getSignedInUser,
  getSkills,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { SkillsClient } from './skills-client';

export default async function Page() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/skills'));
  const data = await getSkills();
  redirectIfSignedOut(data, '/admin/skills');
  return (
    <AdminShell user={me.data} current="/admin/skills">
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
