'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { MediaAsset } from '@portfolio/types';
import { MediaPickerDialog } from './media-picker';
import {
  codeBlock,
  image as imageEdit,
  insertBlock,
  link as linkEdit,
  table as tableEdit,
  toggleLinePrefix,
  toggleOrderedList,
  toggleWrap,
  type EditResult,
  type Selection,
} from './markdown-toolbar';

/** An action the toolbar can run against the current value and selection. */
type Action = (value: string, sel: Selection) => EditResult;

/** Shared across both control kinds so the render loop can read `shortcut`
 *  without narrowing first. */
type ItemBase = {
  id: string;
  label: string;
  glyph: string;
  shortcut?: string;
};

type Item =
  | (ItemBase & { kind: 'button'; run: Action })
  | (ItemBase & { kind: 'media' })
  | { kind: 'separator' };

/* H1 is the article title, so the body starts at H2. Each carries a plain
   description because "Heading 3" alone does not tell a writer when to use it. */
const HEADINGS = [
  { level: 2, label: 'Heading 2', prefix: '## ', hint: 'a main section' },
  { level: 3, label: 'Heading 3', prefix: '### ', hint: 'a sub-section' },
  { level: 4, label: 'Heading 4', prefix: '#### ', hint: 'a minor point' },
];
const ALL_HEADING_PREFIXES = [
  '## ',
  '### ',
  '#### ',
  '# ',
  '##### ',
  '###### ',
];

const ITEMS: Item[] = [
  {
    kind: 'button',
    id: 'bold',
    label: 'Bold',
    glyph: 'B',
    shortcut: '⌘B',
    run: (v, s) => toggleWrap(v, s, '**', 'bold text'),
  },
  {
    kind: 'button',
    id: 'italic',
    label: 'Italic',
    glyph: 'I',
    shortcut: '⌘I',
    run: (v, s) => toggleWrap(v, s, '*', 'italic text'),
  },
  {
    kind: 'button',
    id: 'strike',
    label: 'Strikethrough',
    glyph: 'S',
    run: (v, s) => toggleWrap(v, s, '~~', 'struck through'),
  },
  {
    kind: 'button',
    id: 'code',
    label: 'Inline code',
    glyph: '`',
    run: (v, s) => toggleWrap(v, s, '`', 'code'),
  },
  { kind: 'separator' },
  {
    kind: 'button',
    id: 'bullet',
    label: 'Bulleted list',
    glyph: '•',
    run: (v, s) => toggleLinePrefix(v, s, '- ', ['* ']),
  },
  {
    kind: 'button',
    id: 'number',
    label: 'Numbered list',
    glyph: '1.',
    run: toggleOrderedList,
  },
  {
    kind: 'button',
    id: 'quote',
    label: 'Quote',
    glyph: '❝',
    run: (v, s) => toggleLinePrefix(v, s, '> '),
  },
  { kind: 'separator' },
  {
    kind: 'button',
    id: 'link',
    label: 'Link',
    glyph: 'Link',
    shortcut: '⌘K',
    run: (v, s) => linkEdit(v, s),
  },
  { kind: 'media', id: 'image', label: 'Insert image', glyph: 'Image' },
  { kind: 'separator' },
  {
    kind: 'button',
    id: 'codeblock',
    label: 'Code block',
    glyph: '{ }',
    run: codeBlock,
  },
  { kind: 'button', id: 'table', label: 'Table', glyph: '▦', run: tableEdit },
  {
    kind: 'button',
    id: 'rule',
    label: 'Divider',
    glyph: '—',
    run: (v, s) => insertBlock(v, s, '---'),
  },
];

/**
 * Markdown editor with a formatting toolbar.
 *
 * Stays a plain textarea on purpose: the content is stored and published as
 * Markdown, and a rich-text surface would have to round-trip through it on
 * every keystroke. The toolbar just writes the syntax so nobody has to
 * remember it, and every action is reversible by pressing the same button.
 */
