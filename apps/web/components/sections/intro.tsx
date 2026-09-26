import type { Profile } from '@portfolio/types';
import { TransitionLink } from '@/components/motion/transition-link';
import Image from 'next/image';
import { CraftFilm } from './craft-film';
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
        <div className={styles.introduction} data-intro-reveal>
          <p className="section-label">01 / My approach</p>
          <h2 id="approach-title" data-intro-title>
            Software with purpose.
            <br />
            <span>Details that matter.</span>
          </h2>
          <p className={styles.lead} data-intro-reveal>
            I turn complex problems into clear, useful web experiences. From the
            first question to the final release, I bring design, engineering,
            and quality together.
          </p>
          <TransitionLink
            href="/projects"
            className={styles.link}
            data-intro-reveal
          >
            Explore my projects <span aria-hidden="true">↗</span>
          </TransitionLink>
        </div>
        <div data-intro-film data-craft-frame>
          <CraftFilm />
        </div>
      </div>
      <div className={styles.process} data-intro-reveal>
        <div className={styles.processHeading}>
          <h3>How I work</h3>
          <p>Three steps. One considered experience.</p>
        </div>
        <ol className={styles.stages}>
          {stages.map((stage, index) => (
            <li className={styles.stage} key={stage.title} data-stage>
              <span className={styles.number} aria-hidden="true">
                0{index + 1}
              </span>
              <h4>{stage.title}</h4>
              <p>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </div>
      <aside className={styles.profile} aria-label={`About ${profile.name}`}>
        <div className={styles.photoWindow}>
          <Image
            src="/assets/secondary-portrait.webp"
            alt={`${profile.name} outdoors in Lalitpur, Nepal`}
            fill
            sizes="144px"
          />
          <span className={styles.statusDot} title="Available for projects" />
        </div>
        <div className={styles.profileDetails}>
          <div className={styles.nameRow}>
            <h3>{profile.name}</h3>
            <span className={styles.availableBadge}>Available</span>
          </div>
          <p className={styles.role}>
            {profile.role} · {profile.location}
          </p>
        </div>
        <TransitionLink href="/about" className={styles.link}>
          More about me <span aria-hidden="true">↗</span>
        </TransitionLink>
      </aside>
    </section>
  );
}
