import { redirect } from 'next/navigation';
import {
  getProfile,
  getSignedInUser,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { ProfileClient } from './profile-client';

export default async function AdminProfilePage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/profile'));
  const profile = await getProfile();
  redirectIfSignedOut(profile, '/admin/profile');

  return (
    <AdminShell user={me.data} current="/admin/profile">
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
