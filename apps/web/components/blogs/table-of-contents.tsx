'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MotionContext } from '@/components/motion/motion-provider';
import { travels, watchFlow } from '@/components/motion/flow';
import type { TocItem } from '@/lib/blog-utils';

export function TableOfContents({ headings }: { headings: TocItem[] }) {
  const { scrollToSection } = useContext(MotionContext);
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const key = headings.map((h) => h.id).join('|');

  useEffect(() => {
    if (headings.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    let cleanup: (() => void) | void;
    const arm = () => {
      const node = ref.current;
      if (!node || !travels()) return;
      const items = node.querySelectorAll('li');
      if (items.length === 0) return;
      const tween = gsap.from(items, {
        y: 16,
        opacity: 0,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.06,
      });
      return () => {
        tween.kill();
        gsap.set(items, { clearProps: 'all' });
      };
    };
    const rearm = () => {
      if (typeof cleanup === 'function') cleanup();
      cleanup = arm();
    };
    rearm();
    const stop = watchFlow(rearm);
    return () => {
      stop();
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <nav ref={ref} aria-label="On this page" className="toc-nav">
      <style>{`.toc-label{font-size:12px !important;letter-spacing:0.16em !important;font-weight:600 !important;color:color-mix(in srgb, var(--accent) 60%, transparent) !important;display:flex;align-items:center;gap:10px;}
.toc-label::before{content:'';width:28px;height:2px;border-radius:999px;background:linear-gradient(90deg, color-mix(in srgb, var(--accent) 60%, transparent), var(--highlight));display:inline-block;}
.article-sidebar .toc-link{min-height:44px;display:flex;align-items:center;font-size:15px;border-left:2px solid transparent;line-height:1.5;transition:color 0.3s ease, border-color 0.3s ease, background 0.3s ease;}
.article-sidebar .toc-link:hover{color:color-mix(in srgb, var(--accent) 60%, transparent);border-left-color:var(--accent);background:linear-gradient(90deg, color-mix(in srgb, var(--highlight) calc(0.14 * 100%), transparent), transparent);}
.article-sidebar .toc-link[aria-current='true']{color:color-mix(in srgb, var(--accent) 60%, transparent);border-left-color:color-mix(in srgb, var(--accent) 60%, transparent);background:linear-gradient(90deg, color-mix(in srgb, var(--highlight) calc(0.18 * 100%), transparent), transparent);}
.article-sidebar li.toc-sub{padding-left:28px;}
.article-sidebar li.toc-sub .toc-link{font-size:14px;}
@media (max-width: 800px){
.toc-list{display:flex;gap:8px;overflow-x:auto;border-left:0 !important;padding-bottom:8px;}
.toc-list li{flex-shrink:0;}
.toc-list li.toc-sub{padding-left:0;}
.article-sidebar .toc-link{min-height:44px;border:1px solid rgba(82,119,71,0.25);border-left:1px solid rgba(82,119,71,0.25);border-radius:999px;padding:8px 16px;white-space:nowrap;font-size:14px;color:color-mix(in srgb, var(--accent) 60%, transparent);background:color-mix(in srgb, var(--highlight) calc(0.12 * 100%), transparent);}
.article-sidebar .toc-link[aria-current='true']{background:color-mix(in srgb, var(--accent) 60%, transparent);color:var(--paper);border-color:color-mix(in srgb, var(--accent) 60%, transparent);}
}`}</style>
      <p className="toc-label">On this page</p>
      <ol className="toc-list">
        {headings.map((heading) => (
          <li key={heading.id} className={heading.level === 3 ? 'toc-sub' : ''}>
            <a
              className="toc-link"
              href={`#${heading.id}`}
              aria-current={active === heading.id ? 'true' : undefined}
              onClick={(event) => {
                if (
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                )
                  return;
                const target = document.getElementById(heading.id);
                if (!target) return;
                event.preventDefault();
                // Lenis also listens for anchors at window level; scroll only once.
                event.stopPropagation();
                window.history.replaceState(
                  window.history.state,
                  '',
                  `#${encodeURIComponent(heading.id)}`,
                );
                scrollToSection(target);
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
