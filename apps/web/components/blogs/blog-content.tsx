'use client';

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { extractHeadings, slugify } from '@/lib/blog-utils';
import { travels, watchFlow } from '@/components/motion/flow';

gsap.registerPlugin(ScrollTrigger);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(text: string, imgFallback = 'Article image'): string {
  text = escapeHtml(text);
  // keep code spans before other inline
  const codes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codes.length;
    codes.push(`<code>${code}</code>`);
    return `__CODE_${idx}__`;
  });
  // images ![alt](url) → figure + figcaption with dimensions to avoid CLS
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    if (!/^(https?:\/\/|\/(?!\/))/.test(url)) return alt;
    const img = `<img src="${url}" alt="${alt || imgFallback}" loading="lazy" width="1200" height="675" />`;
    return alt
      ? `<figure class="blog-figure">${img}<figcaption>${alt}</figcaption></figure>`
      : `<figure class="blog-figure">${img}</figure>`;
  });
  // links [text](url) — only external/mailto open a new tab
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    if (/^(https?:\/\/|mailto:)/.test(url))
      return `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
    if (/^(#|\/(?!\/))/.test(url)) return `<a href="${url}">${label}</a>`;
    return label;
  });
  // bold **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *text* or _text_
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<!_)_\b([^_\n]+)_\b(?!_)/g, '<em>$1</em>');
  // restore codes
  text = text.replace(/__CODE_(\d+)__/g, (_, i) => codes[Number(i)]);
  return text;
}

function mdToHtml(md: string, imgFallback = 'Article image'): string {
  const headings = extractHeadings(md);
  let headingIndex = 0;
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let inList: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeLang = '';
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      const pText = para.join(' ').trim();
      if (pText) html += `<p>${inlineMd(pText, imgFallback)}</p>`;
      para = [];
    }
  };

  const pushListItem = (content: string) => {
    html += `<li>${inlineMd(content, imgFallback)}</li>`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // code block ```
    if (line.trim().startsWith('```')) {
      if (!inCode) {
        flushPara();
        if (inList) {
          html += `</${inList}>`;
          inList = null;
        }
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        html += `<pre><code${codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ''}>`;
      } else {
        html += `</code></pre>`;
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      html += `${escapeHtml(line)}\n`;
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      if (inList) {
        html += `</${inList}>`;
        inList = null;
      }
      continue;
    }
    // headings # ## ### ####
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) {
      flushPara();
      if (inList) {
        html += `</${inList}>`;
        inList = null;
      }
      const level = hm[1].length;
      const text = hm[2].trim();
      /* extractHeadings only tracks h2/h3 for the TOC — h1/h4 ids come
         straight from the text so the headingIndex stays aligned. */
      const id =
        level === 2 || level === 3
          ? (headings[headingIndex++]?.id ?? slugify(text))
          : slugify(text);
      html += `<h${level} id="${id}">${inlineMd(text, imgFallback)}</h${level}>`;
      continue;
    }
    // hr ---
    if (/^---+$/.test(trimmed)) {
      flushPara();
      if (inList) {
        html += `</${inList}>`;
        inList = null;
      }
      html += '<hr />';
      continue;
    }
    // blockquote >
    if (trimmed.startsWith('> ')) {
      flushPara();
      if (inList) {
        html += `</${inList}>`;
        inList = null;
      }
      html += `<blockquote>${inlineMd(trimmed.slice(2).trim(), imgFallback)}</blockquote>`;
      continue;
    }
    // ul - or * or •
    if (/^[-*•]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*•]\s+/, '');
      if (inList !== 'ul') {
        if (inList) html += `</${inList}>`;
        html += '<ul>';
        inList = 'ul';
      }
      pushListItem(content);
      continue;
    }
    // ol 1. 2.
    if (/^\d+\.\s+/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s+/, '');
      if (inList !== 'ol') {
        if (inList) html += `</${inList}>`;
        html += '<ol>';
        inList = 'ol';
      }
      pushListItem(content);
      continue;
    }
    // paragraph - accumulate
    // need to handle inline without escaping twice
    // we flush via separate logic - collect raw lines
    if (inList) {
      // if we are in list but line is not list item, close list
      // actually list items already handled, so this line is paragraph inside list? treat as new para
      html += `</${inList}>`;
      inList = null;
    }
    para.push(line);
    // if next line is empty or heading/list, flush
    const next = lines[i + 1];
    if (
      next === undefined ||
      next.trim() === '' ||
      /^(#{1,4})\s+/.test(next) ||
      /^[-*•]\s+/.test(next.trim()) ||
      /^\d+\.\s+/.test(next.trim()) ||
      next.trim().startsWith('```') ||
      next.trim().startsWith('> ') ||
      /^---+$/.test((next || '').trim())
    ) {
      // flush para as one paragraph
      if (para.length) {
        const pText = para.join(' ').trim();
        // for paragraph, we need to inline without pre-escaping the whole (inlineMd will handle)
        // but we have raw text, so inlineMd will escape as needed via its internal code handling
        // We should not escape before inlineMd, inlineMd does selective escaping
        // So we pass raw
        // For now, we need a version that doesn't double escape: we will manually handle
        // Instead of flushPara's previous logic, we do:
        html += `<p>${inlineMd(pText)}</p>`;
        para = [];
      }
    }
  }
  flushPara();
  if (inCode) html += '</code></pre>';
  if (inList) html += `</${inList}>`;
  return html;
}

