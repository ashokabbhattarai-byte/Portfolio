import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { Project } from '@portfolio/types';

/* Calm / reduced-motion fallbacks live here (not globals.css) so the projects
   pages own them. Only the scrub target itself is neutralised — descendants
   like .art-object keep the translate/rotate that centres them. */
const artMotionFallbacks = `[data-flow='calm'] [data-project-art]{transform:none!important;transition:opacity .3s ease,background-color .3s ease}@media (prefers-reduced-motion:reduce){[data-project-art]{transform:none!important;transition:none!important;animation:none!important}}`;
export function ProjectArt({
  project,
  compact = false,
}: {
  project: Pick<
    Project,
    'image' | 'title' | 'slug' | 'color' | 'ink' | 'symbol' | 'focus'
  >;
  compact?: boolean;
}) {
  /* Compact instances render inside the hover cursor and the landing featured
     cards, whose wrappers already carry data-project-art for the scrub — so
     only full-size artwork takes the attribute (nested targets would compound
     the scrub rotation). */
  if (project.image)
    return (
      <>
        <style>{artMotionFallbacks}</style>
        <div
          className={`project-art project-screenshot ${compact ? 'compact' : ''}`}
          data-project-art={compact ? undefined : true}
          style={{
            background: '#0c213c',
            borderRadius: 22,
            border: '1px solid rgba(12,33,60,0.1)',
          }}
        >
          <Image
            src={project.image}
            alt={`${project.title} application screenshot`}
            fill
            sizes={compact ? '350px' : '(max-width: 700px) 100vw, 70vw'}
          />
        </div>
      </>
    );
  return (
    <>
      <style>{artMotionFallbacks}</style>
      <div
        className={`project-art art-${project.slug} ${compact ? 'compact' : ''}`}
        data-project-art={compact ? undefined : true}
        style={
          {
            '--art-bg': project.color,
            '--art-ink': project.ink,
            borderRadius: 22,
            border: '1px solid rgba(12,33,60,0.1)',
          } as CSSProperties
        }
        role="img"
        aria-label={`${project.title}: illustrative project identity, not a product screenshot`}
      >
        <span className="art-wordmark">{project.title}</span>
        <div className="art-object">
          <span>{project.symbol}</span>
          {project.slug === 'certfy' && <i />}
        </div>
        <div className="art-caption">
          <span>{project.focus[0]}</span>
          <span>Project illustration</span>
        </div>
      </div>
    </>
  );
}
