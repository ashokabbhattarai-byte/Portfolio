'use client';

import type { Profile } from '@portfolio/types';
import { adminApi } from '@/lib/admin-api';
import { TextAreaField, TextField } from '@/components/admin/fields';
import { FileUploadField } from '@/components/admin/file-upload';
import { useAdminForm } from '@/components/admin/use-admin-form';
import { useRouter } from 'next/navigation';

export function ProfileClient({ initial }: { initial: Profile }) {
  const router = useRouter();
  const form = useAdminForm<Profile>({
    initial,
    validate: (v) => {
      const e: Record<string, string> = {};
      if (!v.name.trim()) e.name = 'Required';
      if (!v.email.includes('@')) e.email = 'Valid email required';
      if (!v.github.trim()) e.github = 'Required';
      if (!v.description.trim()) e.description = 'Required';
      return e;
    },
    submit: async (values) => {
      await adminApi.profile.update(values);
      router.refresh();
    },
  });

  return (
    <form
      ref={form.formRef as never}
      onSubmit={form.onSubmit}
      className="adm-form"
    >
      <fieldset className="adm-fieldset">
        <legend>Identity</legend>
        <div className="adm-cols">
          <TextField
            id="name"
            label="Name"
            required
            value={form.values.name}
            onChange={(v) => form.set('name', v)}
            error={form.errors.name}
          />
          <TextField
            id="role"
            label="Role"
            required
            value={form.values.role}
            onChange={(v) => form.set('role', v)}
          />
          <TextField
            id="location"
            label="Location"
            required
            value={form.values.location}
            onChange={(v) => form.set('location', v)}
          />
          <TextField
            id="email"
            label="Email"
            required
            type="email"
            value={form.values.email}
            onChange={(v) => form.set('email', v)}
            error={form.errors.email}
          />
          <TextField
            id="github"
            label="GitHub URL"
            required
            type="url"
            value={form.values.github}
            onChange={(v) => form.set('github', v)}
            error={form.errors.github}
          />
          <TextField
            id="linkedin"
            label="LinkedIn URL"
            type="url"
            value={(form.values.linkedin as string) ?? ''}
            onChange={(v) => form.set('linkedin', (v || null) as never)}
          />
          <div
            className="adm-field span-all"
            style={{
              border: '1px solid var(--line)',
              background: '#fff',
              padding: 16,
              display: 'grid',
              gap: 12,
            }}
          >
            <label
              style={{
                fontSize: 12,
                letterSpacing: '0.03em',
                color: 'var(--muted)',
              }}
            >
              Resume (PDF), premium
            </label>
            {form.values.resume ? (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  padding: 12,
                  background: 'var(--sunk)',
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--ink)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 16,
                  }}
                >
                  PDF
                </span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      wordBreak: 'break-all',
                    }}
                  >
                    {form.values.resume}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Current resume will be used for “View résumé” and “Download
                    PDF” links site-wide.
                  </div>
                </div>
                <a
                  href={form.values.resume}
                  target="_blank"
                  rel="noreferrer"
                  className="adm-btn tiny"
                  style={{ textDecoration: 'none' }}
                >
                  View ↗
                </a>
                <a
                  href={form.values.resume}
                  download
                  className="adm-btn tiny ghost"
                >
                  Download
                </a>
              </div>
            ) : (
              <p className="adm-hint">No resume set. Upload a PDF below.</p>
            )}
            <FileUploadField
              id="resume"
              label="Upload new resume"
              value={null}
              onChange={(v) => {
                if (v) form.set('resume', v);
              }}
              folder="profile"
              slug="resume"
              accept="application/pdf"
              hint="PDF up to 8 MiB. Stored in portfolio-storage/profile/resume/, edge-cached, instant site-wide."
            />
            <TextField
              id="resume-manual"
              label="Or paste resume URL"
              value={form.values.resume}
              onChange={(v) => form.set('resume', v)}
              hint="Supabase public URL or /assets/..., upload above will overwrite this field"
              placeholder="https://.../resume.pdf or /assets/ashok-bhattarai-resume.pdf"
            />
          </div>
          <TextField
            id="languages"
            label="Languages"
            value={form.values.languages}
            onChange={(v) => form.set('languages', v)}
            span
          />
          <TextAreaField
            id="description"
            label="Description"
            required
            rows={5}
            value={form.values.description}
            onChange={(v) => form.set('description', v)}
            error={form.errors.description}
            span
          />
        </div>
      </fieldset>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" className="adm-btn primary" disabled={form.busy}>
          {form.busy ? 'Saving…' : 'Save profile'}
        </button>
        <span
          style={{
            color: form.status === 'error' ? 'var(--danger)' : 'var(--muted)',
            fontSize: 13,
          }}
        >
          {form.message}
        </span>
      </div>
    </form>
  );
}
