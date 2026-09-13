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
        <LoginForm next={nextParam ?? null} />
      </div>
    </div>
  );
}
