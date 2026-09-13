'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaAsset } from '@portfolio/types';
import { adminApi, ApiError } from '@/lib/admin-api';

/** Bytes as something a person reads at a glance. */
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadState = { busy: boolean; error: string };

/**
 * The shared upload surface: drag-and-drop, file picker, or URL import.
 * Used standalone on /admin/media and embedded in the blog editor's picker,
 * so both routes get identical validation and error text.
 */
export function MediaUploader({
  onUploaded,
  compact = false,
}: {
  onUploaded: (asset: MediaAsset) => void;
  compact?: boolean;
}) {
  const [state, setState] = useState<UploadState>({ busy: false, error: '' });
  const [dragging, setDragging] = useState(false);
  const [url, setUrl] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const send = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setState({ busy: true, error: '' });
      try {
        /* Sequential rather than parallel: the API re-encodes every image with
           sharp and caps concurrency, so firing ten at once just produces
           RATE_LIMIT_EXCEEDED for most of them. */
        for (const file of list) {
          onUploaded(await adminApi.media.upload(file));
        }
        setState({ busy: false, error: '' });
      } catch (error) {
        setState({
          busy: false,
          error:
            error instanceof ApiError
              ? error.message
              : 'The upload failed. Try again.',
        });
      }
    },
    [onUploaded],
  );

  async function importUrl() {
    if (!url.trim()) return;
    setState({ busy: true, error: '' });
    try {
      onUploaded(await adminApi.media.importUrl({ url: url.trim() }));
      setUrl('');
      setState({ busy: false, error: '' });
    } catch (error) {
      setState({
        busy: false,
        error:
          error instanceof ApiError
            ? error.message
            : 'That image could not be imported.',
      });
    }
  }

  return (
    <div className="media-uploader">
      <div
        className={`media-drop${dragging ? ' is-dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void send(event.dataTransfer.files);
        }}
      >
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          hidden
          onChange={(event) => {
            if (event.target.files) void send(event.target.files);
            event.target.value = '';
          }}
        />
        <p>
          <button
            type="button"
            className="adm-btn"
            onClick={() => input.current?.click()}
            disabled={state.busy}
          >
            {state.busy ? 'Uploading…' : 'Choose images'}
          </button>
        </p>
        <p className="adm-hint">
          Drop PNG, JPEG, WebP or AVIF here — up to 8 MB each. Every image is
          re-encoded to WebP and stripped of metadata on upload.
        </p>
      </div>

      {!compact && (
        <div className="media-import">
          <label htmlFor="media-import-url">Or import from a URL</label>
          <div className="media-import-row">
            <input
              id="media-import-url"
              type="url"
              value={url}
              placeholder="https://example.com/diagram.png"
              onChange={(event) => setUrl(event.target.value)}
              disabled={state.busy}
            />
            <button
              type="button"
              className="adm-btn"
              onClick={() => void importUrl()}
              disabled={state.busy || !url.trim()}
            >
              Import
            </button>
          </div>
          <p className="adm-hint">
            The image is downloaded and stored in your own library, so it keeps
            working if the original moves.
          </p>
        </div>
      )}

      {state.error && (
        <p className="adm-notice bad" role="alert">
          {state.error}
        </p>
      )}
    </div>
  );
}

/** Grid of assets. `onSelect` turns a tile into a button; without it the grid
 *  is presentational and the caller supplies its own actions. */
export function MediaGrid({
  assets,
  selectedId,
  onSelect,
  renderActions,
}: {
  assets: MediaAsset[];
  selectedId?: string | null;
  onSelect?: (asset: MediaAsset) => void;
  renderActions?: (asset: MediaAsset) => React.ReactNode;
}) {
  return (
    <ul className="media-grid">
      {assets.map((asset) => {
        const body = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.alt || asset.originalFilename} />
            <span className="media-tile-name">{asset.originalFilename}</span>
            <span className="media-tile-meta">
              {asset.width}×{asset.height} · {formatBytes(asset.size)}
              {asset.used ? ' · in use' : ''}
            </span>
          </>
        );
        return (
          <li
            key={asset.id}
            className={`media-tile${selectedId === asset.id ? ' is-selected' : ''}`}
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(asset)}
                aria-pressed={selectedId === asset.id}
              >
                {body}
              </button>
            ) : (
              <div className="media-tile-body">{body}</div>
            )}
            {renderActions ? (
              <div className="media-tile-actions">{renderActions(asset)}</div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Modal picker used by the blog editor to fill the featured / OG / inline
 * slots. Loads the library lazily so opening the editor does not fetch it.
 */
export function MediaPickerDialog({
  open,
  title,
  selectedId,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  selectedId?: string | null;
  onPick: (asset: MediaAsset | null) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError('');
    try {
      const page = await adminApi.media.list({ limit: 60, search: term });
      setAssets(page.items);
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

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      void load('');
    }
    if (!open && node.open) node.close();
  }, [open, load]);

  return (
    <dialog
      ref={dialog}
      className="media-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="media-dialog-head">
        <h2>{title}</h2>
        <button type="button" className="adm-btn ghost" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="media-dialog-body">
        <MediaUploader
          compact
          onUploaded={(asset) => setAssets((prev) => [asset, ...prev])}
        />

        <label className="media-dialog-search">
          <span className="sr-only">Search images</span>
          <input
            type="search"
            value={search}
            placeholder="Search by filename, alt text or caption"
            onChange={(event) => {
              setSearch(event.target.value);
              void load(event.target.value);
            }}
          />
        </label>

        {error && (
          <p className="adm-notice bad" role="alert">
            {error}
          </p>
        )}
        {loading && assets.length === 0 ? (
          <ul className="media-grid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="media-tile is-skeleton" />
            ))}
          </ul>
        ) : assets.length === 0 ? (
          <p className="adm-empty">
            No images yet. Upload one above, or import it from a URL on the
            media page.
          </p>
        ) : (
          <MediaGrid
            assets={assets}
            selectedId={selectedId}
            onSelect={(asset) => {
              onPick(asset);
              onClose();
            }}
          />
        )}
      </div>

      <footer className="media-dialog-foot">
        <button
          type="button"
          className="adm-btn ghost"
          onClick={() => {
            onPick(null);
            onClose();
          }}
        >
          Clear selection
        </button>
      </footer>
    </dialog>
  );
}
