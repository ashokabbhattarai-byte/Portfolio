'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { setFlow, travels, watchFlow } from '@/components/motion/flow';
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
  const [motion, setMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sync = () => setMotion(travels());
    sync();
    const stop = watchFlow(sync);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: '80px' },
    );
    if (host.current) observer.observe(host.current);
    return () => {
      stop();
      observer.disconnect();
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
        {loaded && (
          <FilmPlayer
            variant={variant}
            playing={visible && motion && !paused}
          />
        )}
      </div>
      <div className={styles.caption}>
        <span>
          <i />{' '}
          {variant === 'writing'
            ? 'Inside the notebook'
            : 'A practice of continuous refinement'}
        </span>
        <button
          type="button"
          onClick={() => {
            if (!motion) {
              setPaused(false);
              setFlow('full');
            } else setPaused(!paused);
          }}
          aria-label={
            !motion
              ? 'Enable portfolio animations'
              : paused
                ? 'Play portfolio film'
                : 'Pause portfolio film'
          }
        >
          {!motion ? 'Enable motion ↗' : paused ? 'Play ↗' : 'Pause Ⅱ'}
        </button>
      </div>
    </div>
  );
}
