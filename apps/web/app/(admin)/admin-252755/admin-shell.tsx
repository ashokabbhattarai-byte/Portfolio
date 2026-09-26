'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AuthUser } from '@portfolio/types';
import { LOGIN_PATH } from '@/lib/auth';

const navigationGroups = [
  {
    title: 'Overview',
    items: [
      { href: '/admin-252755', label: 'Dashboard', icon: '📊' },
      { href: '/admin-252755/analytics', label: 'Analytics', icon: '📈' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin-252755/projects', label: 'Projects', icon: '💼' },
      { href: '/admin-252755/blogs', label: 'Blogs', icon: '✍️' },
      { href: '/admin-252755/media', label: 'Media Library', icon: '🖼️' },
    ],
  },
  {
    title: 'AI & Automation',
    items: [
      { href: '/admin-252755/ai/api-keys', label: 'AI Keys', icon: '🔑' },
      { href: '/admin-252755/ai/activity', label: 'Activity Logs', icon: '⚡' },
    ],
  },
  {
    title: 'Profile & Resume',
    items: [
      { href: '/admin-252755/profile', label: 'Profile', icon: '👤' },
      { href: '/admin-252755/experience', label: 'Experience', icon: '🏢' },
      { href: '/admin-252755/skills', label: 'Skills', icon: '⚡' },
      { href: '/admin-252755/education', label: 'Education', icon: '🎓' },
      {
        href: '/admin-252755/certifications',
        label: 'Certifications',
        icon: '📜',
      },
    ],
  },
];

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout(everywhere: boolean) {
    setLoggingOut(true);
    try {
      await fetch(`/api/auth/${everywhere ? 'logout-all' : 'logout'}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Proceed to login even if network fails
    } finally {
      router.push(LOGIN_PATH);
      router.refresh();
    }
  }

  // Generate initials for avatar
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  // Find active section label
  const allItems = navigationGroups.flatMap((g) => g.items);
  const activeItem = allItems.find((item) =>
    item.href === '/admin-252755'
      ? active === '/admin-252755'
      : active.startsWith(item.href),
  ) || { label: 'Admin', icon: '⚙️' };

  return (
    <div className="adm">
      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          className="adm-mobile-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`adm-side ${mobileNavOpen ? 'is-open' : ''}`}
        aria-label="Admin navigation"
      >
        <div className="adm-brand-container">
          <Link
            href="/admin-252755"
            className="adm-brand"
            onClick={() => setMobileNavOpen(false)}
          >
            <span className="mark">AB.</span>
            <div className="adm-brand-text">
              <span className="adm-brand-title">Portfolio CMS</span>
              <span className="adm-brand-badge">Control Center</span>
            </div>
          </Link>
          <button
            type="button"
            className="adm-mobile-close"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <nav className="adm-nav" aria-label="Sections">
          {navigationGroups.map((group) => (
            <div key={group.title} className="adm-nav-group">
              <span className="adm-nav-group-title">{group.title}</span>
              <div className="adm-nav-group-items">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/admin-252755'
                      ? active === '/admin-252755'
                      : active.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`adm-nav-link ${isActive ? 'is-active' : ''}`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <span className="adm-nav-icon">{item.icon}</span>
                      <span className="adm-nav-label">{item.label}</span>
                      {isActive && <span className="adm-nav-indicator" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logged in User Session Card */}
        <div className="adm-side-foot">
          <div className="adm-session-card">
            <div className="adm-session-header">
              <div className="adm-avatar">{initials}</div>
              <div className="adm-who">
                <strong className="adm-who-name">{user.name}</strong>
                <span className="adm-who-email">{user.email}</span>
              </div>
            </div>

            <div className="adm-session-meta">
              <span
                className={`adm-role-badge role-${user.role.toLowerCase()}`}
              >
                {user.role}
              </span>
              <div className="adm-session-status">
                <span className="adm-status-dot pulse" />
                <span>Active Session</span>
              </div>
            </div>

            <div className="adm-session-actions">
              <button
                type="button"
                className="adm-btn adm-btn-logout"
                onClick={() => logout(false)}
                disabled={loggingOut}
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
              <button
                type="button"
                className="adm-btn ghost tiny"
                onClick={() => logout(true)}
                disabled={loggingOut}
                title="Revoke all active refresh sessions"
              >
                Revoke all devices
              </button>
            </div>
          </div>

          <Link
            href="/"
            className="adm-side-link"
            target="_blank"
            rel="noreferrer"
          >
            <span>← View Live Site</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="adm-main-wrap">
        {/* Top Header Bar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button
              type="button"
              className="adm-menu-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation menu"
            >
              <span className="adm-menu-icon">☰</span>
            </button>
            <div className="adm-breadcrumb">
              <Link href="/admin-252755" className="adm-crumb-root">
                CMS
              </Link>
              <span className="adm-crumb-sep">/</span>
              <span className="adm-crumb-current">
                <span className="adm-crumb-icon">{activeItem.icon}</span>
                {activeItem.label}
              </span>
            </div>
          </div>

          <div className="adm-topbar-right">
            <div
              className="adm-live-pill"
              title="Backend API connection is operational"
            >
              <span className="adm-status-dot pulse ok" />
              <span>API Live</span>
            </div>

            <div className="adm-topbar-user">
              <div className="adm-avatar tiny">{initials}</div>
              <span className="adm-topbar-name">{user.name}</span>
              <span
                className={`adm-role-badge tiny role-${user.role.toLowerCase()}`}
              >
                {user.role}
              </span>
            </div>
          </div>
        </header>

        <main className="adm-main" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
