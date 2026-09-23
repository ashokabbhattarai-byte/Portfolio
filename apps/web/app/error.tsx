'use client';
import Link from 'next/link';
import { useTransition } from 'react';
export default function ErrorPage({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main
      id="main"
      tabIndex={-1}
      className="inner-page section-shell not-found"
    >
      <p className="section-label">Something went wrong</p>
      <h1>
        This page didn’t
        <br />
        load as expected.
      </h1>
      <p>
        A temporary error interrupted the request. Trying again usually resolves
        it.
      </p>
      <button
        className="pill"
        disabled={pending}
        onClick={() => startTransition(retry)}
      >
        {pending ? 'Retrying…' : 'Try again'} <span aria-hidden="true">↗</span>
      </button>
      <Link className="text-link" href="/">
        Back to home
      </Link>
    </main>
  );
}
