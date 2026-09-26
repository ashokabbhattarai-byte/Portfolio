'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { Blog, BlogImage, MediaAsset } from '@portfolio/types';
import { adminApi, ApiError } from '@/lib/admin-api';
import { qk } from '@/lib/query/keys';
import {
  ListField,
  SwitchField,
  TextAreaField,
  TextField,
} from '@/components/admin/fields';
import { BlogImagesField } from '@/components/admin/blog-images-field';
import { MediaPickerDialog } from '@/components/admin/media-picker';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { BlogSeoPanel } from '@/components/admin/blog-seo-panel';
import {
  SchedulePicker,
  toLocalInput,
} from '@/components/admin/schedule-picker';
import {
  blockers,
  readiness,
  ReadinessList,
  StatusBadge,
} from '@/components/admin/publish-panel';
import {
  useAdminForm,
  useUnsavedChanges,
} from '@/components/admin/use-admin-form';
import { BlogContent } from '@/components/blogs/blog-content';
import { estimateReadingTime, slugify } from '@/lib/blog-utils';

type Values = Omit<Blog, 'id' | 'images'> & {
  images?: Omit<BlogImage, 'id' | 'blogId'>[];
};

const EMPTY: Values = {
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
  featuredImageId: null,
  ogImageId: null,
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
  ogTitle: null,
  ogDescription: null,
  noIndex: false,
  noFollow: false,
};

function validate(values: Values) {
  const errors: Record<string, string> = {};
  if (values.title.trim().length < 2 || values.title.length > 200) {
    errors.title = 'Use a title between 2 and 200 characters.';
  }
  if (
    values.slug.length < 2 ||
    values.slug.length > 120 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)
  ) {
    errors.slug = 'Use 2–120 lowercase letters, numbers and hyphens.';
  }
  const publishing =
    values.status === 'PUBLISHED' || values.status === 'SCHEDULED';
  if (values.excerpt.trim().length < 10 || values.excerpt.length > 400) {
    errors.excerpt = 'Write a summary between 10 and 400 characters.';
  }
  if (publishing && values.content.trim().length < 20) {
    errors.content = 'Write at least 20 characters before publishing.';
  }
  if (
    values.status === 'SCHEDULED' &&
    (!values.scheduledAt ||
      !Number.isFinite(Date.parse(values.scheduledAt)) ||
      Date.parse(values.scheduledAt) <= Date.now())
  ) {
    errors.scheduledAt = 'Choose a date and time in the future.';
  }
  if (values.canonicalUrl && !/^https?:\/\/\S+$/.test(values.canonicalUrl)) {
    errors.canonicalUrl = 'Enter a complete web address, or leave it blank.';
  }
  if (values.linkedinUrl && !/^https?:\/\/\S+$/.test(values.linkedinUrl)) {
    errors.linkedinUrl = 'Enter a complete web address.';
  }
  return errors;
}

/** Strips server-owned fields so a save cannot try to write them back. */
function toPayload(values: Values) {
  return {
    title: values.title.trim(),
    slug: values.slug,
    excerpt: values.excerpt.trim(),
    content: values.content,
    tags: [...new Set(values.tags.map((t) => t.trim()).filter(Boolean))],
    status: values.status,
    published: values.status === 'PUBLISHED',
    featured: values.featured,
    position: values.position,
    scheduledAt:
      values.status === 'SCHEDULED' && values.scheduledAt
        ? new Date(values.scheduledAt).toISOString()
        : null,
    coverImage: values.coverImage || null,
    gallery: values.gallery || null,
    linkedinUrl: values.linkedinUrl || null,
    featuredImageId: values.featuredImageId || null,
    ogImageId: values.ogImageId || null,
    seoTitle: values.seoTitle || null,
    seoDescription: values.seoDescription || null,
    canonicalUrl: values.canonicalUrl || null,
    ogTitle: values.ogTitle || null,
    ogDescription: values.ogDescription || null,
    noIndex: values.noIndex ?? false,
    noFollow: values.noFollow ?? false,
    images: values.images,
  };
}

type Slot = 'featured' | 'og' | null;

