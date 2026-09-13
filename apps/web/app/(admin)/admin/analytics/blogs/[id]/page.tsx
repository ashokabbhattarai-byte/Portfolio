import { notFound, redirect } from 'next/navigation';
import { getSignedInUser, getBlog } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from '../../../admin-shell';
import { BlogAnalyticsClient } from './blog-analytics-client';

export default async function BlogAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl(`/admin/analytics/blogs/${id}`));
  const blog = await getBlog(id);
  if (!blog.ok) notFound();

  return (
    <AdminShell user={me.data} current="/admin/analytics">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">Analytics · blog</span>
          <h1>{blog.data.title}</h1>
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              wordBreak: 'break-all',
            }}
          >
            {blog.data.slug} · {blog.data.status}{' '}
            {blog.data.featured ? '· featured' : ''}
          </p>
        </div>
        <div className="adm-head-actions">
          <a
            href={`/blog/${blog.data.slug}`}
            target="_blank"
            rel="noreferrer"
            className="adm-btn ghost"
          >
            View post ↗
          </a>
          <a href="/admin/analytics" className="adm-btn">
            Back to overview
          </a>
        </div>
      </div>
      <BlogAnalyticsClient blogId={blog.data.id} />
    </AdminShell>
  );
}
