import Link from 'next/link';
import { getBlogs, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../admin-shell';
import { BlogsClient } from './blogs-client';

export default async function AdminBlogsPage() {
  /* Both round trips at once: the auth check and the data no longer
     wait on each other. */
  const { user: me, data: blogs } = await loadAdminPage(
    '/admin-252755/blogs',
    () => getBlogs(),
  );

  return (
    <AdminShell user={me} current="/admin-252755/blogs">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · blogs</span>
          <h1>Blogs</h1>
          <p>
            Long-form writing, notes, and updates. Drafts stay private, featured
            posts surface on the homepage.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link href="/blog" className="adm-btn ghost">
            View public blog
          </Link>
        </div>
      </div>

      {!blogs.ok ? (
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{blogs.message}</p>
        </div>
      ) : (
        <BlogsClient initial={blogs.data} />
      )}
    </AdminShell>
  );
}
