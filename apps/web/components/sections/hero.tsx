'use client';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Profile, Experience } from '@portfolio/types';
import { HeroIdentity } from '@/components/motion/hero-identity';
import { TransitionLink } from '@/components/motion/transition-link';
import { revealLines, travels, watchFlow } from '@/components/motion/flow';
gsap.registerPlugin(ScrollTrigger);
export function Hero({
  profile,
  experience,
}: {
  profile: Profile;
  experience?: Experience[];
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    let context: gsap.Context | undefined;
    const start = () => {
      context?.revert();
      context = gsap.context(() => {
        const full = travels();
        if (!full) {
          gsap.from('.hero-reveal', {
            opacity: 0,
            duration: 0.4,
            stagger: 0.05,
            ease: 'none',
          });
          return;
        }
        /* Phase 10, in its published order: the portrait settles first, then
           the utility line, the role heading, and finally the identity. The
           overlaps are deliberate so the screen never reads as a queue. */
        const entry = gsap.timeline();
        entry
          .from(
            '.hero-portrait',
            { scale: 1.06, yPercent: 4, duration: 1.1, ease: 'curtain' },
            0.1,
          )
          .from(
            '.hero-topline, .hero-side, .hero-bottom',
            {
              y: 22,
              opacity: 0,
              duration: 0.8,
              stagger: 0.07,
              ease: 'rise',
            },
            0.3,
          )
          .add(() => revealLines('.hero-role h1', { stagger: 0.1 }), 0.42)
          .from(
            '.hero-role .direction-arrow, .hero-role p',
            { y: 20, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'rise' },
            0.5,
          )
          .from(
            '.hero-identity',
            { yPercent: 40, opacity: 0, duration: 0.9, ease: 'rise' },
            0.58,
          );
        /* The portrait drifts against the scroll so the first screen has depth
           without the identity ever leaving the viewport. */
        gsap.to('.portrait-image', {
          yPercent: 9,
          ease: 'none',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.6,
          },
        });
      }, ref);
    };
    window.addEventListener('portfolio:reveal', start);
    const stop = watchFlow(start);
    /* While the curtain is up the reveal event is still coming; starting now
       would only play the entrance where nobody can see it. */
    if (document.documentElement.dataset.motion !== 'intro') start();
    return () => {
      window.removeEventListener('portfolio:reveal', start);
      stop();
      context?.revert();
    };
  }, []);
  const current = experience?.[0];
  return (
    <section ref={ref} className="hero" aria-labelledby="hero-title">
      <div className="hero-portrait">
        <Image
          src="/assets/hero-portrait.webp"
          alt={`${profile.name} — ${profile.role}`}
          fill
          sizes="(max-width: 700px) 100vw, 56vw"
          loading="eager"
          fetchPriority="high"
          className="portrait-image"
        />
      </div>
      <div className="hero-topline hero-reveal">
        <span className="hero-topline-role">
          <span className="live-dot" aria-hidden="true" />
          Available for new projects
        </span>
        <span>
          {profile.location} <span className="tiny-globe">◎</span>
        </span>
      </div>
      <div className="hero-role hero-reveal">
        <span className="direction-arrow" aria-hidden="true">
          ↘
        </span>
        <h1 id="hero-title">
          <span className="hero-title-line">Full-stack software,</span>
          <br />
          <span className="hero-title-line">built to be relied on.</span>
        </h1>
        <p className="hero-copy">
          {profile.role} in {profile.location}, building production web
          applications and AI products — engineered for performance,
          accessibility and the quality that holds up under real use.
        </p>
      </div>
      <div className="hero-side hero-reveal">
        <span className="status-dot" />
        {current ? (
          <>
            {current.role}
            <br />
            at {current.company}
          </>
        ) : (
          <>
            Currently building
            <br />
            {profile.location}
          </>
        )}
      </div>
      <HeroIdentity name={profile.name} />
      <div className="hero-bottom hero-reveal">
        <a href="#projects" aria-label="Scroll to selected projects">
          Explore projects <span aria-hidden="true">↓</span>
        </a>

        <TransitionLink
          href="/projects"
          aria-label="Browse every project in the portfolio"
        >
          All projects <span aria-hidden="true">↗</span>
        </TransitionLink>
      </div>
    </section>
  );
}
