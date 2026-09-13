'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Blog, BlogImage } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { qk } from '@/lib/query/keys';
import {
  ListField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from '@/components/admin/fields';
import { FileUploadField } from '@/components/admin/file-upload';
import { BlogImagesField } from '@/components/admin/blog-images-field';
import {
  useAdminForm,
  useUnsavedChanges,
} from '@/components/admin/use-admin-form';
import { BlogContent } from '@/components/blogs/blog-content';
import {
  estimateReadingTime,
  formatBlogDate,
  getBlogCover,
  slugify,
} from '@/lib/blog-utils';

type Values = Omit<Blog, 'id' | 'images'> & {
  images?: Omit<BlogImage, 'id' | 'blogId'>[];
};
const defaultBlog: Values = {
  slug: '',
  title: '',
  excerpt: '',
  content: '',
  coverImage: null,
  gallery: null,
  tags: [],
  published: false,
  featured: false,
  position: 0,
  status: 'DRAFT',
  scheduledAt: null,
  publishedAt: null,
  linkedinUrl: null,
  linkedinPostId: null,
  linkedinStatus: 'idle',
  images: [],
};
const statuses = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED'] as const;
function localDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function validate(values: Values) {
  const errors: Record<string, string> = {};
  if (values.title.trim().length < 2 || values.title.length > 200)
    errors.title = 'Use a title between 2 and 200 characters.';
  if (
    values.slug.length < 2 ||
    values.slug.length > 120 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)
  )
    errors.slug = 'Use 2–120 lowercase letters, numbers and hyphens.';
  if (values.excerpt.trim().length < 10 || values.excerpt.length > 400)
    errors.excerpt = 'Write a summary between 10 and 400 characters.';
  if (values.content.trim().length < 20)
    errors.content = 'Write at least 20 characters for your article.';
  if (
    values.status === 'SCHEDULED' &&
    (!values.scheduledAt ||
      !Number.isFinite(Date.parse(values.scheduledAt)) ||
      Date.parse(values.scheduledAt) <= Date.now())
  )
    errors.scheduledAt = 'Choose a future date and time.';
  if (values.linkedinUrl && !/^https?:\/\/[^\s]+$/.test(values.linkedinUrl))
    errors.linkedinUrl = 'Enter a complete web address.';
  return errors;
}

export function BlogsClient({ initial }: { initial: Blog[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: blogs = initial } = useQuery({
    queryKey: qk.blogs(),
    queryFn: () => adminApi.blogs.list(),
    initialData: initial,
  });
  const [editing, setEditing] = useState<Blog | 'new' | null>(null);
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
  if (editing)
    return (
      <BlogEditor
        key={editing === 'new' ? 'new' : editing.id}
        post={editing === 'new' ? null : editing}
        position={blogs.length}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          setMessage('Post saved successfully.');
          await refresh();
        }}
      />
    );
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
        <button className="adm-btn primary" onClick={() => setEditing('new')}>
          + New article
        </button>
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
                  <span>{estimateReadingTime(post.content).text}</span>
                </div>
                <button
                  className="blog-row-title"
                  onClick={() => setEditing(post)}
                >
                  {post.title}
                </button>
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
                <button
                  className="adm-btn tiny"
                  onClick={() => setEditing(post)}
                >
                  Edit
                </button>
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

