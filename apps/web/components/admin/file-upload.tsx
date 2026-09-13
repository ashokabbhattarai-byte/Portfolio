'use client';

import { useRef, useState } from 'react';
import {
  directUpload,
  usePresign,
  useStorageUpload,
} from '@/lib/query/storage';

type Props = {
  id: string;
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  folder:
    | 'projects'
    | 'blogs'
    | 'profile'
    | 'certifications'
    | 'education'
    | 'experience'
    | 'skills'
    | 'misc';
  slug?: string;
  accept?: string;
  hint?: string;
  disabled?: boolean;
};

export function FileUploadField({
  id,
  label,
  value,
  onChange,
  folder,
  slug,
  accept = 'image/webp,image/jpeg,image/png,image/avif,application/pdf',
  hint,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const presign = usePresign();
  const upload = useStorageUpload();
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (disabled) return;
    setStatus('Uploading…');
    try {
      // Try presigned direct upload first (zero backend egress)
      try {
        const sig = await presign.mutateAsync({
          folder,
          filename: file.name,
          slug,
          contentType: file.type || 'application/octet-stream',
        });
        const url = await directUpload(sig, file);
        onChange(url);
        setStatus('Uploaded ✓');
        return;
      } catch (e) {
        // Fallback to proxy upload
        const fallback = e instanceof Error ? e.message : String(e);
        // If presign fails because storage not configured, surface gracefully
        if (fallback.includes('Storage not configured')) throw e;
      }

      const result = await upload.mutateAsync({ file, folder, slug });
      onChange(result.publicUrl);
      setStatus('Uploaded ✓');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setTimeout(() => setStatus(null), 3000);
    }
  }

  return (
    <div className={`adm-field${dragOver ? ' drag' : ''}`}>
      <label htmlFor={id}>{label}</label>

      {value ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--muted)',
              wordBreak: 'break-all',
              flex: 1,
            }}
          >
            {value}
          </span>
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="adm-btn tiny"
            style={{ textDecoration: 'none' }}
          >
            Open
          </a>
          <button
            type="button"
            className="adm-btn tiny ghost"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Clear
          </button>
        </div>
      ) : null}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        style={{
          border: `1px dashed ${dragOver ? 'var(--accent)' : 'var(--line)'}`,
          background: dragOver ? 'var(--sunk)' : 'var(--field)',
          padding: 12,
          display: 'grid',
          gap: 8,
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.currentTarget.value = '';
          }}
        />
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="adm-btn"
            disabled={disabled || presign.isPending || upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {presign.isPending || upload.isPending
              ? 'Uploading…'
              : 'Choose file'}
          </button>
          <span className="adm-hint">or drag &amp; drop here</span>
        </div>

        {status ? (
          <span
            style={{
              fontSize: 12,
              color: status.includes('✓')
                ? 'var(--ok)'
                : status.includes('Uploading')
                  ? 'var(--muted)'
                  : 'var(--danger)',
            }}
          >
            {status}
          </span>
        ) : null}
        {hint ? <span className="adm-hint">{hint}</span> : null}
      </div>
    </div>
  );
}
