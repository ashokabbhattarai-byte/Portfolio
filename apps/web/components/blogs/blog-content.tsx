'use client';

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { extractHeadings, slugify } from '@/lib/blog-utils';

gsap.registerPlugin(ScrollTrigger);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(text: string, imgFallback = 'Article image'): string {
  // 1. extract code spans
  const codes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codes.length;
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `__CODE_${idx}__`;
  });

  // 2. extract images ![alt](url)
  const images: string[] = [];
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const idx = images.length;
    if (!/^(https?:\/\/|\/(?!\/))/.test(url)) {
      images.push(escapeHtml(alt));
    } else {
      const cleanUrl = url.trim();
      const cleanAlt = escapeHtml(alt || imgFallback);
      const img = `<img src="${cleanUrl}" alt="${cleanAlt}" loading="lazy" decoding="async" width="1200" height="675" />`;
      images.push(
        alt
          ? `<span class="blog-inline-figure">${img}<span class="blog-caption">${cleanAlt}</span></span>`
          : `<span class="blog-inline-figure">${img}</span>`,
      );
    }
    return `__IMG_${idx}__`;
  });

  // 3. extract links [label](url)
  const links: string[] = [];
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const idx = links.length;
    const cleanUrl = url.trim();
    const cleanLabel = escapeHtml(label);
    if (/^(https?:\/\/|mailto:)/.test(cleanUrl)) {
      links.push(
        `<a href="${cleanUrl}" target="_blank" rel="noreferrer">${cleanLabel}</a>`,
      );
    } else if (/^(#|\/(?!\/))/.test(cleanUrl)) {
      links.push(`<a href="${cleanUrl}">${cleanLabel}</a>`);
    } else {
      links.push(cleanLabel);
    }
    return `__LINK_${idx}__`;
  });

  // 4. escape remaining text
  text = escapeHtml(text);

  // 5. bold & italic
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<!_)_\b([^_\n]+)_\b(?!_)/g, '<em>$1</em>');

  // 6. restore tokens
  text = text.replace(/__LINK_(\d+)__/g, (_, i) => links[Number(i)]);
  text = text.replace(/__IMG_(\d+)__/g, (_, i) => images[Number(i)]);
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

    // standalone image line ![alt](url)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      flushPara();
      if (inList) {
        html += `</${inList}>`;
        inList = null;
      }
      const alt = imgMatch[1];
      const url = imgMatch[2].trim();
      if (/^(https?:\/\/|\/(?!\/))/.test(url)) {
        const cleanAlt = escapeHtml(alt || imgFallback);
        html += `<figure class="blog-figure"><img src="${url}" alt="${cleanAlt}" loading="lazy" decoding="async" width="1200" height="675" />${alt ? `<figcaption>${cleanAlt}</figcaption>` : ''}</figure>`;
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
      // Skip top-level H1 from markdown as the page hero already renders the title
      if (level === 1) {
        continue;
      }
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
    if (inList) {
      html += `</${inList}>`;
      inList = null;
    }
    para.push(line);
    const next = lines[i + 1];
    if (
      next === undefined ||
      next.trim() === '' ||
      /^(#{1,4})\s+/.test(next) ||
      /^[-*•]\s+/.test(next.trim()) ||
      /^\d+\.\s+/.test(next.trim()) ||
      next.trim().startsWith('```') ||
      next.trim().startsWith('> ') ||
      /^!\[([^\]]*)\]\(([^)]+)\)$/.test(next.trim()) ||
      /^---+$/.test((next || '').trim())
    ) {
      flushPara();
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
    // Content is kept fully visible and legible for peak readability and SEO.
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
