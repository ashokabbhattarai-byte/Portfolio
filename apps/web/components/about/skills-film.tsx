'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import type { Skill } from '@portfolio/types';
import styles from './about-sections.module.css';

const SkillsPlayer = dynamic(() => import('./skills-player'), {
  ssr: false,
});

export function SkillsFilm({ skills }: { skills: Skill[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const node = containerRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.filmCard}
      aria-label="Technical Stack Showcase"
    >
      <div className={styles.filmViewport}>
        {mounted && <SkillsPlayer skills={skills} playing={inView} />}
      </div>
    </div>
  );
}
