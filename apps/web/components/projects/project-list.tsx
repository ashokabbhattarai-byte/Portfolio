import { TransitionLink } from '@/components/motion/transition-link';
import { ProjectArt } from './project-art';
import type { Project } from '@portfolio/types';
export function ProjectList({
  projects,
  mode = 'list',
}: {
  projects: Project[];
  mode?: 'list' | 'grid';
}) {
  return (
    <div className={`project-collection ${mode}`}>
      <div className="work-columns utility">
        <span>Project</span>
        <span>Discipline</span>
        <span>View</span>
      </div>
      {projects.map((project) => (
        <TransitionLink
          href={`/projects/${project.slug}`}
          key={project.slug}
          className="project-entry"
          data-project={project.slug}
          data-flip-id={project.slug}
          data-preview={mode === 'list' ? 'media' : 'cursor'}
          aria-label={`${project.title} — ${project.category} project. ${project.summary}`}
        >
          <div className="project-thumbnail">
            <ProjectArt project={project} />
          </div>
          <div className="project-title">
            <h3>{project.title}</h3>
            <span className="project-context">{project.context}</span>
          </div>
          <span className="project-category">{project.category}</span>
          <span className="project-arrow" aria-hidden="true">
            ↗
          </span>
        </TransitionLink>
      ))}
    </div>
  );
}
