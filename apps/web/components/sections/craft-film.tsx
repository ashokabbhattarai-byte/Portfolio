'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import styles from './craft-film.module.css';

const FilmPlayer = dynamic(() => import('./craft-player'), { ssr: false });

export function CraftFilm({
  variant = 'process',
}: {
  variant?: 'process' | 'writing';
}) {
  const host = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const playObserver = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    const loadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: '600px' },
    );

    if (host.current) {
      playObserver.observe(host.current);
      loadObserver.observe(host.current);
    }

    return () => {
      playObserver.disconnect();
      loadObserver.disconnect();
    };
  }, []);
  return (
    <div ref={host} className={styles.film} data-craft-frame>
      <div className={styles.screen} aria-hidden="true">
        <div className={styles.poster}>
          <span>{variant === 'writing' ? 'FIELD NOTES' : 'THE MAKING OF'}</span>
          <strong>
            {variant === 'writing'
              ? 'Ideas, made clear.'
              : 'Think. Build. Refine.'}
          </strong>
          <i>From first principles to the final detail.</i>
        </div>
        {loaded && <FilmPlayer variant={variant} playing={visible} />}
      </div>
      <div className={styles.caption}>
        <span>
          <i />{' '}
          {variant === 'writing'
            ? 'Inside the notebook'
            : 'A practice of continuous refinement'}
        </span>
      </div>
    </div>
  );
}
