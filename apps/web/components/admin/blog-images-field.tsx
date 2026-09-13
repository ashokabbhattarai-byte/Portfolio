'use client';

import { useState } from 'react';
import type { BlogImage, BlogImagePlacement } from '@portfolio/types';
import { FileUploadField } from './file-upload';
import { SelectField, TextField } from './fields';

const placements: BlogImagePlacement[] = [
  'COVER',
  'HERO',
  'INLINE',
  'GALLERY',
  'THUMBNAIL',
];

type Props = {
  images: Omit<BlogImage, 'id' | 'blogId'>[];
  onChange: (images: Omit<BlogImage, 'id' | 'blogId'>[]) => void;
  slug: string;
};

export function BlogImagesField({ images, onChange, slug }: Props) {
  const [dragOver, setDragOver] = useState<number | null>(null);

  const addImage = (url: string) => {
    onChange([
      ...images,
      {
        url,
        alt: '',
        caption: '',
        placement: 'INLINE' as BlogImagePlacement,
        position: images.length,
      },
    ]);
  };

  const updateImage = (
    idx: number,
    patch: Partial<Omit<BlogImage, 'id' | 'blogId'>>,
  ) => {
    onChange(images.map((img, i) => (i === idx ? { ...img, ...patch } : img)));
  };

  const removeImage = (idx: number) => {
    onChange(
      images
        .filter((_, i) => i !== idx)
        .map((img, i) => ({ ...img, position: i })),
    );
  };

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(idx, 1);
    next.splice(target, 0, moved);
    onChange(next.map((img, i) => ({ ...img, position: i })));
  };

  return (
    <div className="adm-field span-all">
      <label
        style={{ fontSize: 12, letterSpacing: '0.03em', color: 'var(--muted)' }}
      >
        Additional images
        <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--muted)' }}>
          {images.length} image(s)
        </span>
      </label>

      <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
        {images.length === 0 ? (
          <p className="adm-hint">
            Add illustrations or a gallery to support your story.
          </p>
        ) : null}

        {images.map((img, idx) => (
          <div
            key={idx}
            className="adm-panel"
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData('text/plain', String(idx))
            }
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(idx);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (
                Number.isInteger(from) &&
                from >= 0 &&
                from < images.length &&
                from !== idx
              ) {
                const next = [...images];
                const [moved] = next.splice(from, 1);
                next.splice(idx, 0, moved);
                onChange(next.map((im, i) => ({ ...im, position: i })));
              }
            }}
            style={{
              padding: 12,
              display: 'grid',
              gap: 10,
              background: '#fff',
              opacity: dragOver === idx ? 0.7 : 1,
              border:
                dragOver === idx
                  ? '1px dashed var(--accent)'
                  : '1px solid var(--line)',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{ fontSize: 12, color: 'var(--muted)', minWidth: 24 }}
              >
                #{idx + 1}
              </span>
              <span className="adm-role" style={{ fontSize: 10 }}>
                {img.placement}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--muted)',
                  wordBreak: 'break-all',
                  flex: 1,
                }}
              >
                {img.url.slice(0, 80)}…
              </span>
              <button
                type="button"
                className="adm-move"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                className="adm-move"
                onClick={() => move(idx, 1)}
                disabled={idx === images.length - 1}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className="adm-btn tiny danger"
                onClick={() => removeImage(idx)}
              >
                Remove
              </button>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={img.alt ?? ''}
              style={{
                width: '100%',
                maxHeight: 220,
                objectFit: 'cover',
                borderRadius: 8,
                border: '1px solid var(--line)',
              }}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <SelectField
                id={`img-placement-${idx}`}
                label="Placement"
                value={img.placement}
                onChange={(v) =>
                  updateImage(idx, { placement: v as BlogImagePlacement })
                }
                options={placements as unknown as string[]}
              />
              <TextField
                id={`img-alt-${idx}`}
                label="Image description"
                value={img.alt ?? ''}
                onChange={(v) => updateImage(idx, { alt: v })}
                placeholder="Describe the image"
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <TextField
                  id={`img-caption-${idx}`}
                  label="Caption"
                  value={img.caption ?? ''}
                  onChange={(v) => updateImage(idx, { caption: v })}
                  placeholder="Optional caption under the image"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <TextField
                  id={`img-url-${idx}`}
                  label="URL"
                  value={img.url}
                  onChange={(v) => updateImage(idx, { url: v })}
                  hint="Usually set via upload below; you can paste a Supabase public URL"
                />
              </div>
            </div>
          </div>
        ))}

        <div
          className="adm-panel"
          style={{ padding: 12, background: 'var(--sunk)' }}
        >
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 8px' }}>
            Add an image, then choose where it appears.
          </p>
          <FileUploadField
            id="blog-image-upload"
            label="Upload to add"
            value={null}
            onChange={(url) => {
              if (url) addImage(url);
            }}
            folder="blogs"
            slug={slug || 'misc'}
            hint="Choose an optimized image. Add a description and caption after uploading."
          />
          <p className="adm-hint" style={{ marginTop: 8 }}>
            Cover and hero images appear above the article. Inline illustrations
            appear after the text; use a Markdown image link to place one within
            a paragraph. Gallery images appear together below the article.
          </p>
        </div>
      </div>
    </div>
  );
}