function BlogEditor({
  post,
  position,
  onClose,
  onSaved,
}: {
  post: Blog | null;
  position: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [preview, setPreview] = useState(false);
  const [customSlug, setCustomSlug] = useState(!!post);
  const [initial] = useState<Values>(() =>
    post
      ? {
          ...post,
          scheduledAt: localDate(post.scheduledAt),
          images: post.images?.map(
            ({ url, alt, caption, placement, position }) => ({
              url,
              alt,
              caption,
              placement,
              position,
            }),
          ) as Values['images'],
        }
      : { ...defaultBlog, position },
  );
  const form = useAdminForm<Values>({
    initial,
    validate,
    submit: async (values) => {
      const {
        id: _id,
        createdAt: _created,
        updatedAt: _updated,
        publishedAt: _publishedAt,
        ...data
      } = values as Blog;
      void _id;
      void _created;
      void _updated;
      void _publishedAt;
      const payload = {
        ...data,
        title: values.title.trim(),
        excerpt: values.excerpt.trim(),
        tags: [...new Set(values.tags.map((t) => t.trim()).filter(Boolean))],
        published: values.status === 'PUBLISHED',
        scheduledAt:
          values.status === 'SCHEDULED' && values.scheduledAt
            ? new Date(values.scheduledAt).toISOString()
            : null,
        coverImage: values.coverImage || null,
        gallery: values.gallery || null,
        linkedinUrl: values.linkedinUrl || null,
      };
      if (post) await adminApi.blogs.update(post.id, payload);
      else await adminApi.blogs.create(payload);
      await onSaved();
    },
  });
  useUnsavedChanges(form.dirty && !form.busy);
  const reading = estimateReadingTime(form.values.content);
  const cover = getBlogCover(form.values as Blog);
  function close() {
    if (!form.busy && (!form.dirty || confirm('Discard your unsaved changes?')))
      onClose();
  }
  const action =
    form.values.status === 'PUBLISHED'
      ? post?.status === 'PUBLISHED'
        ? 'Save published changes'
        : 'Publish article'
      : form.values.status === 'SCHEDULED'
        ? 'Schedule article'
        : form.values.status === 'ARCHIVED'
          ? 'Archive article'
          : 'Save draft';
  return (
    <form
      ref={form.formRef}
      className="adm-form blog-editor"
      noValidate
      onSubmit={(event) => {
        setPreview(false);
        form.onSubmit(event);
      }}
    >
      <div className="blog-editor-bar">
        <button
          className="adm-btn ghost"
          type="button"
          onClick={close}
          disabled={form.busy}
        >
          ← All articles
        </button>
        <span>
          {post ? 'Edit article' : 'New article'} ·{' '}
          {form.dirty ? 'Unsaved changes' : 'Ready to edit'}
        </span>
        <button
          className="adm-btn"
          type="button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Back to writing' : 'Preview article'}
        </button>
      </div>
      <fieldset disabled={form.busy} className="blog-editor-fields">
        {preview && (
          <section className="blog-editor-preview" aria-label="Article preview">
            <p className="article-eyebrow">Preview · not saved</p>
            <div className="article-tags">
              {form.values.tags.map((tag, i) => (
                <span key={i}>{tag}</span>
              ))}
            </div>
            <h1>{form.values.title || 'Your article title'}</h1>
            <p className="article-deck">
              {form.values.excerpt || 'Your article summary will appear here.'}
            </p>
            <p className="adm-hint">{reading.text}</p>
            {cover.url && (
              <div className="blog-preview-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover.url} alt={cover.alt || form.values.title} />
              </div>
            )}
            <BlogContent
              content={
                form.values.content || 'Start writing to see your article here.'
              }
            />
            {(form.values.images ?? [])
              .filter(
                (image) =>
                  image.placement === 'INLINE' || image.placement === 'GALLERY',
              )
              .map((image, index) => (
                <figure className="article-image" key={index}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt || form.values.title} />
                  {image.caption && <figcaption>{image.caption}</figcaption>}
                </figure>
              ))}
            {form.values.gallery &&
              !(form.values.images ?? []).some(
                (image) => image.placement === 'GALLERY',
              ) && (
                <figure className="article-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.values.gallery}
                    alt={`${form.values.title} gallery`}
                  />
                </figure>
              )}
          </section>
        )}
        <div hidden={preview} className="blog-editor-layout">
          <div className="blog-editor-writing">
            <fieldset className="adm-fieldset">
              <legend>01 · Story</legend>
              <div className="adm-cols">
                <TextField
                  id="title"
                  label="Article title"
                  span
                  required
                  maxLength={200}
                  value={form.values.title}
                  onChange={(title) => {
                    form.set('title', title);
                    if (!customSlug)
                      form.set(
                        'slug',
                        slugify(title).replace(/^-|-$/g, '').slice(0, 120),
                      );
                  }}
                  error={form.errors.title}
                  placeholder="What would you like to share?"
                />
                <TextField
                  id="slug"
                  label="Article address"
                  span
                  required
                  value={form.values.slug}
                  onChange={(value) => {
                    setCustomSlug(true);
                    form.set('slug', value);
                  }}
                  error={form.errors.slug}
                  hint={`/blog/${form.values.slug || 'your-article-title'}`}
                />
                <TextAreaField
                  id="excerpt"
                  label="Short summary"
                  span
                  required
                  rows={3}
                  value={form.values.excerpt}
                  onChange={(v) => form.set('excerpt', v)}
                  error={form.errors.excerpt}
                  hint={`${form.values.excerpt.length}/400 characters · A clear introduction for readers and search results.`}
                />
                <TextAreaField
                  id="content"
                  label="Article content"
                  span
                  required
                  rows={20}
                  value={form.values.content}
                  onChange={(v) => form.set('content', v)}
                  error={form.errors.content}
                  hint={`${reading.words} words · ${reading.text} · Markdown supported`}
                />
                <details className="span-all blog-markdown-help">
                  <summary>Formatting guide</summary>
                  <p>
                    ## Section heading · ### Subheading · **bold** · *italic* ·
                    [link text](https://example.com) · - list item
                  </p>
                  <p>
                    Put three backticks on separate lines around code. Add
                    images with ![Description](https://image-url).
                  </p>
                </details>
              </div>
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>02 · Images</legend>
              <FileUploadField
                id="coverImage"
                label="Cover image"
                value={cover.url}
                onChange={(url) =>
                  form.patch({
                    coverImage: url || null,
                    images: form.values.images?.filter(
                      (image) =>
                        image.placement !== 'COVER' &&
                        image.placement !== 'HERO',
                    ),
                  })
                }
                folder="blogs"
                slug={form.values.slug || 'misc'}
                hint="Choose a clear landscape image. Preview shows how it appears above your article."
              />
              <BlogImagesField
                images={form.values.images ?? []}
                onChange={(images) => form.set('images', images)}
                slug={form.values.slug || 'misc'}
              />
              {form.values.gallery && (
                <FileUploadField
                  id="gallery"
                  label="Existing gallery image"
                  value={form.values.gallery}
                  onChange={(url) => form.set('gallery', url || null)}
                  folder="blogs"
                  slug={form.values.slug || 'misc'}
                />
              )}
            </fieldset>
          </div>
          <aside className="blog-editor-settings">
            <fieldset className="adm-fieldset">
              <legend>03 · Publication</legend>
              <div className="blog-settings-stack">
                <SelectField
                  id="status"
                  label="Visibility"
                  value={form.values.status}
                  onChange={(v) => form.set('status', v)}
                  options={statuses}
                  hint={
                    form.values.status === 'DRAFT'
                      ? 'Private. Only visible in your admin.'
                      : form.values.status === 'PUBLISHED'
                        ? 'Saving makes this article visible to everyone.'
                        : form.values.status === 'SCHEDULED'
                          ? 'Publish at the date and time below.'
                          : 'Hidden from the public journal.'
                  }
                />
                {form.values.status === 'SCHEDULED' && (
                  <TextField
                    id="scheduledAt"
                    type="datetime-local"
                    label="Publish date and time"
                    required
                    value={form.values.scheduledAt ?? ''}
                    onChange={(v) => form.set('scheduledAt', v)}
                    error={form.errors.scheduledAt}
                    hint="Your device’s local timezone. Public pages refresh shortly after this time."
                  />
                )}
                <SwitchField
                  id="featured"
                  label="Feature on homepage"
                  checked={form.values.featured}
                  onChange={(v) => form.set('featured', v)}
                  hint="Appears when the article is published."
                />
                <ListField
                  id="tags"
                  label="Topics"
                  values={form.values.tags}
                  onChange={(v) => form.set('tags', v)}
                  itemLabel="Tag"
                  placeholder="Engineering"
                />
                <TextField
                  id="linkedinUrl"
                  label="LinkedIn discussion (optional)"
                  type="url"
                  value={form.values.linkedinUrl ?? ''}
                  onChange={(v) => form.set('linkedinUrl', v)}
                  error={form.errors.linkedinUrl}
                  hint="Link to an existing post for readers to join the conversation."
                />
              </div>
            </fieldset>
          </aside>
        </div>
      </fieldset>
      <div className="adm-formbar">
        <span role="status" aria-live="polite">
          {form.message ||
            (form.values.status === 'DRAFT'
              ? 'Your draft stays private.'
              : 'Review your article before saving.')}
        </span>
        <span className="spacer" />
        <button
          type="button"
          className="adm-btn"
          onClick={close}
          disabled={form.busy}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="adm-btn primary"
          disabled={form.busy}
          onClick={() => {
            if (Object.keys(validate(form.values)).length) setPreview(false);
          }}
        >
          {form.busy ? 'Saving…' : action}
        </button>
      </div>
    </form>
  );
}
