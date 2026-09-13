import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getBlogs,
  getSignedInUser,
  redirectIfSignedOut,
} from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../admin-shell';
import { BlogsClient } from './blogs-client';

export default async function AdminBlogsPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin/blogs'));
  const blogs = await getBlogs();
  redirectIfSignedOut(blogs, '/admin/blogs');

  return (
    <AdminShell user={me.data} current="/admin/blogs">
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
