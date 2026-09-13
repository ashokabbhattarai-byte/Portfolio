import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getProjects,
  getSignedInUser,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { ProjectsClient } from './projects-client';

export default async function AdminProjectsPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/projects'));
  const projects = await getProjects();
  redirectIfSignedOut(projects, '/admin/projects');

  return (
    <AdminShell user={me.data} current="/admin/projects">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · projects</span>
          <h1>Projects</h1>
          <p>
            Featured work, editorial order, and draft control. Positions drive
            the public listing.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link href="/" className="adm-btn ghost">
            View public work
          </Link>
        </div>
      </div>

      {!projects.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{projects.message}</p>
        </div>
      ) : (
        <ProjectsClient initial={projects.data} />
      )}
    </AdminShell>
  );
}
