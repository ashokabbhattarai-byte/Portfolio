'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MediaAsset, PageResult } from '@portfolio/types';
import { adminApi, ApiError } from '@/lib/admin-api';
import {
  formatBytes,
  MediaGrid,
  MediaUploader,
} from '@/components/admin/media-picker';

const PAGE_SIZE = 24;

export function MediaClient() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<PageResult<MediaAsset> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<MediaAsset | null>(null);

  const load = useCallback(async (nextPage: number, term: string) => {
    setLoading(true);
    setError('');
    try {
      setResult(
        await adminApi.media.list({
          page: nextPage,
          limit: PAGE_SIZE,
          search: term,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The media library could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* Debounced so typing in the search box does not fire a request per key. */
  useEffect(() => {
    const timer = setTimeout(() => void load(page, search), 250);
    return () => clearTimeout(timer);
  }, [page, search, load]);

  async function remove(asset: MediaAsset) {
    if (
      !window.confirm(
        `Delete “${asset.originalFilename}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await adminApi.media.remove(asset.id);
      setNotice(`Deleted ${asset.originalFilename}.`);
      void load(page, search);
    } catch (caught) {
      /* MEDIA_IN_USE is the common case and is not a failure of the UI — the
         message names what to do, so it is shown as-is. */
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The image could not be deleted.',
      );
    }
  }

  async function saveMeta(asset: MediaAsset, alt: string, caption: string) {
    try {
      await adminApi.media.update(asset.id, { alt, caption });
      setEditing(null);
      setNotice(`Updated ${asset.originalFilename}.`);
      void load(page, search);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The image could not be updated.',
      );
    }
  }

  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <MediaUploader
        onUploaded={(asset) => {
          setNotice(`Uploaded ${asset.originalFilename}.`);
          void load(1, search);
          setPage(1);
        }}
      />

      <div className="adm-panel">
        <div className="media-toolbar">
          <label>
            <span className="sr-only">Search images</span>
            <input
              type="search"
              value={search}
              placeholder="Search by filename, alt text or caption"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <p className="adm-hint" role="status">
            {loading
              ? 'Loading…'
              : `${total} image${total === 1 ? '' : 's'}${
                  search ? ` matching “${search}”` : ''
                }`}
          </p>
        </div>

        {error && (
          <p className="adm-notice bad" role="alert">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="adm-notice ok" role="status">
            {notice}
          </p>
        )}

        {loading && !result ? (
          <ul className="media-grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="media-tile is-skeleton" />
            ))}
          </ul>
        ) : !result || result.items.length === 0 ? (
          <div className="adm-empty">
            <p>
              {search
                ? 'No images match that search.'
                : 'No images yet. Upload one above, or import it from a URL.'}
            </p>
          </div>
        ) : (
          <MediaGrid
            assets={result.items}
            renderActions={(asset) => (
              <>
                <button
                  type="button"
                  className="adm-btn tiny"
                  onClick={() => setEditing(asset)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="adm-btn tiny danger"
                  onClick={() => void remove(asset)}
                  disabled={asset.used}
                  title={
                    asset.used
                      ? 'In use by an article — remove the reference first.'
                      : undefined
                  }
                >
                  Delete
                </button>
              </>
            )}
          />
        )}

        {pages > 1 && (
          <nav className="media-pager" aria-label="Media pages">
            <button
              type="button"
              className="adm-btn ghost"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {pages}
            </span>
            <button
              type="button"
              className="adm-btn ghost"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
            >
              Next
            </button>
          </nav>
        )}
      </div>

      {editing && (
        <MetadataDialog
          asset={editing}
          onCancel={() => setEditing(null)}
          onSave={saveMeta}
        />
      )}
    </>
  );
}

function MetadataDialog({
  asset,
  onCancel,
  onSave,
}: {
  asset: MediaAsset;
  onCancel: () => void;
  onSave: (asset: MediaAsset, alt: string, caption: string) => void;
}) {
  const [alt, setAlt] = useState(asset.alt);
  const [caption, setCaption] = useState(asset.caption);

  return (
    <div
      className="adm-confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Image details"
    >
      <div className="adm-panel media-meta-dialog">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.url} alt={asset.alt || asset.originalFilename} />
        <dl className="media-meta-facts">
          <div>
            <dt>File</dt>
            <dd>{asset.originalFilename}</dd>
          </div>
          <div>
            <dt>Dimensions</dt>
            <dd>
              {asset.width}×{asset.height} · {formatBytes(asset.size)}
            </dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{asset.source.replace(/_/g, ' ').toLowerCase()}</dd>
          </div>
          {asset.prompt ? (
            <div>
              <dt>{asset.generatedByAI ? 'Prompt' : 'Origin'}</dt>
              <dd className="media-meta-origin">{asset.prompt}</dd>
            </div>
          ) : null}
        </dl>

        <div className="adm-field">
          <label htmlFor="media-alt">Alt text</label>
          <input
            id="media-alt"
            value={alt}
            maxLength={200}
            onChange={(event) => setAlt(event.target.value)}
          />
          <p className="adm-hint">
            Describe what the image shows. Screen readers and search engines
            both read this.
          </p>
        </div>
        <div className="adm-field">
          <label htmlFor="media-caption">Caption</label>
          <input
            id="media-caption"
            value={caption}
            maxLength={500}
            onChange={(event) => setCaption(event.target.value)}
          />
        </div>

        <div className="adm-row-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={() => onSave(asset, alt, caption)}
          >
            Save details
          </button>
          <button type="button" className="adm-btn ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
