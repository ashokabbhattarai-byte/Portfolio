import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminStats, getSignedInUser } from '@/lib/admin-server';
import { loginUrl } from '@/lib/auth';
import { AdminShell } from './admin-shell';

export default async function AdminDashboard() {
  const [me, statsRes] = await Promise.all([
    getSignedInUser(),
    getAdminStats(),
  ]);

  if (!me.ok) redirect(loginUrl('/admin-252755'));

  const data = statsRes.ok ? statsRes.data : null;

  const stats = [
    {
      label: 'Projects',
      count: data ? data.projects : '—',
      href: '/admin-252755/projects',
      icon: '💼',
      hint: 'Case studies & works',
    },
    {
      label: 'Blogs',
      count: data ? data.blogs : '—',
      href: '/admin-252755/blogs',
      icon: '✍️',
      hint: 'Articles & notes',
    },
    {
      label: 'Media Library',
      count: data ? data.media : '—',
      href: '/admin-252755/media',
      icon: '🖼️',
      hint: 'Optimized CDN assets',
    },
    {
      label: 'Experience',
      count: data ? data.experience : '—',
      href: '/admin-252755/experience',
      icon: '🏢',
      hint: 'Career positions',
    },
    {
      label: 'Skills',
      count: data ? data.skills : '—',
      href: '/admin-252755/skills',
      icon: '⚡',
      hint: 'Tech & domain stack',
    },
    {
      label: 'Education',
      count: data ? data.education : '—',
      href: '/admin-252755/education',
      icon: '🎓',
      hint: 'Degrees & institutions',
    },
    {
      label: 'Certifications',
      count: data ? data.certifications : '—',
      href: '/admin-252755/certifications',
      icon: '📜',
      hint: 'Credentials & awards',
    },
  ];

  return (
    <AdminShell user={me.data} current="/admin-252755">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · Overview</span>
          <h1>Control Dashboard</h1>
          <p>
            Manage the content that powers the public portfolio. Writes
            revalidate the site instantly.
          </p>
        </div>
        <div className="adm-head-actions">
          <Link href="/admin-252755/blogs/new" className="adm-btn primary">
            <span>+ New Article</span>
          </Link>
          <Link href="/admin-252755/analytics" className="adm-btn">
            <span>View Analytics ↗</span>
          </Link>
        </div>
      </div>

      {/* Content Stats Grid */}
      <div className="adm-stats-grid">
        {stats.map((item) => (
          <Link key={item.label} href={item.href} className="adm-stat-card">
            <div className="adm-stat-card-head">
              <span className="adm-stat-icon">{item.icon}</span>
              <span className="adm-stat-link-arrow">→</span>
            </div>
            <b className="adm-stat-value">{item.count}</b>
            <div className="adm-stat-info">
              <span className="adm-stat-label">{item.label}</span>
              <span className="adm-stat-hint">{item.hint}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Two Column Split */}
      <div className="adm-split" style={{ marginTop: 24 }}>
        {/* Quick Access */}
        <div className="adm-panel">
          <div className="adm-panel-title">
            <h2>Quick Navigation</h2>
            <span className="adm-panel-tag">Direct Links</span>
          </div>
          <p>
            The public site falls back to static content if the backend API is
            temporarily unreachable — content delivery never suffers
            single-point failure.
          </p>
          <div className="adm-quick-grid" style={{ marginTop: 16 }}>
            <Link href="/admin-252755/analytics" className="adm-quick-item">
              <span className="adm-quick-icon">📈</span>
              <div className="adm-quick-text">
                <strong>Analytics & Insights</strong>
                <span>Visitor traffic, pageviews and likes</span>
              </div>
              <span className="adm-quick-arrow">→</span>
            </Link>
            <Link href="/admin-252755/projects" className="adm-quick-item">
              <span className="adm-quick-icon">💼</span>
              <div className="adm-quick-text">
                <strong>Manage Projects</strong>
                <span>Add or reorder portfolio case studies</span>
              </div>
              <span className="adm-quick-arrow">→</span>
            </Link>
            <Link href="/admin-252755/blogs" className="adm-quick-item">
              <span className="adm-quick-icon">✍️</span>
              <div className="adm-quick-text">
                <strong>Articles & Revisions</strong>
                <span>Publish, schedule or restore drafts</span>
              </div>
              <span className="adm-quick-arrow">→</span>
            </Link>
            <Link href="/admin-252755/ai/api-keys" className="adm-quick-item">
              <span className="adm-quick-icon">🔑</span>
              <div className="adm-quick-text">
                <strong>AI Publishing Keys</strong>
                <span>Scoped tokens for autonomous drafting</span>
              </div>
              <span className="adm-quick-arrow">→</span>
            </Link>
          </div>
        </div>

        {/* Active Session Card */}
        <div className="adm-panel">
          <div className="adm-panel-title">
            <h2>Logged-in Session</h2>
            <span className="adm-role-badge role-admin">{me.data.role}</span>
          </div>

          <div className="adm-session-detail" style={{ marginTop: 16 }}>
            <div className="adm-session-detail-row">
              <span className="adm-detail-label">Authenticated User</span>
              <strong className="adm-detail-value">{me.data.name}</strong>
            </div>
            <div className="adm-session-detail-row">
              <span className="adm-detail-label">Email Address</span>
              <span className="adm-detail-value">{me.data.email}</span>
            </div>
            <div className="adm-session-detail-row">
              <span className="adm-detail-label">Access Level</span>
              <span className="adm-detail-value">
                {me.data.role === 'ADMIN'
                  ? 'Administrator (Full read/write/keys)'
                  : 'Editor (Content authoring)'}
              </span>
            </div>
            <div className="adm-session-detail-row">
              <span className="adm-detail-label">Session Status</span>
              <span className="adm-detail-value ok-text">
                <span className="adm-status-dot pulse ok" /> Active (Token
                Auto-refreshed)
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--line)',
            }}
          >
            <Link href="/" target="_blank" rel="noreferrer" className="adm-btn">
              <span>View Public Portfolio ↗</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Outage notice if stats fetch failed */}
      {!statsRes.ok && (
        <div
          className="adm-panel"
          style={{ borderColor: 'var(--danger)', marginTop: 24 }}
        >
          <h2 style={{ color: 'var(--danger)' }}>API connectivity notice</h2>
          <p>{statsRes.message}</p>
          <p className="adm-hint">
            The CMS lists will retry automatically. Check that the API backend
            is running on :4000.
          </p>
        </div>
      )}
    </AdminShell>
  );
}
