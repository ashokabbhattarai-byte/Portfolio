import { getProfile, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { ProfileClient } from './profile-client';

export default async function AdminProfilePage() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: profile } = await loadAdminPage(
    '/admin-252755/profile',
    () => getProfile(),
  );

  return (
    <AdminShell user={me} current="/admin-252755/profile">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · profile</span>
          <h1>Profile</h1>
          <p>
            Name, location, and the single SEO description. This is the one row
            with id = &ldquo;profile&rdquo;.
          </p>
        </div>
      </div>
      {!profile.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{profile.message}</p>
        </div>
      ) : (
        <ProfileClient initial={profile.data} />
      )}
    </AdminShell>
  );
}
