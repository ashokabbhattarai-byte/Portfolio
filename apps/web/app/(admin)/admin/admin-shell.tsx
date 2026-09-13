'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthUser } from '@portfolio/types';
import { adminSections, LOGIN_PATH } from '@/lib/auth';

export function AdminShell({
  user,
  current,
  children,
}: {
  user: AuthUser;
  current: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = current ?? pathname;

  async function logout(everywhere: boolean) {
    await fetch(`/api/auth/${everywhere ? 'logout-all' : 'logout'}`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    router.push(LOGIN_PATH);
    router.refresh();
  }

  return (
    <div className="adm">
      <aside className="adm-side" aria-label="Admin navigation">
        <div className="adm-brand">
          <span className="mark">AB.</span>
          <span>Portfolio CMS</span>
        </div>

        <nav className="adm-nav" aria-label="Sections">
          {adminSections.map((s) => {
            const isActive =
              s.href === '/admin'
                ? active === '/admin'
                : active.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{s.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="adm-side-foot">
          <div className="adm-who">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            <span className="adm-role">{user.role}</span>
          </div>
          <button
            type="button"
            className="adm-btn"
            onClick={() => logout(false)}
          >
            Sign out
          </button>
          <button
            type="button"
            className="adm-btn ghost"
            onClick={() => logout(true)}
          >
            Sign out everywhere
          </button>
          <Link href="/" className="adm-side-link">
            ← Back to portfolio
          </Link>
        </div>
      </aside>

      <main className="adm-main" id="main">
        {children}
      </main>
    </div>
  );
}
