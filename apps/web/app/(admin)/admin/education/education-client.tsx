'use client';
import type { PageResult } from '@portfolio/types';
import { ListControls, usePagedList } from '@/components/admin/paged-list';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Education } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { ListField, TextField } from '@/components/admin/fields';
import { useAdminForm } from '@/components/admin/use-admin-form';
type Row = Education & { updatedAt?: string };
const empty: Omit<Education, 'id'> = {
  school: '',
  award: '',
  dates: '',
  notes: [],
  position: 0,
};
export function EducationClient({ initial }: { initial: PageResult<Row> }) {
  const router = useRouter();
  const list = usePagedList('education', initial, adminApi.education.search);
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
      await adminApi.education.remove(id);
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
      await adminApi.education.reorder(next.map((row) => row.id));
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
  const form = useAdminForm<Omit<Education, 'id'>>({
    initial: editing
      ? {
          school: editing.school,
          award: editing.award,
          dates: editing.dates,
          notes: editing.notes,
          position: editing.position,
        }
      : empty,
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.school.trim()) e.school = 'Required';
      if (!v.award.trim()) e.award = 'Required';
      return e;
    },
    submit: async (v) => {
      if (editing) await adminApi.education.update(editing.id, v);
      else await adminApi.education.create(v);
      setEditing(null);
      setCreating(false);
      await reload();
    },
  });
  const show = !!editing || creating;
  const key = editing ? editing.id : creating ? 'new' : 'none';
  return (
    <>
      <ListControls list={list} label="education" />
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
          <div className="adm-row">No education.</div>
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
                {r.school}{' '}
                <span style={{ color: 'var(--muted)', fontWeight: 400 }}>
                  · {r.award}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {r.dates} {r.notes.length ? `· ${r.notes.join(' · ')}` : ''}
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
          New education
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
            <legend>Education</legend>
            <div className="adm-cols">
              <TextField
                id="school"
                label="School"
                required
                value={form.values.school}
                onChange={(v) => form.set('school', v)}
                error={form.errors.school}
              />
              <TextField
                id="award"
                label="Award"
                required
                value={form.values.award}
                onChange={(v) => form.set('award', v)}
                error={form.errors.award}
              />
              <TextField
                id="dates"
                label="Dates"
                value={form.values.dates}
                onChange={(v) => form.set('dates', v)}
                hint="Jul 2026"
              />
              <ListField
                id="notes"
                label="Notes"
                values={form.values.notes}
                onChange={(v) => form.set('notes', v as never)}
                itemLabel="Note"
                placeholder="GPA 3.6"
                span
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
