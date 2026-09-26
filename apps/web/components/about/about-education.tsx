'use client';

import { useRef } from 'react';
import type { Certification, Education } from '@portfolio/types';
import styles from './about-sections.module.css';
import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function AboutEducation({
  education,
  certifications,
  languages,
}: {
  education: Education[];
  certifications: Certification[];
  languages: string;
}) {
  const container = useRef<HTMLDivElement>(null);

  const languageList = languages
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (!container.current) return;
      const items = gsap.utils.toArray<HTMLElement>([
        `.${styles.eduCard}`,
        `.${styles.certItem}`,
        `.${styles.languagesCard}`,
      ]);

      gsap.fromTo(
        items,
        { y: 30, opacity: 0, scale: 0.98 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: container.current,
            start: 'top 80%',
          },
        },
      );
    }, container);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={container}
      className={styles.sectionWrap}
      aria-labelledby="education-heading"
    >
      <div className={styles.sectionHeader}>
        <span className={styles.sectionLabel}>Background & Credentials</span>
        <h2 id="education-heading" className={styles.sectionTitle}>
          Education and
          <br />
          certifications.
        </h2>
        <p className={styles.sectionDesc}>
          Academic foundations in computer science alongside industry training
          and certifications.
        </p>
      </div>

      <div className={styles.eduGrid}>
        {/* Left Column: Academic Education */}
        <div className={styles.eduCol}>
          <h3 className={styles.eduColTitle}>Academic Background</h3>

          {education.map((item) => {
            const hasNotes = item.notes && item.notes.length > 0;
            return (
              <div key={item.id} className={styles.eduCard}>
                <h4 className={styles.eduAward}>{item.award}</h4>
                <p className={styles.eduSchool}>{item.school}</p>
                <div className={styles.eduFooter}>
                  <span>{item.dates || 'Secondary Education'}</span>
                  {hasNotes && (
                    <span className={styles.eduBadge}>
                      {item.notes.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Languages */}
          {languageList.length > 0 && (
            <div className={styles.languagesCard}>
              <h4 className={styles.langTitle}>Languages</h4>
              <div className={styles.langPills}>
                {languageList.map((lang) => (
                  <span key={lang} className={styles.langPill}>
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Certifications */}
        <div className={styles.eduCol}>
          <h3 className={styles.eduColTitle}>Certifications</h3>

          <div className={styles.certList}>
            {certifications.map((item) => (
              <div key={item.id} className={styles.certItem}>
                <div className={styles.certInfo}>
                  <h4 className={styles.certTitle}>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-link"
                        style={{ color: 'var(--ink)' }}
                      >
                        {item.title} ↗
                      </a>
                    ) : (
                      item.title
                    )}
                  </h4>
                  <span className={styles.certMeta}>
                    <span>{item.issuer}</span>
                    <span>·</span>
                    <span>{item.date}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
