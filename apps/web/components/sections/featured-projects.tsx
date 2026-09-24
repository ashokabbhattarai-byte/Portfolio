import { getProjects } from '@/lib/content';
import { ProjectArt } from '@/components/projects/project-art';
import { TransitionLink } from '@/components/motion/transition-link';
import styles from './featured-projects.module.css';

export async function FeaturedProjects() {
  const projects = await getProjects();
  const flagged = projects.filter((project) => project.featured);
  const selected = (flagged.length ? flagged : projects).slice(0, 3);
  return (
    <section
      id="projects"
      className={`featured section-shell ${styles.section}`}
      aria-labelledby="projects-title"
    >
      <p className="section-label">02 / Selected projects</p>
      <div className={styles.heading}>
        <div>
          <h2 id="projects-title">Projects</h2>
          <p>Real problems. Considered solutions. A few things I’ve built.</p>
        </div>
        <TransitionLink href="/projects" className={styles.all}>
          All projects <span aria-hidden="true">↗</span>
        </TransitionLink>
      </div>
      <div className={styles.grid}>
        {selected.map((project, index) => (
          <article key={project.slug} className={styles.card} data-project-card>
            <TransitionLink
              href={`/projects/${project.slug}`}
              className={styles.link}
            >
              <div className={styles.thumbnail} data-project-art>
                <ProjectArt project={project} compact />
              </div>
              <div className={styles.body}>
                <div className={styles.meta}>
                  <span>
                    0{index + 1} / {project.category}
                  </span>
                  <span>{project.live ? '● Live' : 'In development'}</span>
                </div>
                <h3>
                  {project.title}
                  <span aria-hidden="true">↗</span>
                </h3>
                <p>{project.summary}</p>
                <div className={styles.footer}>
                  <span>{project.context}</span>
                  <span>View project</span>
                </div>
              </div>
            </TransitionLink>
          </article>
        ))}
      </div>
    </section>
  );
}
