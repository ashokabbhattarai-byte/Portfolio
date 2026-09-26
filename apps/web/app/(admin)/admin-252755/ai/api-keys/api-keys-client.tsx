'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  IssuedPublisherKey,
  PublisherKey,
  PublisherScope,
  PublisherScopeInfo,
} from '@portfolio/types';
import { adminApi, ApiError } from '@/lib/admin-api';
import { ListControls, usePagedList } from '@/components/admin/paged-list';

/** Scopes that let a key change what the public site shows. Grouped so the
 *  form makes the blast radius of each choice obvious. */
const WRITE_SCOPES: PublisherScope[] = [
  'blog:publish',
  'blog:schedule',
  'blog:unpublish',
  'media:delete',
];

const DEFAULT_SCOPES: PublisherScope[] = [
  'blog:read',
  'blog:create',
  'blog:update',
  'media:read',
  'media:upload',
];

function formatDate(value: string | null): string {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kathmandu',
  });
}

export function ApiKeysClient() {
  const [keys, setKeys] = useState<PublisherKey[]>([]);
  const [scopes, setScopes] = useState<PublisherScopeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [issued, setIssued] = useState<IssuedPublisherKey | null>(null);
  const [creating, setCreating] = useState(false);
  const list = usePagedList(
    'publisher-keys',
    undefined,
    adminApi.publisherKeys.search,
    {},
    'newest',
  );
  const refetchKeys = list.refetch;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [available] = await Promise.all([
        adminApi.publisherKeys.scopes(),
        refetchKeys(),
      ]);
      setScopes(available);
      setError('');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Keys could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }, [refetchKeys]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setKeys(list.rows);
  }, [list.rows]);

  async function revoke(key: PublisherKey) {
    if (
      !window.confirm(
        `Revoke “${key.name}”? Any agent using it stops working immediately. This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await adminApi.publisherKeys.revoke(key.id);
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The key could not be revoked.',
      );
    }
  }

  async function rotate(key: PublisherKey) {
    if (
      !window.confirm(
        `Rotate “${key.name}”? The current key stops working at once and you will be shown a replacement.`,
      )
    ) {
      return;
    }
    try {
      setIssued(await adminApi.publisherKeys.rotate(key.id));
      await refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The key could not be rotated.',
      );
    }
  }

  return (
    <>
      {issued && (
        <RevealDialog issued={issued} onClose={() => setIssued(null)} />
      )}

      <div className="adm-panel">
        <ListControls
          list={list}
          label="API keys"
          sortOptions={['newest', 'oldest']}
        />
        <div className="adm-head-actions" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="adm-btn primary"
            onClick={() => setCreating(true)}
          >
            Create API key
          </button>
        </div>

        {error && (
          <p className="adm-notice bad" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className="adm-rows" aria-hidden="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="adm-row is-skeleton" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="adm-empty">
            <p>
              No API keys yet. Create one to let Claude, ChatGPT or Codex draft
              articles into your portfolio without your admin password.
            </p>
          </div>
        ) : (
          <ul className="adm-rows key-rows">
            {keys.map((key) => (
              <li key={key.id} className="adm-row">
                <div className="adm-row-main">
                  <div className="adm-row-title">
                    <strong>{key.name}</strong>
                    <span className={`key-status is-${key.status}`}>
                      {key.status}
                    </span>
                  </div>
                  <p className="adm-row-meta">
                    <code>pf_live_{key.prefix}…</code> · created{' '}
                    {formatDate(key.createdAt)} · last used{' '}
                    {formatDate(key.lastUsedAt)}
                    {key.expiresAt
                      ? ` · expires ${formatDate(key.expiresAt)}`
                      : ''}
                  </p>
                  <ul className="key-scopes">
                    {key.scopes.map((scope) => (
                      <li
                        key={scope}
                        className={
                          WRITE_SCOPES.includes(scope) ? 'is-write' : undefined
                        }
                      >
                        {scope}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="adm-row-actions">
                  <button
                    type="button"
                    className="adm-btn tiny"
                    onClick={() => void rotate(key)}
                    disabled={key.status === 'revoked'}
                  >
                    Rotate
                  </button>
                  <button
                    type="button"
                    className="adm-btn tiny danger"
                    onClick={() => void revoke(key)}
                    disabled={key.status === 'revoked'}
                  >
                    Revoke
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {creating && (
        <CreateKeyDialog
          scopes={scopes}
          onCancel={() => setCreating(false)}
          onCreated={async (key) => {
            setCreating(false);
            setIssued(key);
            await refresh();
          }}
        />
      )}
    </>
  );
}

/** The key is shown here and nowhere else, ever again. */
function RevealDialog({
  issued,
  onClose,
}: {
  issued: IssuedPublisherKey;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="adm-confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Your new API key"
    >
      <div className="adm-panel key-reveal">
        <h2>Copy your key now</h2>
        <p>
          This is the only time <strong>{issued.name}</strong> will be shown. It
          is stored as a hash. If you lose it, rotate the key to get a new one.
        </p>
        <code className="key-reveal-value">{issued.key}</code>
        <div className="adm-row-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={async () => {
              await navigator.clipboard
                .writeText(issued.key)
                .catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? 'Copied' : 'Copy key'}
          </button>
          <button type="button" className="adm-btn ghost" onClick={onClose}>
            {copied ? 'Done' : 'Close without copying'}
          </button>
        </div>
        <p className="adm-hint">
          Give it to the agent as <code>PORTFOLIO_API_KEY</code>. Treat it like
          a password: anyone holding it has exactly the scopes listed above.
        </p>
      </div>
    </div>
  );
}

function CreateKeyDialog({
  scopes,
  onCancel,
  onCreated,
}: {
  scopes: PublisherScopeInfo[];
  onCancel: () => void;
  onCreated: (key: IssuedPublisherKey) => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<PublisherScope[]>(DEFAULT_SCOPES);
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function toggle(scope: PublisherScope) {
    setSelected((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function submit() {
    if (name.trim().length < 2) {
      setError('Give the key a name so you can recognise it later.');
      return;
    }
    if (selected.length === 0) {
      setError('Select at least one scope.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onCreated(
        await adminApi.publisherKeys.create({
          name: name.trim(),
          scopes: selected,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'The key could not be created.',
      );
      setBusy(false);
    }
  }

  return (
    <div
      className="adm-confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Create an API key"
    >
      <div className="adm-panel key-create">
        <h2>Create an API key</h2>

        <div className="adm-field">
          <label htmlFor="key-name">Name</label>
          <input
            id="key-name"
            value={name}
            maxLength={80}
            placeholder="Claude Desktop"
            onChange={(event) => setName(event.target.value)}
          />
          <p className="adm-hint">Which tool will use this key.</p>
        </div>

        <fieldset className="adm-fieldset key-scope-picker">
          <legend>Scopes</legend>
          <p className="adm-hint">
            Grant the least the tool needs. Without <code>blog:publish</code> an
            agent can draft and edit but can never make a post public, even if
            it asks to.
          </p>
          {scopes.map((info) => (
            <label key={info.scope} className="key-scope-option">
              <input
                type="checkbox"
                checked={selected.includes(info.scope)}
                onChange={() => toggle(info.scope)}
              />
              <span>
                <code
                  className={
                    WRITE_SCOPES.includes(info.scope) ? 'is-write' : undefined
                  }
                >
                  {info.scope}
                </code>
                <small>{info.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="adm-field">
          <label htmlFor="key-expiry">Expires (optional)</label>
          <input
            id="key-expiry"
            type="datetime-local"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />
          <p className="adm-hint">
            Leave blank for a key that does not expire.
          </p>
        </div>

        {error && (
          <p className="adm-notice bad" role="alert">
            {error}
          </p>
        )}

        <div className="adm-row-actions">
          <button
            type="button"
            className="adm-btn primary"
            onClick={() => void submit()}
            disabled={busy}
          >
            {busy ? 'Creating…' : 'Create key'}
          </button>
          <button
            type="button"
            className="adm-btn ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
