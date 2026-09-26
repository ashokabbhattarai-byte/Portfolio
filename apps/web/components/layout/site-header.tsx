'use client';
import { useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { TransitionLink } from '@/components/motion/transition-link';
import { Magnetic } from '@/components/motion/magnetic';
import { travels } from '@/components/motion/flow';
import { MotionContext } from '@/components/motion/motion-provider';
const links = [
  ['/', 'Home'],
  ['/projects', 'Projects'],
  ['/blog', 'Blogs'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
];
/* Client component: profile comes down as props from the
   (public) layout rather than from a server fetch. */
export function SiteHeader({
  github,
  resume,
  name,
}: {
  github: string;
  resume: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTween = useRef<gsap.core.Tween | null>(null);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 22);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      closeTween.current?.kill();
    };
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { lock } = useContext(MotionContext);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open) {
      node.showModal();
      lock(true, 'menu');
      const full = travels();
      const context = gsap.context(() => {
        /* Calm mode opens in place: the panel appears rather than slides. */
        gsap.fromTo(
          node,
          { xPercent: full ? 100 : 0, opacity: full ? 1 : 0 },
          {
            xPercent: 0,
            opacity: 1,
            duration: full ? 0.6 : 0.25,
            ease: full ? 'curtain' : 'none',
          },
        );
        gsap.fromTo(
          '.drawer-link',
          { y: full ? 45 : 0, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: full ? 0.065 : 0.035,
            duration: full ? 0.6 : 0.3,
            ease: full ? 'rise' : 'none',
          },
        );
      }, node);
      return () => context.revert();
    }
    node.close();
    lock(false, 'menu');
  }, [open, lock]);
  const close = (immediate = false) => {
    const finish = () => {
      setOpen(false);
      trigger.current?.focus();
    };
    closeTween.current?.kill();
    if (immediate) {
      finish();
      return;
    }
    const full = travels();
    closeTween.current = gsap.to(dialog.current, {
      xPercent: full ? 105 : 0,
      opacity: full ? 1 : 0,
      duration: full ? 0.45 : 0.01,
      ease: full ? 'curtain' : 'none',
      onComplete: finish,
    });
  };
  return (
    <>
      <header
        className={`site-header ${pathname === '/' ? 'on-hero' : ''} ${scrolled ? 'is-scrolled' : ''}`}
      >
        <TransitionLink
          href="/"
          className="wordmark"
          aria-label={`ab. ${name}, home`}
        >
          <span className="mark">ab.</span>
          <span>{name}</span>
        </TransitionLink>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.slice(1).map(([href, title]) => (
            <Magnetic key={href}>
              <TransitionLink
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
              >
                {title}
              </TransitionLink>
            </Magnetic>
          ))}
        </nav>
      </header>
      <div className={`menu-dock ${scrolled ? 'is-scrolled' : ''}`}>
        <Magnetic>
          <button
            ref={trigger}
            className="menu-trigger"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            aria-controls="navigation-drawer"
          >
            <span />
            <span />
          </button>
        </Magnetic>
      </div>
      <dialog
        id="navigation-drawer"
        ref={dialog}
        className="navigation-drawer"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            close();
          }
        }}
        aria-label="Navigation"
      >
        <button
          className="drawer-close"
          onClick={() => close()}
          aria-label="Close navigation"
        >
          ✕
        </button>
        <p className="utility">Navigation</p>
        <nav aria-label="Expanded navigation">
          {links.map(([href, title]) => (
            <TransitionLink
              key={href}
              className="drawer-link"
              href={href}
              onClick={() => close(true)}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {title}
              <span aria-hidden="true">↗</span>
            </TransitionLink>
          ))}
        </nav>
        <div className="drawer-bottom">
          <a href={github} target="_blank" rel="noreferrer">
            GitHub <span aria-hidden="true">↗</span>
          </a>
          <a href={resume} target="_blank" rel="noreferrer">
            View résumé <span aria-hidden="true">↗</span>
          </a>
          <p>Full-stack engineering and applied AI, from Nepal.</p>
        </div>
      </dialog>
    </>
  );
}
