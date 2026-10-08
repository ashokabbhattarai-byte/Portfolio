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
  }, [key, headings]);

  useEffect(() => {
    let cleanup: (() => void) | void;
    const arm = () => {
      const node = ref.current;
      if (!node || !travels()) return;
      const items = node.querySelectorAll('li');
      if (items.length === 0) return;
      const tween = gsap.from(items, {
        y: 12,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.05,
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
  }, [key]);

  return (
    <nav ref={ref} aria-label="On this page" className="toc-nav">
      <style>{`.toc-nav {
  display: flex;
  flex-direction: column;
}
.toc-label {
  font-size: 11.5px !important;
  letter-spacing: 0.16em !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  color: var(--accent) !important;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
}
.toc-label::before {
  content: '';
  width: 22px;
  height: 2px;
  border-radius: 999px;
  background: var(--accent);
  display: inline-block;
}
.toc-list {
  list-style: none !important;
  padding: 0 !important;
  margin: 0 !important;
  border-left: 1px solid var(--line);
}
.toc-list li {
  list-style: none !important;
}
.toc-link {
  min-height: 38px;
  display: flex;
  align-items: center;
  font-size: 13.5px;
  border-left: 2px solid transparent;
  padding: 6px 0 6px 14px;
  margin-left: -1px;
  line-height: 1.45;
  color: var(--muted);
  text-decoration: none;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.toc-link:hover {
  color: var(--accent);
  border-left-color: var(--accent);
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 8%, transparent), transparent);
}
.toc-link[aria-current='true'] {
  color: var(--accent);
  border-left-color: var(--accent);
  font-weight: 550;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent);
}
li.toc-sub {
  padding-left: 16px;
}
li.toc-sub .toc-link {
  font-size: 12.5px;
}
@media (max-width: 1024px) {
  .toc-list {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    border-left: 0 !important;
    padding-bottom: 8px;
    width: 100%;
    max-width: 100%;
  }
  .toc-list::-webkit-scrollbar {
    display: none;
  }
  .toc-list li {
    flex-shrink: 0;
  }
  li.toc-sub {
    padding-left: 0;
  }
  .toc-link {
    min-height: 36px;
    border: 1px solid var(--line);
    border-radius: 999px;
    padding: 6px 14px;
    white-space: nowrap;
    font-size: 13px;
    margin-left: 0;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.65);
  }
  .toc-link:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .toc-link[aria-current='true'] {
    background: var(--accent);
    color: #ffffff;
    border-color: var(--accent);
  }
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
