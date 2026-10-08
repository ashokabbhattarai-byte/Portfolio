import { notFound } from 'next/navigation';
import { getBlog, loadAdminPage } from '@/lib/admin-server';
import { AdminShell } from '../../../admin-shell';
import { BlogEditor } from '@/components/admin/blog-editor';

export default async function EditBlogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user: me, data: blog } = await loadAdminPage(
    `/admin-252755/blogs/${id}/edit`,
    () => getBlog(id),
  );

  if (!blog.ok) {
    if (blog.status === 404) notFound();
    return (
      <AdminShell user={me} current="/admin-252755/blogs">
        <div className="adm-panel">
          <p style={{ color: 'var(--danger)' }}>{blog.message}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell user={me} current="/admin-252755/blogs">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · blogs</span>
          <h1>Edit article</h1>
          <p>
            {blog.data.status === 'PUBLISHED'
              ? 'This article is live. Changes go out as soon as you save.'
              : 'Not visible to the public yet.'}
            {blog.data.createdByAI ? ' Originally drafted by an AI agent.' : ''}
          </p>
        </div>
        {blog.data.status === 'PUBLISHED' && (
          <div className="adm-head-actions">
            <a
              className="adm-btn ghost"
              href={`/blog/${blog.data.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              View live ↗
            </a>
          </div>
        )}
      </div>

      <BlogEditor post={blog.data} />
    </AdminShell>
  );
}