export function MarkdownEditor({
  id,
  label,
  value,
  onChange,
  rows = 22,
  required,
  error,
  hint,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [picking, setPicking] = useState(false);

  /* Where the caret should land once React has committed the new value. */
  const pendingSelection = useRef<Selection | null>(null);

  /* Restoring the selection has to happen *after* React writes the new value
     to the DOM. Doing it in a rAF callback races the commit: the range lands
     on the old text and the next render throws it away, which corrupts the
     document as soon as two edits happen in quick succession. */
  useLayoutEffect(() => {
    const node = ref.current;
    const next = pendingSelection.current;
    if (!node || !next) return;
    pendingSelection.current = null;
    node.focus();
    node.setSelectionRange(next.start, next.end);
  });

  /** Applies an edit and queues the resulting selection. Reads from the React
   *  value rather than the DOM node so the two can never drift apart. */
  const apply = useCallback(
    (action: Action) => {
      const node = ref.current;
      if (!node) return;
      const result = action(value, {
        start: node.selectionStart,
        end: node.selectionEnd,
      });
      pendingSelection.current = result.selection;
      onChange(result.value);
    },
    [value, onChange],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const shortcut: Record<string, Action> = {
      b: (v, s) => toggleWrap(v, s, '**', 'bold text'),
      i: (v, s) => toggleWrap(v, s, '*', 'italic text'),
      k: (v, s) => linkEdit(v, s),
    };
    if (shortcut[key]) {
      event.preventDefault();
      apply(shortcut[key]);
    }
  }

  const describedBy =
    [hint ? `${id}-hint` : '', error ? `${id}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className="adm-field span-all md-field">
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div
        className="md-toolbar"
        role="toolbar"
        aria-label="Formatting"
        aria-controls={id}
      >
        {/* Headings sit in the open rather than behind a menu: they are the
            structure of the article, and hiding them one click deep makes an
            unstructured wall of text the path of least resistance. */}
        <button
          type="button"
          className="md-btn md-btn-para"
          disabled={disabled}
          title="Normal text"
          aria-label="Normal text"
          onClick={() =>
            apply((v, sel) =>
              toggleLinePrefix(v, sel, '', ALL_HEADING_PREFIXES),
            )
          }
        >
          <span aria-hidden="true">¶</span>
        </button>
        {HEADINGS.map((heading) => (
          <button
            key={heading.level}
            type="button"
            className={`md-btn md-btn-heading md-btn-h${heading.level}`}
            disabled={disabled}
            title={`${heading.label} — ${heading.hint}`}
            aria-label={heading.label}
            onClick={() =>
              apply((v, sel) =>
                toggleLinePrefix(
                  v,
                  sel,
                  heading.prefix,
                  ALL_HEADING_PREFIXES.filter((p) => p !== heading.prefix),
                ),
              )
            }
          >
            <span aria-hidden="true">H{heading.level}</span>
          </button>
        ))}

        <span className="md-sep" aria-hidden="true" />

        {ITEMS.map((item, index) =>
          item.kind === 'separator' ? (
            <span key={`sep-${index}`} className="md-sep" aria-hidden="true" />
          ) : (
            <button
              key={item.id}
              type="button"
              className={`md-btn md-btn-${item.id}`}
              disabled={disabled}
              title={
                item.shortcut ? `${item.label} (${item.shortcut})` : item.label
              }
              aria-label={item.label}
              onClick={() =>
                item.kind === 'media' ? setPicking(true) : apply(item.run)
              }
            >
              <span aria-hidden="true">{item.glyph}</span>
            </button>
          ),
        )}
      </div>

      <textarea
        ref={ref}
        id={id}
        name={id}
        rows={rows}
        value={value}
        disabled={disabled}
        required={required}
        spellCheck
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Write your article here. Use the toolbar above, or type Markdown directly."
      />

      {hint ? (
        <span className="adm-hint" id={`${id}-hint`}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="adm-err" id={`${id}-error`} role="alert">
          {error}
        </span>
      ) : null}

      {/* Inserting an image goes through the media library, so every picture
          in an article is a tracked asset with alt text rather than a URL
          typed in by hand. */}
      <MediaPickerDialog
        open={picking}
        title="Insert an image"
        onClose={() => setPicking(false)}
        onPick={(asset: MediaAsset | null) => {
          if (!asset) return;
          apply((v, s) => imageEdit(v, s, asset.url, asset.alt));
        }}
      />
    </div>
  );
}
