import Link from 'next/link';
import { getProjects, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { ProjectsClient } from './projects-client';

export default async function AdminProjectsPage() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: projects } = await loadAdminPage(
    '/admin/projects',
    () => getProjects(),
  );

  return (
    <AdminShell user={me} current="/admin/projects">
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