export function BlogContent({
  content,
  title,
  className,
}: {
  content: string;
  title?: string;
  className?: string;
}) {
  const html = useMemo(
    () => mdToHtml(content, title ?? 'Article image'),
    [content, title],
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    /* Tables authored as raw HTML get a scrollable wrapper. Runs in every
       flow mode — layout safety is not motion. */
    root.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('blog-table-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'blog-table-wrap';
      table.replaceWith(wrap);
      wrap.appendChild(table);
    });
    let cleanup: (() => void) | void;
    const arm = () => {
      const node = ref.current;
      if (!node || !travels()) return;
      const children = Array.from(
        node.querySelectorAll<HTMLElement>(
          ':scope > p, :scope > h2, :scope > h3, :scope > h4, :scope > ul, :scope > ol, :scope > blockquote, :scope > pre, :scope > figure, :scope > hr, :scope > .blog-table-wrap',
        ),
      );
      if (children.length === 0) return;
      gsap.set(children, { y: 34, opacity: 0 });
      const triggers = ScrollTrigger.batch(children, {
        start: 'top 94%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            stagger: 0.08,
            overwrite: 'auto',
          }),
      });
      const cleanups = children.map((element) => {
        const reveal = () =>
          gsap.to(element, {
            y: 0,
            opacity: 1,
            duration: 0.45,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        element.addEventListener('focusin', reveal);
        return () => element.removeEventListener('focusin', reveal);
      });
      ScrollTrigger.refresh();
      return () => {
        cleanups.forEach((fn) => fn());
        triggers.forEach((trigger) => trigger.kill());
        gsap.set(children, { clearProps: 'all' });
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
  }, [html]);
  return (
    <>
      <style>{`.blog-prose h4{scroll-margin-top:110px;line-height:1.3;letter-spacing:-0.02em;font-weight:500;margin:2em 0 0.7em;font-size:20px;}
.blog-prose pre{background:var(--deep) !important;border:1px solid color-mix(in srgb, var(--highlight) calc(0.2 * 100%), transparent);border-radius:22px;font-size:16px;}
.blog-prose :not(pre) > code{border-radius:8px;border:1px solid rgba(82,119,71,0.25);background:color-mix(in srgb, var(--highlight) calc(0.12 * 100%), transparent);}
.blog-prose blockquote{border-left:3px solid color-mix(in srgb, var(--accent) 60%, transparent);background:color-mix(in srgb, var(--highlight) calc(0.12 * 100%), transparent);border-radius:0 22px 22px 0;}
.blog-prose hr{border-top-color:#c8d1df;}
.blog-prose .blog-figure{margin:1.6em 0;}
.blog-prose .blog-figure img{border-radius:22px;width:100%;height:auto;}
.blog-prose .blog-figure figcaption{color:#556479;font-size:14px;line-height:1.6;margin-top:12px;}
.blog-table-wrap{overflow-x:auto;margin:1.6em 0;}
.blog-table-wrap table{width:100%;border-collapse:collapse;font-size:16px;}
@media (max-width: 600px){.blog-prose pre{padding:16px;font-size:14px;}}
@media (max-width: 480px){.blog-prose{font-size:17px;}.blog-prose h2{font-size:26px;}.blog-prose h3{font-size:22px;}}
@media (max-width: 360px){.blog-prose{font-size:16px;}}`}</style>
      <div
        ref={ref}
        className={['blog-prose', className].filter(Boolean).join(' ')}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
