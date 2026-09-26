'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AuditEvent, PageResult } from '@portfolio/types';
import { adminApi, ApiError } from '@/lib/admin-api';

const PAGE_SIZE = 30;

const ACTOR_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  AI_API_KEY: 'AI key',
  SYSTEM: 'System',
};

/** Turns BLOG_PUBLISHED into "Blog published". */
function humanise(action: string): string {
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kathmandu',
  });
}

export function ActivityClient() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [actorType, setActorType] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [result, setResult] = useState<PageResult<AuditEvent> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setResult(
        await adminApi.activity.list({
          page,
          limit: PAGE_SIZE,
          action: action || undefined,
          actorType: actorType || undefined,
        }),
      );
      setError('');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The activity log could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [page, action, actorType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    adminApi.activity
      .actions()
      .then(setActions)
      .catch(() => setActions([]));
  }, []);

  const total = result?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="adm-panel">
      <div className="activity-toolbar">
        <label>
          <span>Action</span>
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {actions.map((value) => (
              <option key={value} value={value}>
                {humanise(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Actor</span>
          <select
            value={actorType}
            onChange={(event) => {
              setActorType(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Everyone</option>
            <option value="ADMIN">Admin</option>
            <option value="AI_API_KEY">AI key</option>
            <option value="SYSTEM">System</option>
          </select>
        </label>
        <p className="adm-hint" role="status">
          {loading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'}`}
        </p>
      </div>

      {error && (
        <p className="adm-notice bad" role="alert">
          {error}
        </p>
      )}

      {loading && !result ? (
        <div className="adm-rows" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="adm-row is-skeleton" />
          ))}
        </div>
      ) : !result || result.items.length === 0 ? (
        <div className="adm-empty">
          <p>
            Nothing recorded yet. Publishing, scheduling, uploads and key
            changes all appear here.
          </p>
        </div>
      ) : (
        <ul className="activity-list">
          {result.items.map((event) => (
            <li
              key={event.id}
              className={`activity-item${event.success ? '' : ' is-failed'}`}
            >
              <div className="activity-main">
                <strong>{humanise(event.action)}</strong>
                <span className={`activity-actor is-${event.actorType}`}>
                  {ACTOR_LABEL[event.actorType] ?? event.actorType}
                  {event.apiKey ? ` · ${event.apiKey.name}` : ''}
                </span>
                {!event.success && (
                  <span className="activity-failed">failed</span>
                )}
              </div>
              <p className="activity-meta">
                {event.resourceType.toLowerCase()}
                {event.resourceId ? ` ${event.resourceId}` : ''} ·{' '}
                {formatDate(event.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="media-pager" aria-label="Activity pages">
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
  );
}