export function BlogEditor({ post }: { post: Blog | null }) {
  const router = useRouter();
  const qc = useQueryClient();

  const [customSlug, setCustomSlug] = useState(Boolean(post));
  const [preview, setPreview] = useState(false);
  const [picking, setPicking] = useState<Slot>(null);
  const [featuredImage, setFeaturedImage] = useState<MediaAsset | null>(
    post?.featuredImage ?? null,
  );
  const [ogImage, setOgImage] = useState<MediaAsset | null>(
    post?.ogImage ?? null,
  );
  const [autosave, setAutosave] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [notice, setNotice] = useState('');
  const [previewLink, setPreviewLink] = useState('');

  const [initial] = useState<Values>(() =>
    post
      ? {
          ...EMPTY,
          ...post,
          scheduledAt: toLocalInput(post.scheduledAt),
          images: post.images?.map(
            ({ url, alt, caption, placement, position }) => ({
              url,
              alt,
              caption,
              placement,
              position,
            }),
          ),
        }
      : EMPTY,
  );

  const form = useAdminForm<Values>({
    initial,
    validate,
    submit: async (values) => {
      const payload = toPayload(values);
      const saved = post
        ? await adminApi.blogs.update(post.id, payload)
        : await adminApi.blogs.create(payload);
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.blogs() }),
        qc.invalidateQueries({ queryKey: qk.siteContent() }),
      ]);
      if (!post) router.replace(`/admin-252755/blogs/${saved.id}/edit`);
      else router.refresh();
    },
  });

  useUnsavedChanges(form.dirty && !form.busy && autosave !== 'saved');

  /* Publishing is "set the status, then save". React state is asynchronous, so
     the button records an intent and an effect fires the submit once `values`
     actually carries the new status — otherwise validation would run against
     the old one and a half-finished article could slip out. */
  const [intent, setIntent] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const commit = useCallback(
    (status: string) => {
      form.patch({
        status,
        ...(status === 'PUBLISHED' ? { scheduledAt: null } : {}),
      } as Partial<Values>);
      setIntent(status);
    },
    [form],
  );

  useEffect(() => {
    if (!intent || form.values.status !== intent) return;
    setIntent(null);
    setScheduling(false);
    form.formRef.current?.requestSubmit();
  }, [intent, form.values.status, form.formRef]);

  /* Autosave exists so a long writing session cannot be lost to a closed tab.
     It is limited to drafts of an already-created article: silently rewriting
     a live post, or minting rows as someone types a title, would both be
     worse than losing a draft. */
  const values = form.values;
  const savedSnapshot = useRef(JSON.stringify(initial));
  const eligible =
    Boolean(post) && values.status === 'DRAFT' && !form.busy && form.dirty;

  const runAutosave = useCallback(async () => {
    if (!post) return;
    const snapshot = JSON.stringify(values);
    if (snapshot === savedSnapshot.current) return;
    if (Object.keys(validate(values)).length > 0) return;
    setAutosave('saving');
    try {
      await adminApi.blogs.update(post.id, toPayload(values));
      savedSnapshot.current = snapshot;
      setAutosave('saved');
    } catch {
      setAutosave('error');
    }
  }, [post, values]);

  useEffect(() => {
    if (!eligible) return;
    const timer = setTimeout(() => void runAutosave(), 2500);
    return () => clearTimeout(timer);
  }, [eligible, runAutosave]);

  const reading = estimateReadingTime(values.content);
  const checks = readiness(values);
  const blocking = blockers(checks);
  const coverUrl = featuredImage?.url ?? values.coverImage ?? '';

  async function act(
    label: string,
    run: () => Promise<unknown>,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    setNotice('');
    try {
      await run();
      setNotice(label);
      await qc.invalidateQueries({ queryKey: qk.blogs() });
      router.refresh();
    } catch (error) {
      setNotice(
        error instanceof ApiError ? error.message : `${label} did not work.`,
      );
    }
  }

  return (
    <>
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
            type="button"
            className="adm-btn ghost"
            onClick={() => {
              if (
                !form.dirty ||
                autosave === 'saved' ||
                window.confirm('Discard your unsaved changes?')
              ) {
                router.push('/admin-252755/blogs');
              }
            }}
            disabled={form.busy}
          >
            ← All articles
          </button>

          <span role="status" aria-live="polite" className="blog-editor-state">
            {autosave === 'saving'
              ? 'Saving draft…'
              : autosave === 'saved'
                ? 'Draft saved'
                : autosave === 'error'
                  ? 'Autosave failed — use Save below'
                  : form.dirty
                    ? 'Unsaved changes'
                    : post
                      ? 'All changes saved'
                      : 'New article'}
          </span>

          <button
            type="button"
            className="adm-btn"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
          >
            {preview ? 'Back to writing' : 'Preview'}
          </button>
        </div>

        {notice && (
          <p className="adm-notice ok" role="status">
            {notice}
            {previewLink && (
              <>
                {' '}
                <a href={previewLink} target="_blank" rel="noreferrer">
                  Open preview ↗
                </a>
              </>
            )}
          </p>
        )}

        <fieldset disabled={form.busy} className="blog-editor-fields">
          {preview && (
            <section
              className="blog-editor-preview"
              aria-label="Article preview"
            >
              <p className="article-eyebrow">Preview · unsaved</p>
              <div className="article-tags">
                {values.tags.map((tag, i) => (
                  <span key={i}>{tag}</span>
                ))}
              </div>
              <h1>{values.title || 'Your article title'}</h1>
              <p className="article-deck">
                {values.excerpt || 'Your summary will appear here.'}
              </p>
              <p className="adm-hint">{reading.text}</p>
              {coverUrl && (
                <div className="blog-preview-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt={featuredImage?.alt || values.title}
                  />
                </div>
              )}
              <BlogContent
                content={values.content || 'Start writing to see your article.'}
              />
            </section>
          )}

          <div hidden={preview} className="blog-editor-layout">
            <div className="blog-editor-writing">
              <fieldset className="adm-fieldset">
                <legend>Write</legend>
                <div className="adm-cols">
                  <TextField
                    id="title"
                    label="Article title"
                    span
                    required
                    maxLength={200}
                    value={values.title}
                    onChange={(title) => {
                      form.set('title', title);
                      if (!customSlug) {
                        form.set(
                          'slug',
                          slugify(title).replace(/^-|-$/g, '').slice(0, 120),
                        );
                      }
                    }}
                    error={form.errors.title}
                    placeholder="What would you like to share?"
                  />
                  <TextField
                    id="slug"
                    label="Article address"
                    span
                    required
                    value={values.slug}
                    onChange={(value) => {
                      setCustomSlug(true);
                      form.set('slug', value);
                    }}
                    error={form.errors.slug}
                    hint={`/blog/${values.slug || 'your-article-title'}`}
                  />
                  <TextAreaField
                    id="excerpt"
                    label="Short summary"
                    span
                    required
                    rows={3}
                    value={values.excerpt}
                    onChange={(v) => form.set('excerpt', v)}
                    error={form.errors.excerpt}
                    hint={`${values.excerpt.length}/400 characters`}
                  />
                  <MarkdownEditor
                    id="content"
                    label="Article content"
                    required
                    rows={22}
                    value={values.content}
                    onChange={(v) => form.set('content', v)}
                    error={form.errors.content}
                    hint={`${reading.words} words · ${reading.text} · Markdown`}
                  />
                </div>
              </fieldset>

              <fieldset className="adm-fieldset">
                <legend>Images</legend>
                <div className="blog-image-slot">
                  <span className="blog-image-slot-label">Featured image</span>
                  {featuredImage ? (
                    <div className="blog-image-slot-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={featuredImage.url}
                        alt={featuredImage.alt || values.title}
                      />
                      <div>
                        <p>{featuredImage.originalFilename}</p>
                        <p className="adm-hint">
                          {featuredImage.alt
                            ? `Alt: ${featuredImage.alt}`
                            : 'No alt text — add one on the media page.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="adm-hint">
                      Shown above the article and in listings.
                    </p>
                  )}
                  <button
                    type="button"
                    className="adm-btn tiny"
                    onClick={() => setPicking('featured')}
                  >
                    {featuredImage ? 'Change image' : 'Choose from library'}
                  </button>
                </div>

                <BlogImagesField
                  images={values.images ?? []}
                  onChange={(images) => form.set('images', images)}
                  slug={values.slug || 'misc'}
                />
              </fieldset>
            </div>

            <aside className="blog-editor-settings">
              <fieldset className="adm-fieldset">
                <legend>Publishing</legend>
                <div className="blog-settings-stack">
                  {/* Status is shown, not chosen. Picking "PUBLISHED" from a
                      dropdown and then pressing Save made going live a
                      two-step guess; the buttons below say what they do. */}
                  <StatusBadge
                    status={values.status}
                    scheduledAt={
                      values.scheduledAt
                        ? new Date(values.scheduledAt).toISOString()
                        : null
                    }
                    publishedAt={post?.publishedAt}
                  />

                  <div className="pub-ready">
                    <p className="pub-ready-title">
                      {blocking.length === 0
                        ? 'Ready to publish'
                        : `${blocking.length} thing${
                            blocking.length === 1 ? '' : 's'
                          } left before publishing`}
                    </p>
                    <ReadinessList checks={checks} />
                  </div>

                  {values.status === 'SCHEDULED' && (
                    <div className="pub-actions">
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={form.busy}
                        onClick={() => setScheduling(true)}
                      >
                        Change time
                      </button>
                      <button
                        type="button"
                        className="adm-btn"
                        disabled={form.busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Cancel this schedule? The article goes back to being a draft and will not publish on its own.',
                            )
                          ) {
                            form.set('scheduledAt', null);
                            commit('DRAFT');
                          }
                        }}
                      >
                        Cancel schedule
                      </button>
                    </div>
                  )}

                  <SwitchField
                    id="featured"
                    label="Feature on homepage"
                    checked={values.featured}
                    onChange={(v) => form.set('featured', v)}
                    hint="Appears once the article is published."
                  />
                  <ListField
                    id="tags"
                    label="Topics"
                    values={values.tags}
                    onChange={(v) => form.set('tags', v)}
                    itemLabel="Tag"
                    placeholder="Engineering"
                  />
                  <TextField
                    id="linkedinUrl"
                    label="LinkedIn discussion (optional)"
                    type="url"
                    value={values.linkedinUrl ?? ''}
                    onChange={(v) => form.set('linkedinUrl', v)}
                    error={form.errors.linkedinUrl}
                  />
                </div>
              </fieldset>

              <BlogSeoPanel
                values={values}
                errors={form.errors}
                ogImage={ogImage}
                onPickOgImage={() => setPicking('og')}
                onChange={(patch) => form.patch(patch as Partial<Values>)}
              />

              {post && (
                <fieldset className="adm-fieldset">
                  <legend>More actions</legend>
                  <div className="blog-actions">
                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() =>
                        void act('Preview link created.', async () => {
                          const made = await adminApi.blogOps.preview(post.id);
                          setPreviewLink(made.url);
                        })
                      }
                    >
                      Create shareable preview
                    </button>
                    <p className="adm-hint">
                      A private link that works for 24 hours, even while the
                      article is a draft.
                    </p>

                    <button
                      type="button"
                      className="adm-btn"
                      onClick={() =>
                        void act('Duplicated as a new draft.', async () => {
                          const copy = await adminApi.blogOps.duplicate(
                            post.id,
                          );
                          router.push(`/admin-252755/blogs/${copy.id}/edit`);
                        })
                      }
                    >
                      Duplicate article
                    </button>

                    {post.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        className="adm-btn"
                        onClick={() =>
                          void act(
                            'Article unpublished.',
                            () =>
                              adminApi.blogs.update(post.id, {
                                status: 'UNPUBLISHED',
                                published: false,
                              }),
                            'Unpublish this article? It disappears from the public site.',
                          )
                        }
                      >
                        Unpublish
                      </button>
                    )}

                    <button
                      type="button"
                      className="adm-btn danger"
                      onClick={() =>
                        void act(
                          'Article deleted.',
                          async () => {
                            await adminApi.blogs.remove(post.id);
                            router.push('/admin-252755/blogs');
                          },
                          `Delete “${post.title}”? This cannot be undone.`,
                        )
                      }
                    >
                      Delete article
                    </button>
                  </div>
                </fieldset>
              )}
            </aside>
          </div>
        </fieldset>

        <div className="adm-formbar pub-bar">
          <span role="status" aria-live="polite">
            {form.message ||
              (blocking.length
                ? `Still needed: ${blocking.map((b) => b.label.toLowerCase()).join(', ')}`
                : values.status === 'PUBLISHED'
                  ? 'Live. Saving publishes your edits immediately.'
                  : 'Ready when you are.')}
          </span>
          <span className="spacer" />

          <button
            type="button"
            className="adm-btn ghost"
            onClick={() => router.push('/admin-252755/blogs')}
            disabled={form.busy}
          >
            Cancel
          </button>

          {/* Saving without changing status is always available, so nothing
              forces a decision about going live just to keep your writing. */}
          <button
            type="button"
            className="adm-btn"
            disabled={form.busy}
            onClick={() =>
              commit(values.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT')
            }
          >
            {form.busy
              ? 'Saving…'
              : values.status === 'PUBLISHED'
                ? 'Save changes'
                : 'Save draft'}
          </button>

          {values.status === 'PUBLISHED' ? (
            <button
              type="button"
              className="adm-btn"
              disabled={form.busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Unpublish this article? It disappears from the public site, but the writing is kept.',
                  )
                ) {
                  commit('UNPUBLISHED');
                }
              }}
            >
              Unpublish
            </button>
          ) : (
            <>
              <button
                type="button"
                className="adm-btn"
                disabled={form.busy || blocking.length > 0}
                title={
                  blocking.length
                    ? `Add ${blocking.map((b) => b.label.toLowerCase()).join(' and ')} first`
                    : 'Choose a date and time'
                }
                onClick={() => setScheduling(true)}
              >
                Schedule…
              </button>
              <button
                type="button"
                className="adm-btn primary"
                disabled={form.busy || blocking.length > 0}
                title={
                  blocking.length
                    ? `Add ${blocking.map((b) => b.label.toLowerCase()).join(' and ')} first`
                    : 'Make this visible to everyone now'
                }
                onClick={() => commit('PUBLISHED')}
              >
                Publish now
              </button>
            </>
          )}
        </div>
      </form>

      {/* Overlays live outside the form's column layout so they are centred on
          the screen rather than buried in the sidebar the trigger is far from. */}
      <SchedulePicker
        open={scheduling}
        title={
          values.status === 'SCHEDULED'
            ? 'Change when this publishes'
            : 'Schedule this article'
        }
        confirmLabel={
          values.status === 'SCHEDULED' ? 'Update schedule' : 'Schedule it'
        }
        value={values.scheduledAt ?? ''}
        error={form.errors.scheduledAt}
        busy={form.busy}
        onChange={(v) => form.set('scheduledAt', v)}
        onConfirm={() => commit('SCHEDULED')}
        onCancel={() => {
          /* Leaving without confirming must not strand a half-set time on an
             article that is not actually scheduled. */
          if (values.status !== 'SCHEDULED') {
            form.set('scheduledAt', initial.scheduledAt ?? null);
          }
          setScheduling(false);
        }}
      />

      <MediaPickerDialog
        open={picking !== null}
        title={
          picking === 'og' ? 'Choose a social image' : 'Choose a featured image'
        }
        selectedId={
          picking === 'og' ? values.ogImageId : values.featuredImageId
        }
        onClose={() => setPicking(null)}
        onPick={(asset) => {
          if (picking === 'og') {
            setOgImage(asset);
            form.set('ogImageId', asset?.id ?? null);
          } else {
            setFeaturedImage(asset);
            form.patch({
              featuredImageId: asset?.id ?? null,
              coverImage: asset?.url ?? null,
            });
          }
        }}
      />
    </>
  );
}
