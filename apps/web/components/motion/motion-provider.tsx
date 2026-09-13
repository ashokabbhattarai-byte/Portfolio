'use client';
import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Lenis from 'lenis';
import { travels, watchFlow } from './flow';
gsap.registerPlugin(ScrollTrigger, MorphSVGPlugin, ScrambleTextPlugin);
export const MotionContext = createContext<{
  navigate: (href: string) => void;
  lock: (locked: boolean, reason?: string) => void;
  scrollToSection: (target: HTMLElement) => void;
}>({ navigate: () => {}, lock: () => {}, scrollToSection: () => {} });
/* Three states of one flexible sheet. MorphSVG interpolates between them even
   though the commands differ, so the edge stays organic instead of hinged. */
const covered = 'M0,0 H100 V100 H0 Z';
const lifting = 'M0,0 H100 V58 C78,104 22,104 0,58 Z';
const arriving = 'M0,42 C22,-4 78,-4 100,42 V100 H0 Z';
const greetings = [
  'Hello',
  'Bonjour',
  'नमस्ते',
  'Hola',
  'Ciao',
  'Olá',
  'こんにちは',
  'Hallo',
  'Namaste',
];
/* Phase 5 budgets the loader at 1.8–2.8s end to end and forbids padding a page
   that is already ready. The greeting phase is sized to leave room for the
   one-second lift; the cadence is fixed and the word count is what flexes, so
   a slow phone spends the budget loading rather than waiting behind the sheet. */
const cadence = 190;
const introBudget = 1500;
const minimumHold = 570;
const calmHold = 620;
/* Components that animate on reveal read this to know whether the curtain is
   still up, so their entrance is never spent behind it. */
const stage = (value: 'intro' | 'ready') => {
  document.documentElement.dataset.motion = value;
};
const routes: Record<string, string> = {
  '/': 'Home',
  '/projects': 'Projects',
  '/blog': 'Blog',
  '/about': 'About',
  '/contact': 'Contact',
};
/* `titles` maps /projects/<slug> to a project title for the transition caption. It
    arrives as a prop because this is a client component; a server parent reads
    it from the CMS. */
