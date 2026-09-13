import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { MediaClient } from './media-client';

export default async function AdminMediaPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/media'));

  return (
    <AdminShell user={me.data} current="/admin/media">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · media</span>
          <h1>Media library</h1>
          <p>
            Every image used by an article. Uploads are re-encoded to WebP,
            resized to fit 2400px and stripped of metadata. Images in use cannot
            be deleted.
          </p>
        </div>
      </div>

      <MediaClient />
    </AdminShell>
  );
}
