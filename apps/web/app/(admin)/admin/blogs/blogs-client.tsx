'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListControls, usePagedList } from '@/components/admin/paged-list';
import type { BlogSummary, PageResult } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { qk } from '@/lib/query/keys';
import { SelectField } from '@/components/admin/fields';
import { formatBlogDate } from '@/lib/blog-utils';
import { describeSchedule } from '@/components/admin/schedule-picker';

const statuses = [
  'DRAFT',
  'REVIEW',
  'PUBLISHED',
  'SCHEDULED',
  'UNPUBLISHED',
  'ARCHIVED',
] as const;
export function BlogsClient({ initial }: { initial: PageResult<BlogSummary> }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('ALL');
  const [tag, setTag] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const list = usePagedList(
    'blogs',
    initial,
    adminApi.blogOps.search,
    { status: filter === 'ALL' ? undefined : filter, tag: tag || undefined },
    'newest',
  );
  const blogs = list.rows;
  const visible = blogs;
  const search = list.search;
  const setSearch = list.setSearch;
  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.blogs() }),
      qc.invalidateQueries({ queryKey: qk.siteContent() }),
    ]);
    router.refresh();
  }
  async function remove(post: BlogSummary) {
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
  return (
    <div className="blog-manager">
      <div className="blog-manager-toolbar">
        <div>
          <h2>Your articles</h2>
          <p>Manage drafts, scheduled releases, and published articles.</p>
        </div>
        <Link className="adm-btn primary" href="/admin/blogs/new">
          + New article
        </Link>
      </div>
      <ListControls
        list={list}
        label="articles"
        sortOptions={['newest', 'oldest', 'updated', 'title']}
      >
        <SelectField
          id="blog-filter"
          label="Publication status"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            list.setPage(1);
          }}
          options={['ALL', ...statuses]}
        />
        <label>
          Tag
          <input
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              list.setPage(1);
            }}
            placeholder="Exact tag"
          />
        </label>
      </ListControls>
      <p role="status" className="adm-hint">
        {message ||
          `${visible.length} ${visible.length === 1 ? 'article' : 'articles'} shown`}
      </p>
      <div className="adm-rows">
        {visible.map((post) => {
          return (
            <div key={post.id} className="adm-row blog-manager-row">
              <div className="adm-row-main">
                <div className="blog-row-meta">
                  <span className="blog-status" data-status={post.status}>
                    {post.status.toLowerCase()}
                  </span>
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
        {!list.isFetching && !list.error && !visible.length && (
          <div className="blog-empty">
            <h3>
              {search || filter !== 'ALL' || tag
                ? 'No matching articles'
                : 'Your next idea starts here.'}
            </h3>
            <p>
              {search || filter !== 'ALL' || tag
                ? 'Try another search or publication status.'
                : 'Create a private draft, shape your story, then preview it before publishing.'}
            </p>
            {(search || filter !== 'ALL' || tag) && (
              <button
                className="adm-btn"
                onClick={() => {
                  setSearch('');
                  setFilter('ALL');
                  setTag('');
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
