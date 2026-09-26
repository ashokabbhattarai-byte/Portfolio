import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../../admin-shell';
import { BlogEditor } from '@/components/admin/blog-editor';

export default async function NewBlogPage() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin-252755/blogs/new'));

  return (
    <AdminShell user={me.data} current="/admin-252755/blogs">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · blogs</span>
          <h1>New article</h1>
          <p>
            Drafts stay private until you publish. Save once and autosave takes
            over from there.
          </p>
        </div>
      </div>

      <BlogEditor post={null} />
    </AdminShell>
  );
}
