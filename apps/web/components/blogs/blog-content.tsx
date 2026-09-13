'use client';

import { useMemo } from 'react';
import { extractHeadings, slugify } from '@/lib/blog-utils';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(text: string): string {
  text = escapeHtml(text);
  // keep code spans before other inline
  const codes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codes.length;
    codes.push(`<code>${code}</code>`);
    return `__CODE_${idx}__`;
  });
  // images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) =>
    /^(https?:\/\/|\/(?!\/))/.test(url)
      ? `<img src="${url}" alt="${alt}" loading="lazy" />`
      : alt,
  );
  // links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
    /^(https?:\/\/|mailto:|#|\/(?!\/))/.test(url)
      ? `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`
      : label,
  );
  // bold **text**
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // italic *text* or _text_
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<!_)_\b([^_\n]+)_\b(?!_)/g, '<em>$1</em>');
  // restore codes
  text = text.replace(/__CODE_(\d+)__/g, (_, i) => codes[Number(i)]);
  return text;
}

function mdToHtml(md: string): string {
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
      if (pText) html += `<p>${inlineMd(pText)}</p>`;
      para = [];
    }
  };

  const pushListItem = (content: string) => {
    html += `<li>${inlineMd(content)}</li>`;
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
    // headings # ## ###
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (hm) {
      flushPara();
      if (inList) {
        html += `</${inList}>`;
        inList = null;
      }
      const level = hm[1].length;
      const text = hm[2].trim();
      const id =
        level > 1
          ? (headings[headingIndex++]?.id ?? slugify(text))
          : slugify(text);
      html += `<h${level} id="${id}">${inlineMd(text)}</h${level}>`;
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
      html += `<blockquote>${inlineMd(trimmed.slice(2).trim())}</blockquote>`;
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
      /^(#{1,3})\s+/.test(next) ||
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
  className,
}: {
  content: string;
  className?: string;
}) {
  const html = useMemo(() => mdToHtml(content), [content]);
  return (
    <div
      className={['blog-prose', className].filter(Boolean).join(' ')}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
