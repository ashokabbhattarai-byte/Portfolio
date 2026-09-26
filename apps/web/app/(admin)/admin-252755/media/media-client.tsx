'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaAsset, MediaUsageRef, PageResult } from '@portfolio/types';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [blockedRefs, setBlockedRefs] = useState<MediaUsageRef[] | null>(null);
  const copyTimer = useRef<number | null>(null);

  /* Copies the public URL so it can be pasted straight into article content.
     Falls back to a temporary textarea where the async clipboard API is
     unavailable (older browsers, non-secure contexts). */
  async function copyText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through to the legacy path */
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }

  async function copyLink(asset: MediaAsset) {
    if (await copyText(asset.url)) {
      setCopiedId(asset.id);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedId(null), 1600);
    } else {
      setError('The link could not be copied. Select the URL manually.');
    }
  }

  const load = useCallback(async (nextPage: number, term: string) => {
    setLoading(true);
    setError('');
    setBlockedRefs(null);
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
      setBlockedRefs(null);
      void load(page, search);
    } catch (caught) {
      /* A 409 means articles still reference the asset. Name them with links
         so delete becomes a two-click job instead of a dead end. */
      if (caught instanceof ApiError && caught.status === 409) {
        try {
          const refs = await adminApi.media.usage(asset.id);
          setBlockedRefs(refs.articles);
          setError(
            `“${asset.originalFilename}” is used by ${
              refs.articles.length === 1
                ? '1 article'
                : `${refs.articles.length} articles`
            }. Remove it there first, then delete it here.`,
          );
          return;
        } catch {
          /* Fall through to the generic API message. */
        }
      }
      setBlockedRefs(null);
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
      <style>{`.media-url-row{display:flex;gap:8px;align-items:stretch}
.media-url-row input{flex:1;min-width:0;font-family:ui-monospace,monospace;font-size:12px;}
.adm-usage-links{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px;}
.adm-usage-links a{display:inline-flex;align-items:center;min-height:44px;color:var(--accent,color-mix(in srgb, var(--accent) 60%, transparent));}
.adm-usage-links a:hover{text-decoration:underline;text-underline-offset:4px;}
#media-usage-label{font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);}`}</style>
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
        {blockedRefs && blockedRefs.length > 0 && (
          <ul
            className="adm-usage-links"
            aria-label="Articles using this image"
          >
            {blockedRefs.map((ref) => (
              <li key={ref.id}>
                <Link href={`/admin-252755/blogs/${ref.id}/edit`}>
                  {ref.title}
                </Link>
              </li>
            ))}
          </ul>
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
                  onClick={() => void copyLink(asset)}
                  aria-live="polite"
                >
                  {copiedId === asset.id ? 'Copied' : 'Copy link'}
                </button>
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
                      ? 'In use by an article, remove the reference first.'
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
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<MediaUsageRef[] | null>(null);

  /* Load referencing articles lazily: only the dialog needs names, and only
     for assets the list already flags as used. */
  useEffect(() => {
    let live = true;
    setUsage(null);
    if (!asset.used) return;
    adminApi.media
      .usage(asset.id)
      .then((refs) => {
        if (live) setUsage(refs.articles);
      })
      .catch(() => {
        if (live) setUsage([]);
      });
    return () => {
      live = false;
    };
  }, [asset.id, asset.used]);

  async function copyUrl() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(asset.url);
      } else {
        const area = document.createElement('textarea');
        area.value = asset.url;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Selection fallback: focus the field so the URL can be copied by hand. */
      document.getElementById('media-url')?.focus();
    }
  }

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
          <label htmlFor="media-url">Public URL</label>
          <div className="media-url-row">
            <input
              id="media-url"
              readOnly
              value={asset.url}
              onFocus={(event) => event.target.select()}
            />
            <button
              type="button"
              className="adm-btn"
              onClick={() => void copyUrl()}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="adm-hint">
            Paste this link anywhere an article needs the image.
          </p>
        </div>

        {asset.used ? (
          <div className="adm-field">
            <span id="media-usage-label">Used in</span>
            {usage === null ? (
              <p className="adm-hint">Checking references…</p>
            ) : usage.length === 0 ? (
              <p className="adm-hint">
                No references found. The image can be deleted.
              </p>
            ) : (
              <ul
                className="adm-usage-links"
                aria-labelledby="media-usage-label"
              >
                {usage.map((ref) => (
                  <li key={ref.id}>
                    <Link href={`/admin-252755/blogs/${ref.id}/edit`}>
                      {ref.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

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