export function MotionProvider({
  children,
  titles = {},
}: {
  children: ReactNode;
  titles?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const overlay = useRef<HTMLDivElement>(null);
  const front = useRef<SVGPathElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const trailShape = useRef<SVGPathElement>(null);
  const caption = useRef<HTMLSpanElement>(null);
  const lenis = useRef<Lenis | null>(null);
  const busy = useRef(false);
  const historyNavigation = useRef(false);
  const pending = useRef<string | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locks = useRef(new Set<string>());
  /* Read through a ref so the caption lookup keeps a stable identity and the
     effects below never re-subscribe over a data change. */
  const labels = useRef(titles);
  useEffect(() => {
    labels.current = titles;
  }, [titles]);
  const destination = useCallback(
    (href: string) => labels.current[href] ?? routes[href] ?? 'Explore',
    [],
  );
  const lock = useCallback((requested: boolean, reason = 'transition') => {
    if (requested) locks.current.add(reason);
    else locks.current.delete(reason);
    const locked = locks.current.size > 0;
    document.documentElement.classList.toggle('scroll-locked', locked);
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
  }, []);
  const scrollToSection = useCallback((target: HTMLElement) => {
    const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 110;
    const top = Math.max(
      0,
      window.scrollY + target.getBoundingClientRect().top - offset,
    );
    if (lenis.current) {
      lenis.current.scrollTo(top, { duration: 1.05, immediate: !travels() });
    } else {
      window.scrollTo({ top, behavior: travels() ? 'smooth' : 'instant' });
    }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, []);
  /* GSAP owns the caption text after mount, so React never overwrites a
     scramble mid-flight. The server still renders the opening greeting. */
  const say = useCallback((text: string, scramble = false) => {
    const node = caption.current;
    if (!node) return;
    if (!travels()) {
      node.textContent = `• ${text}`;
      return;
    }
    if (scramble) {
      gsap.to(node, {
        duration: 0.55,
        ease: 'none',
        scrambleText: { text: `• ${text}`, chars: 'upperCase', speed: 0.7 },
      });
      return;
    }
    node.textContent = `• ${text}`;
    gsap.fromTo(
      node,
      { yPercent: 45, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.3, ease: 'rise', overwrite: true },
    );
  }, []);
  const entrance = useCallback(() => {
    window.dispatchEvent(new Event('portfolio:ready'));
    ScrollTrigger.refresh();
  }, []);
  const reveal = useCallback(() => {
    timeline.current?.kill();
    stage('ready');
    window.dispatchEvent(new Event('portfolio:reveal'));
    const settle = gsap.timeline({
      onComplete: () => {
        gsap.set([overlay.current, trail.current], { visibility: 'hidden' });
        busy.current = false;
        lock(false);
        entrance();
      },
    });
    timeline.current = settle;
    if (!travels()) {
      settle.to([overlay.current, trail.current], {
        opacity: 0,
        duration: 0.32,
        ease: 'none',
      });
      return;
    }
    /* The sheet slackens into a deep curve as it goes, and the accent panel
       trails a beat behind so the curve reads as thickness, not as a cutout. */
    settle
      .to(
        [front.current, trailShape.current],
        { morphSVG: lifting, duration: 0.6, ease: 'curtain' },
        0,
      )
      .to(overlay.current, { yPercent: -118, duration: 1, ease: 'curtain' }, 0)
      .to(
        trail.current,
        { yPercent: -118, duration: 1, ease: 'curtain' },
        0.035,
      )
      .to(
        caption.current,
        { yPercent: -60, opacity: 0, duration: 0.4, ease: 'glide' },
        0,
      );
  }, [entrance, lock]);
  useEffect(() => {
    let smooth: Lenis | null = null;
    const tick = (time: number) => smooth?.raf(time * 1000);
    const build = () => {
      smooth?.destroy();
      gsap.ticker.remove(tick);
      smooth = null;
      lenis.current = null;
      if (!travels()) return;
      smooth = new Lenis({ duration: 1.05, anchors: true });
      lenis.current = smooth;
      smooth.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
    };
    build();
    const stop = watchFlow(build);
    return () => {
      stop();
      gsap.ticker.remove(tick);
      smooth?.destroy();
      lenis.current = null;
    };
  }, []);
  useEffect(() => {
    /* Stands the stylesheet's failsafe down: from here the curtain is ours. */
    document.documentElement.classList.add('motion-ready');
    busy.current = true;
    stage('intro');
    lock(true);
    gsap.set([overlay.current, trail.current], {
      visibility: 'visible',
      yPercent: 0,
      opacity: 1,
    });
    gsap.set([front.current, trailShape.current], { morphSVG: covered });
    /* The curtain has been up since the first paint, so only the remainder of
       the budget is still owed — never less than one readable beat. */
    const remaining = Math.max(minimumHold, introBudget - performance.now());
    if (!travels()) {
      /* One steady greeting rather than seven: cycling text is its own motion. */
      const hold = setTimeout(reveal, Math.min(remaining, calmHold));
      return () => {
        clearTimeout(hold);
        timeline.current?.kill();
        lock(false);
      };
    }
    const words = greetings.slice(
      0,
      Math.max(2, Math.min(greetings.length, Math.ceil(remaining / cadence))),
    );
    const timers = words.map((word, i) =>
      setTimeout(() => say(word), i * cadence),
    );
    timers.push(setTimeout(reveal, words.length * cadence));
    return () => {
      timers.forEach(clearTimeout);
      timeline.current?.kill();
      lock(false);
    };
  }, [entrance, lock, reveal, say]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (pending.current === pathname) {
        pending.current = null;
        if (watchdog.current) clearTimeout(watchdog.current);
        if (!historyNavigation.current) {
          window.scrollTo(0, 0);
          lenis.current?.scrollTo(0, { immediate: true, force: true });
        }
        historyNavigation.current = false;
        reveal();
        document
          .querySelector<HTMLElement>('main')
          ?.focus({ preventScroll: true });
      } else if (!busy.current) entrance();
    }, 50);
    return () => clearTimeout(id);
  }, [pathname, reveal, entrance]);
  useEffect(
    () => () => {
      if (watchdog.current) clearTimeout(watchdog.current);
    },
    [],
  );
  useEffect(() => {
    const onHistory = () => {
      // Fragment-only navigation stays within the article, without a curtain.
      if (window.location.pathname === pathname) return;
      timeline.current?.kill();
      if (watchdog.current) clearTimeout(watchdog.current);
      const target = window.location.pathname;
      pending.current = target;
      historyNavigation.current = true;
      busy.current = true;
      stage('intro');
      lock(true);
      say(destination(target), true);
      gsap.set([front.current, trailShape.current], { morphSVG: covered });
      gsap.set([overlay.current, trail.current], {
        visibility: 'visible',
        yPercent: 0,
        opacity: 1,
      });
      watchdog.current = setTimeout(() => {
        pending.current = null;
        reveal();
      }, 3000);
    };
    window.addEventListener('popstate', onHistory);
    return () => window.removeEventListener('popstate', onHistory);
  }, [destination, lock, pathname, reveal, say]);
  const navigate = useCallback(
    (href: string) => {
      if (busy.current || href === pathname) return;
      busy.current = true;
      pending.current = href;
      stage('intro');
      lock(true);
      timeline.current?.kill();
      const cover = gsap.timeline({
        onComplete: () => {
          router.push(href, { scroll: false });
          watchdog.current = setTimeout(() => {
            pending.current = null;
            reveal();
          }, 5000);
        },
      });
      timeline.current = cover;
      if (!travels()) {
        gsap.set([front.current, trailShape.current], { morphSVG: covered });
        gsap.set([overlay.current, trail.current], {
          visibility: 'visible',
          yPercent: 0,
          opacity: 0,
        });
        say(destination(href));
        cover.to([overlay.current, trail.current], {
          opacity: 1,
          duration: 0.28,
          ease: 'none',
        });
        return;
      }
      /* Rising from below, the accent panel leads and its convex edge flattens
         as it lands — the mirror of the lift, so the pair reads as one gesture. */
      gsap.set([front.current, trailShape.current], { morphSVG: arriving });
      gsap.set([overlay.current, trail.current], {
        visibility: 'visible',
        yPercent: 118,
        opacity: 1,
      });
      gsap.set(caption.current, { yPercent: 0, opacity: 0 });
      cover
        .to(trail.current, { yPercent: 0, duration: 0.62, ease: 'curtain' }, 0)
        .to(
          overlay.current,
          { yPercent: 0, duration: 0.62, ease: 'curtain' },
          0.035,
        )
        .to(
          [front.current, trailShape.current],
          { morphSVG: covered, duration: 0.62, ease: 'curtain' },
          0.035,
        )
        .add(() => say(destination(href), true), 0.34)
        .to(
          caption.current,
          { opacity: 1, duration: 0.25, ease: 'none' },
          0.34,
        );
    },
    [destination, lock, pathname, reveal, router, say],
  );
  return (
    <MotionContext.Provider value={{ navigate, lock, scrollToSection }}>
      {children}
      <div
        ref={trail}
        className="transition-curtain curtain-trail"
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path ref={trailShape} d={covered} />
        </svg>
      </div>
      <div ref={overlay} className="transition-curtain" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <path ref={front} d={covered} />
        </svg>
        <span ref={caption} suppressHydrationWarning>
          • Hello
        </span>
      </div>
    </MotionContext.Provider>
  );
}
