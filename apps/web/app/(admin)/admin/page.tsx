import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getCertifications,
  getEducation,
  getExperience,
  getProfile,
  getProjects,
  getSignedInUser,
  getSkills,
} from '@/lib/admin-server';
import { adminSections, loginUrl } from '@/lib/auth';
import { AdminShell } from './admin-shell';

export default async function AdminDashboard() {
  const me = await getSignedInUser();
  if (!me.ok) redirect(loginUrl('/admin'));

  const [projects, experience, skills, education, certifications, profile] =
    await Promise.all([
      getProjects(),
      getExperience(),
      getSkills(),
      getEducation(),
      getCertifications(),
      getProfile(),
    ]);

  const counts: Record<string, number | string> = {
    Projects: projects.ok ? projects.data.total : '—',
    Experience: experience.ok ? experience.data.total : '—',
    Skills: skills.ok ? skills.data.total : '—',
    Education: education.ok ? education.data.total : '—',
    Certifications: certifications.ok ? certifications.data.total : '—',
  };

  return (
    <AdminShell user={me.data} current="/admin">
      <div className="adm-head">
        <div>
          <span className="adm-eyebrow">CMS · overview</span>
          <h1>Dashboard</h1>
          <p>
            Manage the content that powers the public portfolio. Writes
            revalidate the site instantly.
          </p>
        </div>
      </div>

      <div className="adm-stats">
        {Object.entries(counts).map(([label, count]) => (
          <Link
            key={label}
            href={`/admin/${label.toLowerCase()}`}
            className="adm-stat"
          >
            <b>{count}</b>
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="adm-split">
        <div className="adm-panel">
          <h2>Quick actions</h2>
          <p>
            The public site falls back to committed files if the API is down —
            content is never a single point of failure.
          </p>
          <div className="adm-quick" style={{ marginTop: 14 }}>
            {adminSections.slice(1).map((s) => (
              <Link key={s.href} href={s.href}>
                <span>{s.label}</span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="adm-panel">
          <h2>Signed in as</h2>
          <p style={{ marginTop: 8 }}>
            <strong>{me.data.name}</strong>
            <br />
            <span style={{ color: 'var(--muted)' }}>{me.data.email}</span>
            <br />
            <span className="adm-role" style={{ marginTop: 8 }}>
              {me.data.role}
            </span>
          </p>
          {profile.ok ? (
            <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>
              Public profile:{' '}
              <strong style={{ color: 'var(--ink)' }}>
                {profile.data.name}
              </strong>{' '}
              · {profile.data.role}
            </p>
          ) : null}
          <p style={{ marginTop: 12 }}>
            <Link href="/" className="adm-back">
              ← View public site
            </Link>
          </p>
        </div>
      </div>

      {!projects.ok || !experience.ok ? (
        <div className="adm-panel" style={{ borderColor: 'var(--danger)' }}>
          <h2 style={{ color: 'var(--danger)' }}>
            API unreachable for some sections
          </h2>
          <p>
            {[projects, experience, skills, education, certifications, profile]
              .filter((r) => !r.ok)
              .map((r) => (r as { message: string }).message)
              .join(' · ')}
          </p>
          <p className="adm-hint">
            The CMS lists will retry on navigation. Check that Nest is running
            on :4000.
          </p>
        </div>
      ) : null}
    </AdminShell>
  );
}
