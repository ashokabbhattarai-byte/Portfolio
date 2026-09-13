import { getProjects } from '@/lib/content';
import { ProjectList } from '@/components/projects/project-list';
import { TransitionLink } from '@/components/motion/transition-link';
import { Magnetic } from '@/components/motion/magnetic';
export async function FeaturedProjects() {
  const projects = await getProjects();
  const liveCount = projects.filter((p) => p.live).length;
  /* Honour the CMS flag, but never leave the section empty because nothing has
     been flagged yet. */
  const flagged = projects.filter((project) => project.featured);
  return (
    <section
      id="projects"
      className="featured section-shell"
      aria-labelledby="projects-title"
    >
      <div className="section-heading">
        <h2 id="projects-title">Selected projects</h2>
        <span className="utility">
          {liveCount} live · {projects.length - liveCount} in delivery ·
          full-stack, AI and blockchain
        </span>
      </div>
      <ProjectList
        projects={(flagged.length ? flagged : projects).slice(0, 3)}
      />
      <div className="more-work">
        <Magnetic>
          <TransitionLink
            className="pill"
            href="/projects"
            aria-label={`Browse all ${projects.length} projects`}
          >
            All projects <sup>{String(projects.length).padStart(2, '0')}</sup>
            <span aria-hidden="true">↗</span>
          </TransitionLink>
        </Magnetic>
      </div>
    </section>
  );
}
