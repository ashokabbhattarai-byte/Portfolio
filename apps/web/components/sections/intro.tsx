import type { Profile } from '@portfolio/types';
import { TransitionLink } from '@/components/motion/transition-link';
import styles from './intro.module.css';

const stages = [
  {
    title: 'Understand the problem',
    detail:
      'Define who the software serves, what it needs to do, and the constraints that shape it. Agree on a clear scope before development begins.',
  },
  {
    title: 'Build the complete experience',
    detail:
      'Connect responsive interfaces, APIs, and data into a cohesive application. Make accessibility and maintainable code part of everyday development.',
  },
  {
    title: 'Test, release, and improve',
    detail:
      'Check important user journeys, performance, and edge cases. Use feedback from real use to guide the next improvement.',
  },
];

export function Intro({ profile }: { profile: Profile }) {
  return (
    <section
      id="approach"
      className={`section-shell ${styles.section}`}
      aria-labelledby="approach-title"
    >
      <div className={styles.overview}>
        <div className={styles.introduction}>
          <p className={styles.label}>My approach</p>
          <h2 id="approach-title">
            Thoughtful software.
            <br />
            From idea to everyday use.
          </h2>
          <p className={styles.lead}>
            I build web applications, internal tools, and practical AI features
            with attention to the details that matter: usability, performance,
            and reliable delivery.
          </p>
          <TransitionLink href="/projects" className={styles.link}>
            Explore my development projects <span aria-hidden="true">↗</span>
          </TransitionLink>
        </div>
        <aside className={styles.profile} aria-label={`About ${profile.name}`}>
          <h3>{profile.name}</h3>
          <p className={styles.role}>{profile.role}</p>
          <p className={styles.bio}>{profile.description}</p>
          <dl className={styles.facts}>
            <div>
              <dt>Based in</dt>
              <dd>{profile.location}</dd>
            </div>
            {profile.languages ? (
              <div>
                <dt>Languages</dt>
                <dd>{profile.languages}</dd>
              </div>
            ) : null}
          </dl>
          <TransitionLink href="/about" className={styles.link}>
            More about {profile.name.split(' ')[0]}{' '}
            <span aria-hidden="true">↗</span>
          </TransitionLink>
        </aside>
      </div>
      <div className={styles.process}>
        <h3 className={styles.processTitle}>How I work</h3>
        <ol className={styles.stages}>
          {stages.map((stage, index) => (
            <li className={styles.stage} key={stage.title}>
              <span className={styles.number} aria-hidden="true">
                0{index + 1}
              </span>
              <h4>{stage.title}</h4>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
