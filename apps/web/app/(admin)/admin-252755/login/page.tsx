import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/lib/auth';
import { getSignedInUser } from '@/lib/admin-server';
import { LoginForm } from './login-form';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const { next: nextParam } = (await searchParams) ?? {};
  /* Already signed in? Skip the form and go straight to the dashboard.
     getSignedInUser throws when the API itself is down rather than merely
     unauthenticated — in that case still render the form instead of a wall.
     NOTE: redirect() works by throwing, so it must stay OUTSIDE the
     try/catch or the redirect itself gets swallowed. */
  let signedIn = false;
  try {
    const me = await getSignedInUser();
    signedIn = me.ok;
  } catch {
    signedIn = false;
  }
  if (signedIn) redirect(ADMIN_HOME);
  return (
    <div
      className="adm"
      style={{ placeItems: 'center', gridTemplateColumns: '1fr' }}
    >
      <div
        className="adm-panel"
        style={{ maxWidth: 420, width: '100%', margin: '8vh auto' }}
      >
        <p className="adm-eyebrow">Portfolio CMS</p>
        <h1 style={{ marginBottom: 6 }}>Sign in</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 18 }}>
          The admin is protected with httpOnly cookies. Credentials never touch
          localStorage.
        </p>
        {/* Suspense boundary required: LoginForm reads useSearchParams(),
            which needs a client-rendered boundary so the route can prerender
            instead of hanging the dev badge on "Rendering…". */}
        <Suspense
          fallback={
            <div className="adm-form" aria-hidden="true">
              <div
                style={{
                  height: 42,
                  borderRadius: 8,
                  background: 'rgba(12,33,60,0.08)',
                }}
              />
              <div
                style={{
                  height: 42,
                  borderRadius: 8,
                  background: 'rgba(12,33,60,0.08)',
                }}
              />
            </div>
          }
        >
          <LoginForm next={nextParam ?? null} />
        </Suspense>
      </div>
    </div>
  );
}
