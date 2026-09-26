'use client';

import { useRef } from 'react';
import type { Skill } from '@portfolio/types';
import { SkillsFilm } from './skills-film';
import styles from './about-sections.module.css';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function AboutSkills({ skills }: { skills: Skill[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!container.current) return;
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.skillCard}`);
      const film = container.current.querySelector(`.${styles.skillsFilmCol}`);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: 'top 80%',
        },
      });

      if (film) {
        tl.fromTo(
          film,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.8, ease: 'power3.out' },
          0,
        );
      }

      tl.fromTo(
        cards,
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power2.out' },
        0.2,
      );
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={container}
      className={styles.sectionWrap}
      aria-labelledby="skills-heading"
    >
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Technical Stack</span>
        <h2 id="skills-heading" className={styles.sectionTitle}>
          Skills
          <br />
          and tooling.
        </h2>
        <p className={styles.sectionDesc}>
          The tools, languages, and systems I work with across frontend
          engineering, data persistence, quality assurance, and applied AI.
        </p>
      </div>

      <div className={styles.skillsGrid}>
        {/* Left Column: Remotion Kinetic Composition */}
        <div className={styles.skillsFilmCol}>
          <SkillsFilm skills={skills} />
        </div>

        {/* Right Column: Accurate Skill Categories */}
        <div className={styles.skillsCardsList}>
          {skills.map((skill) => {
            const items = skill.items
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            return (
              <div key={skill.id} className={styles.skillCard}>
                <div className={styles.skillCardTop}>
                  <h3 className={styles.skillCardName}>{skill.name}</h3>
                  <span className={styles.skillTagCount}>
                    {items.length}{' '}
                    {items.length === 1 ? 'tool' : 'technologies'}
                  </span>
                </div>

                <div className={styles.skillPills}>
                  {items.map((item) => (
                    <span key={item} className={styles.skillPill}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
