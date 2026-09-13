'use client';
import Link from 'next/link';
import { useTransition } from 'react';

export default function AdminError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <main
      className="adm"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '70vh',
        padding: 24,
      }}
    >
      <section
        className="adm-panel"
        style={{ maxWidth: 520, width: '100%' }}
        aria-labelledby="admin-error-title"
      >
        <h1 id="admin-error-title">Admin temporarily unavailable</h1>
        <p style={{ marginBlock: 20 }}>
          We couldn’t load this page. Try again shortly. This error has not
          signed you out or deleted your saved articles.
        </p>
        <button
          className="adm-btn primary"
          disabled={pending}
          onClick={() => startTransition(retry)}
        >
          {pending ? 'Retrying…' : 'Try again'}
        </button>
        <Link href="/" className="adm-btn ghost" style={{ marginLeft: 12 }}>
          Back to portfolio
        </Link>
      </section>
    </main>
  );
}
