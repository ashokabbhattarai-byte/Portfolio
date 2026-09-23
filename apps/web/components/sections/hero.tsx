'use client';
import Image from 'next/image';
import { useContext, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Profile, Experience } from '@portfolio/types';
import styles from './hero.module.css';
import { TransitionLink } from '@/components/motion/transition-link';
import { travels, watchFlow } from '@/components/motion/flow';
import { MotionContext } from '@/components/motion/motion-provider';

gsap.registerPlugin(ScrollTrigger);

export function Hero({
  profile,
  experience,
}: {
  profile: Profile;
  experience?: Experience[];
}) {
  const ref = useRef<HTMLElement>(null);
  const motion = useContext(MotionContext);
  useEffect(() => {
    let context: gsap.Context | undefined;
    const responsive = gsap.matchMedia();
    const start = () => {
      responsive.revert();
      context?.revert();
      context = gsap.context(() => {
        if (
          !travels() ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          return;
        const entry = gsap.timeline();
        const kinetic = gsap.utils.toArray<HTMLElement>('[data-kinetic-copy]');
        kinetic.forEach((node, index) => {
          const text = node.textContent ?? '';
          node.setAttribute('aria-label', text);
          node.innerHTML = [...text]
            .map(
              (character) =>
                `<span aria-hidden="true">${character === ' ' ? '&nbsp;' : character}</span>`,
            )
            .join('');
          entry.from(
            node.querySelectorAll('span'),
            {
              yPercent: 130,
              opacity: 0,
              rotateX: -70,
              transformOrigin: '50% 100%',
              duration: 0.7,
              stagger: 0.018,
              ease: 'expo.out',
            },
            0.4 + index * 0.12,
          );
        });
        entry.fromTo(
          '[data-hero-photo]',
          {
            scale: 1.14,
            yPercent: 8,
            rotation: 6,
            clipPath: 'inset(12% 10% 0% 10% round 48% 48% 0 0)',
          },
          {
            scale: 1,
            yPercent: 0,
            rotation: 3,
            clipPath: 'inset(0% 0% 0% 0% round 48% 48% 4px 4px)',
            duration: 1.35,
            ease: 'curtain',
          },
          0,
        );
        entry.from(
          '[data-name-word]',
          {
            yPercent: 110,
            rotation: 4,
            transformOrigin: '0% 100%',
            duration: 1.15,
            stagger: 0.12,
            ease: 'expo.out',
            clearProps: 'transform',
          },
          0,
        );
        entry.from(
          '[data-hero-reveal]',
          {
            y: 18,
            opacity: 0,
            duration: 0.75,
            stagger: 0.07,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
          0.22,
        );
        entry.fromTo(
          '[data-photo-shutter]',
          { scaleX: 1 },
          {
            scaleX: 0,
            duration: 1.2,
            ease: 'expo.inOut',
          },
          0.08,
        );
        gsap.to('[data-hero-orb]', {
          x: 'random(-90,90)',
          y: 'random(-70,70)',
          scale: 'random(0.7,1.4)',
          duration: 'random(3,6)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        gsap.to('[data-hero-scan]', {
          yPercent: 120,
          duration: 3.6,
          repeat: -1,
          ease: 'none',
        });
        gsap.to('[data-hero-grid]', {
          backgroundPosition: '80px 80px',
          duration: 7,
          repeat: -1,
          ease: 'none',
        });
        const progress = ref.current?.querySelector<HTMLElement>(
          '[data-scroll-progress] span',
        );
        if (progress)
          gsap.to(progress, {
            scaleX: 1,
            transformOrigin: 'left center',
            ease: 'none',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        ScrollTrigger.create({
          trigger: ref.current,
          start: 'top bottom',
          end: 'bottom top',
          onEnter: () => {
            entry.restart();
          },
          onEnterBack: () => {
            entry.restart();
          },
        });
        // Portrait drift follows scroll in both directions.
        responsive.add(
          '(min-width: 761px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
          () => {
            const photo =
              ref.current?.querySelector<HTMLElement>('[data-hero-photo]');
            const button =
              ref.current?.querySelector<HTMLElement>('[data-hero-action]');
            if (!photo || !button) return;
            gsap.to(photo, {
              y: -44,
              ease: 'none',
              scrollTrigger: {
                trigger: ref.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            });
            gsap.set(photo, { transformPerspective: 1200 });
            const rotateX = gsap.quickTo(photo, 'rotationX', {
              duration: 0.75,
              ease: 'power3.out',
            });
            const rotateY = gsap.quickTo(photo, 'rotationY', {
              duration: 0.75,
              ease: 'power3.out',
            });
            const tilt = (event: PointerEvent) => {
              if (event.pointerType !== 'mouse') return;
              const box = photo.getBoundingClientRect();
              rotateX(-((event.clientY - box.top) / box.height - 0.5) * 5);
              rotateY(((event.clientX - box.left) / box.width - 0.5) * 5);
              gsap.to('[data-hero-orb]', {
                x: (event.clientX / window.innerWidth - 0.5) * 100,
                y: (event.clientY / window.innerHeight - 0.5) * 80,
                duration: 0.8,
                ease: 'power3.out',
                overwrite: true,
              });
            };
            const settle = () => {
              rotateX(0);
              rotateY(0);
            };
            const moveX = gsap.quickTo(button, 'x', {
              duration: 0.45,
              ease: 'power3.out',
            });
            const moveY = gsap.quickTo(button, 'y', {
              duration: 0.45,
              ease: 'power3.out',
            });
            const attract = (event: PointerEvent) => {
              if (event.pointerType !== 'mouse') return;
              const box = button.getBoundingClientRect();
              moveX(((event.clientX - box.left) / box.width - 0.5) * 12);
              moveY(((event.clientY - box.top) / box.height - 0.5) * 8);
            };
            const release = () => {
              moveX(0);
              moveY(0);
            };
            photo.addEventListener('pointermove', tilt, { passive: true });
            photo.addEventListener('pointerleave', settle);
            button.addEventListener('pointermove', attract, { passive: true });
            button.addEventListener('pointerleave', release);
            return () => {
              photo.removeEventListener('pointermove', tilt);
              photo.removeEventListener('pointerleave', settle);
              button.removeEventListener('pointermove', attract);
              button.removeEventListener('pointerleave', release);
            };
          },
        );
      }, ref);
    };
    window.addEventListener('portfolio:reveal', start);
    const stop = watchFlow(start);
    if (document.documentElement.dataset.motion !== 'intro') start();
    return () => {
      window.removeEventListener('portfolio:reveal', start);
      stop();
      responsive.revert();
      context?.revert();
    };
  }, []);

  return (
    <section ref={ref} className={styles.hero} aria-labelledby="hero-title">
      <span className={styles.backdropWord} aria-hidden="true">
        Engineer.
      </span>
      <span className={styles.heroOrb} data-hero-orb aria-hidden="true" />
      <span className={styles.heroGrid} data-hero-grid aria-hidden="true" />
      <span className={styles.heroScan} data-hero-scan aria-hidden="true" />
      <div className={styles.content}>
        <div data-hero-reveal>
          <TransitionLink href="/contact" className={styles.availability}>
            <span className={styles.statusDot} aria-hidden="true" />
            Open to work
            <span aria-hidden="true">↗</span>
          </TransitionLink>
        </div>
        <h1 id="hero-title" className={styles.name}>
          {profile.name.split(' ').map((word, index) => (
            <span className={styles.nameMask} key={word + index}>
              <span data-name-word>{word} </span>
            </span>
          ))}
        </h1>
        <p className={styles.role} data-hero-reveal data-kinetic-copy>
          {profile.role}
        </p>
        <p
          className={styles.intro}
          data-hero-reveal
          data-hero-copy
          data-kinetic-copy
        >
          I build thoughtful web experiences and useful AI products.
        </p>
        <div className={styles.actions} data-hero-reveal>
          <a
            href="#projects"
            className={styles.action}
            data-hero-action
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              const target = document.getElementById('projects');
              if (!target) return;
              event.preventDefault();
              history.replaceState(history.state, '', '#projects');
              motion.scrollToSection(target);
            }}
          >
            Explore my work <span aria-hidden="true">↓</span>
          </a>
          {profile.resume ? (
            <a
              href={profile.resume}
              className={styles.resume}
              target="_blank"
              rel="noreferrer"
            >
              View résumé <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </div>
      <figure className={styles.portrait} data-hero-photo>
        <div className={styles.shutter} data-photo-shutter aria-hidden="true" />
        <Image
          src="/assets/hero-portrait.webp"
          alt={profile.name + ', ' + profile.role}
          width={890}
          height={1010}
          sizes="(max-width: 760px) 92vw, (max-width: 1400px) 48vw, 620px"
          loading="eager"
          fetchPriority="high"
          className={styles.image}
        />
        <figcaption className={styles.location}>
          <span>
            <strong>{profile.location}</strong>
            <span>Available for new opportunities</span>
          </span>
          {experience?.[0] ? (
            <span className={styles.experience}>
              <strong>{experience[0].company}</strong>
              <span>{experience[0].role}</span>
            </span>
          ) : null}
        </figcaption>
      </figure>
      <div className={styles.heroBottom} data-hero-reveal>
        <span>Based in {profile.location}</span>
        <span>Web engineering / Applied AI / Quality</span>
        <a href="#approach">Scroll to discover ↓</a>
      </div>
      <div
        className={styles.scrollProgress}
        data-scroll-progress
        aria-hidden="true"
      >
        <span />
      </div>
    </section>
  );
}
