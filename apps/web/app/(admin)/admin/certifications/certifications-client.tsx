'use client';
import type { PageResult } from '@portfolio/types';
import { ListControls, usePagedList } from '@/components/admin/paged-list';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Certification } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { TextField } from '@/components/admin/fields';
import { useAdminForm } from '@/components/admin/use-admin-form';
type Row = Certification & { updatedAt?: string };
const empty: Omit<Certification, 'id'> = {
  title: '',
  issuer: '',
  date: '',
  url: null,
  position: 0,
};
export function CertificationsClient({
  initial,
}: {
  initial: PageResult<Row>;
}) {
  const router = useRouter();
  const list = usePagedList(
    'certifications',
    initial,
    adminApi.certifications.search,
  );
  const rows = list.rows;
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  async function reload() {
    await list.refetch();
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await adminApi.certifications.remove(id);
      await reload();
      setActionError('');
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Delete failed. Please retry.',
      );
    }
  }
  async function move(id: string, dir: -1 | 1) {
    if (!list.canReorder) return;
    const index = rows.findIndex((row) => row.id === id);
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      await adminApi.certifications.reorder(next.map((row) => row.id));
      await reload();
      setActionError('');
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Reordering failed. Please retry.',
      );
    }
  }
  const form = useAdminForm<Omit<Certification, 'id'>>({
    initial: editing
      ? {
          title: editing.title,
          issuer: editing.issuer,
          date: editing.date,
          url: editing.url,
          position: editing.position,
        }
      : empty,
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.title.trim()) e.title = 'Required';
      if (!v.issuer.trim()) e.issuer = 'Required';
      return e;
    },
    submit: async (v) => {
      const payload = { ...v, url: v.url ? String(v.url) : null };
      if (editing)
        await adminApi.certifications.update(editing.id, payload as never);
      else await adminApi.certifications.create(payload as never);
      setEditing(null);
      setCreating(false);
      await reload();
    },
  });
  const show = !!editing || creating;
  const key = editing ? editing.id : creating ? 'new' : 'none';
  return (
    <>
      <ListControls list={list} label="certifications" />
      {actionError && (
        <p role="alert" className="adm-alert">
          {actionError}
        </p>
      )}
      {!list.canReorder && (
        <p className="adm-hint">
          To reorder, clear search and select Display order with all entries on
          one page. You can also edit an entry’s position.
        </p>
      )}
      <div className="adm-rows">
        {rows.length === 0 ? (
          <div className="adm-row">No certifications.</div>
        ) : null}
        {rows.map((r, i) => (
          <div key={r.id} className="adm-row">
            <div className="adm-move-group">
              <button
                className="adm-move"
                onClick={() => move(r.id, -1)}
                disabled={!list.canReorder || i === 0}
              >
                ↑
              </button>
              <button
                className="adm-move"
                onClick={() => move(r.id, 1)}
                disabled={!list.canReorder || i === rows.length - 1}
              >
                ↓
              </button>
            </div>
            <div className="adm-row-main">
              <div style={{ fontWeight: 500 }}>
                {r.title}{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                  · {r.issuer}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {r.date} {r.url ? `· ${r.url}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="adm-btn tiny"
                onClick={() => {
                  setEditing(r);
                  setCreating(false);
                }}
              >
                Edit
              </button>
              <button
                className="adm-btn tiny danger"
                onClick={() => remove(r.id)}
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
          New certification
        </button>
        {show && (
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
      {show && (
        <form
          key={key}
          ref={form.formRef as never}
          onSubmit={form.onSubmit}
          className="adm-form"
          style={{ marginTop: 18 }}
        >
          <fieldset className="adm-fieldset">
            <legend>Certification</legend>
            <div className="adm-cols">
              <TextField
                id="title"
                label="Title"
                required
                value={form.values.title}
                onChange={(v) => form.set('title', v)}
                error={form.errors.title}
              />
              <TextField
                id="issuer"
                label="Issuer"
                required
                value={form.values.issuer}
                onChange={(v) => form.set('issuer', v)}
                error={form.errors.issuer}
              />
              <TextField
                id="date"
                label="Date"
                value={form.values.date}
                onChange={(v) => form.set('date', v)}
                hint="Feb 2024"
              />
              <TextField
                id="url"
                label="URL"
                type="url"
                value={(form.values.url as string) ?? ''}
                onChange={(v) => form.set('url', (v || null) as never)}
              />
            </div>
          </fieldset>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              type="submit"
              className="adm-btn primary"
              disabled={form.busy}
            >
              {form.busy ? 'Saving…' : editing ? 'Update' : 'Create'}
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
