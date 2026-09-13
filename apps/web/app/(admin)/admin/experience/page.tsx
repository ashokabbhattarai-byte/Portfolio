import { redirect } from 'next/navigation';
import {
  getExperience,
  getSignedInUser,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { ExperienceClient } from './experience-client';

export default async function AdminExperiencePage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/experience'));
  const data = await getExperience();
  redirectIfSignedOut(data, '/admin/experience');
  return (
    <AdminShell user={me.data} current="/admin/experience">
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
