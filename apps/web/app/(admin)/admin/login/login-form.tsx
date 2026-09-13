'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ADMIN_HOME, safeNext } from '@/lib/auth';
import { TextField } from '@/components/admin/fields';

export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = next ?? searchParams.get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.text();
        let msg = 'Invalid email or password.';
        try {
          const j = body ? JSON.parse(body) : null;
          if (j?.message)
            msg = Array.isArray(j.message) ? j.message.join('. ') : j.message;
        } catch {
          if (body) msg = body;
        }
        if (res.status === 429) msg = 'Too many attempts. Try again later.';
        setError(msg);
        return;
      }
      const destination = safeNext(nextParam);
      router.push(destination || ADMIN_HOME);
      router.refresh();
    } catch {
      setError('Could not reach the API. Is it running on :4000?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="adm-form" noValidate>
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={setEmail}
        error={undefined}
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        error={undefined}
      />
      {error ? (
        <p role="alert" style={{ color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="adm-btn primary"
        disabled={busy || !email || !password}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="adm-hint">
        Protected by Argon2id, rotating refresh tokens, and SameSite Lax
        httpOnly cookies.
      </p>
    </form>
  );
}
