'use client';

import { useContext } from 'react';
import { MotionContext } from '@/components/motion/motion-provider';
import type { TocItem } from '@/lib/blog-utils';

export function TableOfContents({ headings }: { headings: TocItem[] }) {
  const { scrollToSection } = useContext(MotionContext);
  return (
    <nav aria-label="On this page">
      <p>On this page</p>
      <ol>
        {headings.map((heading) => (
          <li
            key={heading.id}
            className={heading.level === 3 ? 'subheading' : ''}
          >
            <a
              href={`#${heading.id}`}
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
