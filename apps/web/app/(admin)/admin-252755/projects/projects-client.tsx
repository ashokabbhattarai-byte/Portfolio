'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ListControls, usePagedList } from '@/components/admin/paged-list';
import type { PageResult, Project } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { qk } from '@/lib/query/keys';
import {
  ColorField,
  ListField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from '@/components/admin/fields';
import { FileUploadField } from '@/components/admin/file-upload';
import { useAdminForm } from '@/components/admin/use-admin-form';

type Timestamped = Project & { updatedAt?: string };

const defaultProject: Omit<Project, 'id'> = {
  slug: '',
  title: '',
  category: 'AI',
  role: '',
  context: '',
  summary: '',
  color: '#dae5dc',
  ink: '#25493e',
  symbol: '•',
  live: null,
  image: null,
  gallery: null,
  overview: '',
  challenge: '',
  contribution: '',
  outcome: '',
  focus: [],
  features: [],
  published: true,
  featured: false,
  position: 0,
};

function validate(values: Omit<Project, 'id'>) {
  const e: Record<string, string> = {};
  if (!values.slug.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug))
    e.slug = 'Lowercase hyphenated slug required.';
  if (!values.title.trim()) e.title = 'Title required.';
  if (!values.role.trim()) e.role = 'Role required.';
  if (!values.summary.trim()) e.summary = 'Summary required.';
  if (!values.overview.trim()) e.overview = 'Overview required.';
  if (!/^#[0-9a-fA-F]{6}$/.test(values.color)) e.color = 'Hex required.';
  if (!/^#[0-9a-fA-F]{6}$/.test(values.ink)) e.ink = 'Hex required.';
  return e;
}

export function ProjectsClient({
  initial,
}: {
  initial: PageResult<Timestamped>;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const list = usePagedList('projects', initial, adminApi.projects.search);
  const projects = list.rows;
  const [editing, setEditing] = useState<Timestamped | null>(null);
  const [creating, setCreating] = useState(false);

  async function invalidate() {
    await qc.invalidateQueries({ queryKey: qk.projects() });
    await qc.invalidateQueries({ queryKey: qk.siteContent() });
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    // Optimistic
    const prev = qc.getQueryData<Timestamped[]>(qk.projects());
    if (prev)
      qc.setQueryData(
        qk.projects(),
        prev.filter((p) => p.id !== id),
      );
    try {
      await adminApi.projects.remove(id);
      await invalidate();
    } catch (e) {
      if (prev) qc.setQueryData(qk.projects(), prev);
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  async function move(id: string, dir: -1 | 1) {
    if (!list.canReorder) return;
    const idx = projects.findIndex((p) => p.id === id);
    const target = idx + dir;
    if (target < 0 || target >= projects.length) return;
    const next = [...projects];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    const prev = [...projects];
    qc.setQueryData(
      qk.projects(),
      next.map((p, i) => ({ ...p, position: i })),
    );
    try {
      await adminApi.projects.reorder(next.map((p) => p.id));
      await invalidate();
    } catch {
      qc.setQueryData(qk.projects(), prev);
    }
  }

  const form = useAdminForm<Omit<Project, 'id'>>({
    initial: editing
      ? ({
          slug: editing.slug,
          title: editing.title,
          category: editing.category,
          role: editing.role,
          context: editing.context,
          summary: editing.summary,
          color: editing.color,
          ink: editing.ink,
          symbol: editing.symbol,
          live: editing.live ?? '',
          image: editing.image ?? '',
          gallery: editing.gallery ?? '',
          overview: editing.overview,
          challenge: editing.challenge,
          contribution: editing.contribution,
          outcome: editing.outcome,
          focus: editing.focus,
          features: editing.features,
          published: editing.published,
          featured: editing.featured,
          position: editing.position,
        } as Omit<Project, 'id'>)
      : defaultProject,
    validate,
    submit: async (values) => {
      const payload = {
        ...values,
        live: values.live ? String(values.live) : null,
        image: values.image ? String(values.image) : null,
        gallery: values.gallery ? String(values.gallery) : null,
      };
      // Optimistic for update
      if (editing) {
        const prev = qc.getQueryData<Timestamped[]>(qk.projects());
        if (prev)
          qc.setQueryData(
            qk.projects(),
            prev.map((p) =>
              p.id === editing.id ? ({ ...p, ...payload } as Timestamped) : p,
            ),
          );
        try {
          await adminApi.projects.update(editing.id, payload);
        } catch (e) {
          if (prev) qc.setQueryData(qk.projects(), prev);
          throw e;
        }
      } else {
        await adminApi.projects.create(payload);
      }
      setEditing(null);
      setCreating(false);
      await invalidate();
    },
    savedMessage: 'Project saved. Revalidation triggered.',
  });

  const active =
    editing || (creating ? (defaultProject as unknown as Project) : null);
  const showForm = !!active;
  const formKey = editing ? editing.id : creating ? 'new' : 'none';
  const slugForUpload = form.values.slug || editing?.slug || 'misc';

  return (
    <>
      <ListControls list={list} label="projects" />
      {!list.canReorder && (
        <p className="adm-hint">
          Use the Position field when editing to set display order across pages.
        </p>
      )}
      <div className="adm-rows">
        {projects.length === 0 ? (
          <div className="adm-row">No projects yet.</div>
        ) : null}
        {projects.map((p, i) => (
          <div key={p.id} className="adm-row">
            <div className="adm-move-group">
              <button
                className="adm-move"
                onClick={() => move(p.id, -1)}
                disabled={!list.canReorder || i === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                className="adm-move"
                onClick={() => move(p.id, 1)}
                disabled={!list.canReorder || i === projects.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
            </div>
            <div className="adm-row-main">
              <div
                style={{
                  fontWeight: 500,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    background: p.color,
                    border: '1px solid var(--line)',
                    display: 'inline-block',
                  }}
                />
                {p.title}
                <span style={{ fontWeight: 400, color: 'var(--muted)' }}>
                  {p.category}
                </span>
                {p.featured ? <span className="adm-role">featured</span> : null}
                {!p.published ? (
                  <span
                    className="adm-role"
                    style={{
                      borderColor: 'var(--danger)',
                      color: 'var(--danger)',
                    }}
                  >
                    draft
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {p.slug} · {p.role} · pos {p.position}
              </div>
              {p.image ? (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    wordBreak: 'break-all',
                  }}
                >
                  {p.image}
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="adm-btn tiny"
                onClick={() => {
                  setEditing(p);
                  setCreating(false);
                }}
              >
                Edit
              </button>
              <button
                className="adm-btn tiny danger"
                onClick={() => remove(p.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button
          className="adm-btn primary"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
        >
          New project
        </button>
        {(editing || creating) && (
          <button
            className="adm-btn"
            onClick={() => {
              setEditing(null);
              setCreating(false);
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {showForm && (
        <form
          key={formKey}
          ref={form.formRef as never}
          onSubmit={form.onSubmit}
          className="adm-form"
          style={{ marginTop: 18 }}
        >
          <fieldset className="adm-fieldset">
            <legend>Project</legend>
            <div className="adm-cols">
              <TextField
                id="slug"
                label="Slug"
                required
                value={form.values.slug}
                onChange={(v) => form.set('slug', v)}
                error={form.errors.slug}
                hint="Used in /projects/:slug and storage path"
              />
              <TextField
                id="title"
                label="Title"
                required
                value={form.values.title}
                onChange={(v) => form.set('title', v)}
                error={form.errors.title}
              />
              <SelectField
                id="category"
                label="Category"
                value={form.values.category as string}
                onChange={(v) => form.set('category', v as never)}
                options={['AI', 'Full stack', 'Blockchain'] as never}
              />
              <TextField
                id="role"
                label="Role"
                required
                value={form.values.role}
                onChange={(v) => form.set('role', v)}
                error={form.errors.role}
              />
              <TextField
                id="context"
                label="Context"
                value={form.values.context}
                onChange={(v) => form.set('context', v)}
              />
              <TextAreaField
                id="summary"
                label="Summary"
                required
                value={form.values.summary}
                onChange={(v) => form.set('summary', v)}
                error={form.errors.summary}
              />
              <ColorField
                id="color"
                label="Color"
                value={form.values.color}
                onChange={(v) => form.set('color', v)}
                error={form.errors.color}
              />
              <ColorField
                id="ink"
                label="Ink"
                value={form.values.ink}
                onChange={(v) => form.set('ink', v)}
                error={form.errors.ink}
              />
              <TextField
                id="symbol"
                label="Symbol"
                value={form.values.symbol}
                onChange={(v) => form.set('symbol', v)}
                hint="Brand mark shown on artwork"
              />
              <TextField
                id="live"
                label="Live URL"
                value={(form.values.live as string) ?? ''}
                onChange={(v) => form.set('live', (v || null) as never)}
              />
              <FileUploadField
                id="image"
                label="Cover image"
                value={(form.values.image as string) ?? null}
                onChange={(url) => form.set('image', (url || null) as never)}
                folder="projects"
                slug={slugForUpload}
                hint="WebP 1200px wide ideal. Stored in portfolio-storage/projects/<slug>/"
              />
              <FileUploadField
                id="gallery"
                label="Gallery image"
                value={(form.values.gallery as string) ?? null}
                onChange={(url) => form.set('gallery', (url || null) as never)}
                folder="projects"
                slug={slugForUpload}
                hint="Optional secondary image"
              />
              <TextAreaField
                id="overview"
                label="Overview"
                required
                value={form.values.overview}
                onChange={(v) => form.set('overview', v)}
                error={form.errors.overview}
                span
              />
              <TextAreaField
                id="challenge"
                label="Challenge"
                value={form.values.challenge}
                onChange={(v) => form.set('challenge', v)}
                span
              />
              <TextAreaField
                id="contribution"
                label="Contribution"
                value={form.values.contribution}
                onChange={(v) => form.set('contribution', v)}
                span
              />
              <TextAreaField
                id="outcome"
                label="Outcome"
                value={form.values.outcome}
                onChange={(v) => form.set('outcome', v)}
                span
              />
              <ListField
                id="focus"
                label="Focus"
                values={form.values.focus}
                onChange={(v) => form.set('focus', v as never)}
                itemLabel="Focus"
                placeholder="Public notices"
              />
              <ListField
                id="features"
                label="Features"
                values={form.values.features}
                onChange={(v) => form.set('features', v as never)}
                itemLabel="Feature"
                placeholder="AI summaries…"
              />
              <SwitchField
                id="published"
                label="Published"
                hint="Drafts are hidden from the public site"
                checked={!!form.values.published}
                onChange={(v) => form.set('published', v as never)}
              />
              <SwitchField
                id="featured"
                label="Featured"
                hint="Shows on the home page"
                checked={!!form.values.featured}
                onChange={(v) => form.set('featured', v as never)}
              />
            </div>
          </fieldset>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="submit"
              className="adm-btn primary"
              disabled={form.busy}
            >
              {form.busy
                ? 'Saving…'
                : editing
                  ? 'Update project'
                  : 'Create project'}
            </button>
            <span
              style={{
                fontSize: 13,
                color:
                  form.status === 'error' ? 'var(--danger)' : 'var(--muted)',
              }}
            >
              {form.message}
            </span>
          </div>
        </form>
      )}
    </>
  );
}
