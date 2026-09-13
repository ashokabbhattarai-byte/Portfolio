'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Skill } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { TextAreaField, TextField } from '@/components/admin/fields';
import { useAdminForm } from '@/components/admin/use-admin-form';
type Row = Skill & { updatedAt?: string };
const empty: Omit<Skill, 'id'> = { name: '', items: '', position: 0 };
export function SkillsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  async function reload() {
    const f = await adminApi.skills.list();
    setRows(f as Row[]);
    router.refresh();
  }
  async function remove(id: string) {
    if (!confirm('Delete?')) return;
    await adminApi.skills.remove(id);
    await reload();
  }
  async function move(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    const t = idx + dir;
    if (t < 0 || t >= rows.length) return;
    const next = [...rows];
    const [m] = next.splice(idx, 1);
    next.splice(t, 0, m);
    setRows(next);
    await adminApi.skills.reorder(next.map((r) => r.id));
    await reload();
  }
  const form = useAdminForm<Omit<Skill, 'id'>>({
    initial: editing
      ? { name: editing.name, items: editing.items, position: editing.position }
      : empty,
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.name.trim()) e.name = 'Required';
      if (!v.items.trim()) e.items = 'Required';
      return e;
    },
    submit: async (v) => {
      if (editing) await adminApi.skills.update(editing.id, v);
      else await adminApi.skills.create(v);
      setEditing(null);
      setCreating(false);
      await reload();
    },
  });
  const show = !!editing || creating;
  const key = editing ? editing.id : creating ? 'new' : 'none';
  return (
    <>
      <div className="adm-rows">
        {rows.length === 0 ? <div className="adm-row">No skills.</div> : null}
        {rows.map((r, i) => (
          <div key={r.id} className="adm-row">
            <div className="adm-move-group">
              <button
                className="adm-move"
                onClick={() => move(r.id, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                className="adm-move"
                onClick={() => move(r.id, 1)}
                disabled={i === rows.length - 1}
              >
                ↓
              </button>
            </div>
            <div className="adm-row-main">
              <div style={{ fontWeight: 500 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {r.items}
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
          New skill
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
            <legend>Skill</legend>
            <div className="adm-cols">
              <TextField
                id="name"
                label="Name"
                required
                value={form.values.name}
                onChange={(v) => form.set('name', v)}
                error={form.errors.name}
              />
              <TextAreaField
                id="items"
                label="Items"
                required
                value={form.values.items}
                onChange={(v) => form.set('items', v)}
                error={form.errors.items}
                hint="Comma-separated list"
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
