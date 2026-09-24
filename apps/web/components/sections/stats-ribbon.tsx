import { getBlogs, getExperience, getProjects } from '@/lib/content';
import { StatsCount } from './stats-count';

export async function StatsRibbon() {
  const [projects, blogs, experience] = await Promise.all([
    getProjects(),
    getBlogs(),
    getExperience(),
  ]);
  const live = projects.filter((p) => p.live).length;
  /* Derived from the résumé rather than typed in, so the ribbon cannot go stale
     the way a hard-coded "2 years" would. */
  const startYear = experience.reduce((earliest, item) => {
    const year = Number(item.dates.match(/\b(20\d{2})\b/)?.[1]);
    return year && year < earliest ? year : earliest;
  }, new Date().getFullYear());
  const years = Math.max(1, new Date().getFullYear() - startYear);
  const company = experience[0]?.company;
  return (
    <div className="stats-ribbon" aria-label="Portfolio at a glance">
      <div className="stat live">
        <span className="stat-value">
          <StatsCount value={live} /> <em>live</em>
        </span>
        <span className="stat-label">
          In production with real users — not a prototype
        </span>
      </div>
      <div className="stat">
        <span className="stat-value">
          <StatsCount value={projects.length} /> <em>projects</em>
        </span>
        <span className="stat-label">
          Full-stack, applied AI and blockchain delivery
        </span>
      </div>
      <div className="stat">
        <span className="stat-value">
          <StatsCount value={years} /> <em>{years === 1 ? 'year' : 'years'}</em>
        </span>
        <span className="stat-label">
          {company
            ? `Professional engineering at ${company}, solo and in teams`
            : 'Professional engineering, solo and in teams'}
        </span>
      </div>
      <div className="stat">
        <span className="stat-value">
          <StatsCount value={blogs.length} /> <em>articles</em>
        </span>
        <span className="stat-label">
          Written on architecture, AI and quality assurance
        </span>
      </div>
    </div>
  );
}
