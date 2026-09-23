import type { CSSProperties } from 'react';
import Image from 'next/image';
import type { Project } from '@portfolio/types';
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
  if (project.image)
    return (
      <div
        className={`project-art project-screenshot ${compact ? 'compact' : ''}`}
      >
        <Image
          src={project.image}
          alt={`${project.title} application screenshot`}
          fill
          sizes={compact ? '350px' : '(max-width: 700px) 100vw, 70vw'}
        />
      </div>
    );
  return (
    <div
      className={`project-art art-${project.slug} ${compact ? 'compact' : ''}`}
      style={
        { '--art-bg': project.color, '--art-ink': project.ink } as CSSProperties
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
  );
}
