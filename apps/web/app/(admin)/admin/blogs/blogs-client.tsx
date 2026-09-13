'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Blog } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { qk } from '@/lib/query/keys';
import { SelectField, TextField } from '@/components/admin/fields';
import { estimateReadingTime, formatBlogDate } from '@/lib/blog-utils';
import { describeSchedule } from '@/components/admin/schedule-picker';

const statuses = [
  'DRAFT',
  'PUBLISHED',
  'SCHEDULED',
  'UNPUBLISHED',
  'ARCHIVED',
] as const;
export function BlogsClient({ initial }: { initial: Blog[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: blogs = initial } = useQuery({
    queryKey: qk.blogs(),
    queryFn: () => adminApi.blogs.list(),
    initialData: initial,
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const visible = blogs.filter(
    (b) =>
      (filter === 'ALL' || b.status === filter) &&
      `${b.title} ${b.slug} ${b.tags.join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.blogs() }),
      qc.invalidateQueries({ queryKey: qk.siteContent() }),
    ]);
    router.refresh();
  }
  async function remove(post: Blog) {
    if (!confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminApi.blogs.remove(post.id);
      await refresh();
      setMessage('Post deleted.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not delete the post.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function move(id: string, direction: number) {
    const next = [...blogs];
    const index = next.findIndex((b) => b.id === id);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await adminApi.blogs.reorder(next.map((b) => b.id));
      await refresh();
    } catch {
      setMessage('Could not change the order. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="blog-manager">
      <div className="blog-manager-toolbar">
        <div>
          <h2>Your articles</h2>
          <p>
            {blogs.length} total ·{' '}
            {blogs.filter((b) => b.status === 'PUBLISHED').length} published ·{' '}
            {blogs.filter((b) => b.status === 'DRAFT').length} drafts
          </p>
        </div>
        <Link className="adm-btn primary" href="/admin/blogs/new">
          + New article
        </Link>
      </div>
      <div className="blog-manager-filters">
        <TextField
          id="blog-search"
          label="Search articles"
          value={search}
          onChange={setSearch}
          placeholder="Search title, slug or tag…"
        />
        <SelectField
          id="blog-filter"
          label="Publication status"
          value={filter}
          onChange={setFilter}
          options={['ALL', ...statuses]}
        />
      </div>
      <p role="status" className="adm-hint">
        {message ||
          `${visible.length} ${visible.length === 1 ? 'article' : 'articles'} shown`}
      </p>
      <div className="adm-rows">
        {visible.map((post) => {
          const index = blogs.findIndex((b) => b.id === post.id);
          return (
            <div key={post.id} className="adm-row blog-manager-row">
              <div className="adm-move-group">
                <button
                  className="adm-move"
                  disabled={busy || index === 0 || !!search || filter !== 'ALL'}
                  onClick={() => move(post.id, -1)}
                  aria-label={`Move ${post.title} up`}
                >
                  ↑
                </button>
                <button
                  className="adm-move"
                  disabled={
                    busy ||
                    index === blogs.length - 1 ||
                    !!search ||
                    filter !== 'ALL'
                  }
                  onClick={() => move(post.id, 1)}
                  aria-label={`Move ${post.title} down`}
                >
                  ↓
                </button>
              </div>
              <div className="adm-row-main">
                <div className="blog-row-meta">
                  <span className="blog-status" data-status={post.status}>
                    {post.status.toLowerCase()}
                  </span>
                  {post.featured && <span>Featured</span>}
                  {post.createdByAI && (
                    <span title="Drafted by an AI agent">AI</span>
                  )}
                  {/* A scheduled post's whole point is the time it goes out —
                      that belongs in the list, not one click inside it. */}
                  {post.status === 'SCHEDULED' && post.scheduledAt && (
                    <span className="blog-row-when">
                      Goes out {describeSchedule(post.scheduledAt)}
                    </span>
                  )}
                  <span>{estimateReadingTime(post.content).text}</span>
                </div>
                <Link
                  className="blog-row-title"
                  href={`/admin/blogs/${post.id}/edit`}
                >
                  {post.title}
                </Link>
                <p>{post.excerpt}</p>
                <span className="adm-hint">
                  /blog/{post.slug}
                  {post.updatedAt
                    ? ` · Updated ${formatBlogDate(post.updatedAt)}`
                    : ''}
                </span>
              </div>
              <div className="blog-row-actions">
                <a
                  className="adm-btn tiny"
                  href={`/admin/analytics/blogs/${post.id}`}
                  title="View detailed analytics"
                >
                  Analytics
                </a>
                <Link
                  className="adm-btn tiny"
                  href={`/admin/blogs/${post.id}/edit`}
                >
                  Edit
                </Link>
                {post.status === 'PUBLISHED' && (
                  <a
                    className="adm-btn tiny"
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View ↗
                  </a>
                )}
                <button
                  className="adm-btn tiny danger"
                  disabled={busy}
                  onClick={() => remove(post)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {!visible.length && (
          <div className="blog-empty">
            <h3>
              {blogs.length
                ? 'No matching articles'
                : 'Your next idea starts here.'}
            </h3>
            <p>
              {blogs.length
                ? 'Try another search or publication status.'
                : 'Create a private draft, shape your story, then preview it before publishing.'}
            </p>
            {blogs.length > 0 && (
              <button
                className="adm-btn"
                onClick={() => {
                  setSearch('');
                  setFilter('ALL');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
