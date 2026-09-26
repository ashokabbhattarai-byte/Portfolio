'use client';

import { useRef } from 'react';
import type { Experience } from '@portfolio/types';
import styles from './about-sections.module.css';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function AboutExperience({ experience }: { experience: Experience[] }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
    if (!container.current) return;
    const cards = gsap.utils.toArray<HTMLElement>(`.${styles.expCard}`);
    const line = container.current.querySelector(`.${styles.timelineLine}`);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container.current,
        start: 'top 75%',
      },
    });

    if (line) {
      tl.fromTo(line, { scaleY: 0 }, { scaleY: 1, duration: 1.2, ease: 'expo.inOut' }, 0);
    }

    tl.fromTo(
      cards,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.2, ease: 'back.out(1.2)' },
      0.2
    );
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={container}
      className={styles.sectionWrap}
      aria-labelledby="experience-heading"
    >
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Track Record</span>
        <h2 id="experience-heading" className={styles.sectionTitle}>
          Experience
        </h2>
        <p className={styles.sectionDesc}>
          Commercial software engineering and applied AI work shipped in
          production teams.
        </p>
      </div>

      <div className={styles.timeline}>
        <div className={styles.timelineLine} aria-hidden="true" />
        {experience.map((item, index) => {
          const isCurrent =
            item.dates.toLowerCase().includes('present') || index === 0;

          return (
            <article key={item.id} className={styles.expCard}>
              <div
                className={`${styles.expBeacon} ${isCurrent ? styles.activeBeacon : ''}`}
                aria-hidden="true"
              />

              <div className={styles.expHeader}>
                <div className={styles.expCompanyGroup}>
                  <div className={styles.expCompany}>
                    <span>{item.company}</span>
                    {isCurrent && (
                      <span className={styles.activeBadge}>Present</span>
                    )}
                  </div>
                  <span className={styles.expDates}>{item.dates}</span>
                </div>

                <h3 className={styles.expRole}>{item.role}</h3>
              </div>

              <p className={styles.expDetail}>{item.detail}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
