/**
 * Pure text transforms behind the editor toolbar.
 *
 * Kept free of React and the DOM so each one can be reasoned about — and
 * tested — as "given this text and selection, produce that text and
 * selection". The component only applies the result to the textarea.
 */

export type Selection = { start: number; end: number };
export type EditResult = { value: string; selection: Selection };

const LINE_BREAK = /\r\n|\r|\n/;

/** Expands a selection to cover the whole lines it touches. */
function lineRange(value: string, sel: Selection): Selection {
  const start = value.lastIndexOf('\n', sel.start - 1) + 1;
  const lineEnd = value.indexOf('\n', sel.end);
  return { start, end: lineEnd === -1 ? value.length : lineEnd };
}

function replace(
  value: string,
  range: Selection,
  text: string,
  selection: Selection,
): EditResult {
  return {
    value: value.slice(0, range.start) + text + value.slice(range.end),
    selection,
  };
}

/** Counts consecutive `char` starting at `index`, walking in `direction`. */
function runLength(
  value: string,
  index: number,
  char: string,
  direction: -1 | 1,
): number {
  let count = 0;
  for (let i = index; value[i] === char; i += direction) count += 1;
  return count;
}

/**
 * Wraps the selection in a marker, or unwraps it when that exact marker is
 * already there — so bold toggles rather than stacking asterisks.
 *
 * The run length has to match exactly. Without that check, pressing italic on
 * `**bold**` would strip one asterisk from each side and silently turn bold
 * into italic; it should nest to `***bold***` instead.
 */
export function toggleWrap(
  value: string,
  sel: Selection,
  marker: string,
  placeholder: string,
): EditResult {
  const selected = value.slice(sel.start, sel.end);
  const len = marker.length;
  const char = marker[0];

  // Marker inside the selection: «**like this**»
  if (
    selected.length >= len * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker) &&
    runLength(selected, 0, char, 1) === len &&
    runLength(selected, selected.length - 1, char, -1) === len
  ) {
    const inner = selected.slice(len, -len);
    return replace(value, sel, inner, {
      start: sel.start,
      end: sel.start + inner.length,
    });
  }

  // Marker just outside the selection: **«like this»**
  const before = value.slice(Math.max(0, sel.start - len), sel.start);
  const after = value.slice(sel.end, sel.end + len);
  if (
    before === marker &&
    after === marker &&
    runLength(value, sel.start - 1, char, -1) === len &&
    runLength(value, sel.end, char, 1) === len
  ) {
    return replace(
      value,
      { start: sel.start - len, end: sel.end + len },
      selected,
      { start: sel.start - len, end: sel.start - len + selected.length },
    );
  }

  const body = selected || placeholder;
  return replace(value, sel, `${marker}${body}${marker}`, {
    start: sel.start + len,
    end: sel.start + len + body.length,
  });
}

/**
 * Sets a line prefix on every selected line. Re-applying the same prefix
 * strips it, so "Heading 2" on an existing H2 returns it to a paragraph.
 */
export function toggleLinePrefix(
  value: string,
  sel: Selection,
  prefix: string,
  /** Other prefixes this one replaces, e.g. the other heading levels. */
  siblings: string[] = [],
): EditResult {
  const range = lineRange(value, sel);
  const block = value.slice(range.start, range.end);
  const lines = block.split(LINE_BREAK);
  const strip = [prefix, ...siblings];

  const already = lines.every(
    (line) => line.startsWith(prefix) || line.trim() === '',
  );

  let caretShift = 0;
  let lineStart = range.start;
  const next = lines
    .map((line) => {
      const thisLineStart = lineStart;
      lineStart += line.length + 1; // +1 for the newline that split removed
      if (line.trim() === '') return line;
      let bare = line;
      for (const candidate of strip) {
        if (bare.startsWith(candidate)) {
          bare = bare.slice(candidate.length);
          break;
        }
      }
      const out = already ? bare : `${prefix}${bare}`;
      /* Only the caret's own line moves it, by however much that line grew. */
      if (
        sel.start >= thisLineStart &&
        sel.start <= thisLineStart + line.length
      ) {
        caretShift = out.length - line.length;
      }
      return out;
    })
    .join('\n');

  return replace(
    value,
    range,
    next,
    caretSelection(sel, range, next, caretShift),
  );
}

/**
 * Where to leave the selection after a line-level edit.
 *
 * A collapsed caret stays put (shifted by the prefix), because selecting the
 * whole line would mean the next character typed replaces the heading you just
 * applied. A real selection keeps covering the lines it covered before.
 */
function caretSelection(
  sel: Selection,
  range: Selection,
  next: string,
  caretShift: number,
): Selection {
  if (sel.start !== sel.end) {
    return { start: range.start, end: range.start + next.length };
  }
  const caret = Math.min(
    Math.max(range.start, sel.start + caretShift),
    range.start + next.length,
  );
  return { start: caret, end: caret };
}

/** Numbers each selected line, or strips the numbering when already present. */
export function toggleOrderedList(value: string, sel: Selection): EditResult {
  const range = lineRange(value, sel);
  const lines = value.slice(range.start, range.end).split(LINE_BREAK);
  const numbered = /^\d+\.\s/;
  const already = lines.every(
    (line) => numbered.test(line) || line.trim() === '',
  );

  let n = 0;
  let caretShift = 0;
  let lineStart = range.start;
  const next = lines
    .map((line) => {
      const thisLineStart = lineStart;
      lineStart += line.length + 1;
      if (line.trim() === '') return line;
      const bare = line.replace(numbered, '').replace(/^[-*]\s/, '');
      let out = bare;
      if (!already) {
        n += 1;
        out = `${n}. ${bare}`;
      }
      if (
        sel.start >= thisLineStart &&
        sel.start <= thisLineStart + line.length
      ) {
        caretShift = out.length - line.length;
      }
      return out;
    })
    .join('\n');

  return replace(
    value,
    range,
    next,
    caretSelection(sel, range, next, caretShift),
  );
}

/**
 * Inserts a block element, padded so Markdown reads it as its own block.
 *
 * The blank line before is not cosmetic: `text\n---` is a setext heading in
 * Markdown, which would turn the paragraph above a divider into an H2.
 */
export function insertBlock(
  value: string,
  sel: Selection,
  block: string,
  /** Offset from the start of the inserted block to put the caret. */
  caretOffset?: number,
): EditResult {
  const before = value.slice(0, sel.start);
  const after = value.slice(sel.end);

  const lead =
    before === '' || before.endsWith('\n\n')
      ? ''
      : before.endsWith('\n')
        ? '\n'
        : '\n\n';
  const trail = after.startsWith('\n\n')
    ? ''
    : after.startsWith('\n')
      ? '\n'
      : '\n\n';

  const text = `${lead}${block}${trail}`;
  const caret = sel.start + lead.length + (caretOffset ?? block.length);
  return replace(value, sel, text, { start: caret, end: caret });
}

/** A fenced code block around the selection. */
export function codeBlock(value: string, sel: Selection): EditResult {
  const selected = value.slice(sel.start, sel.end);
  const body = selected || 'your code here';
  const block = `\`\`\`\n${body}\n\`\`\``;
  const result = insertBlock(value, sel, block, 4);
  return {
    value: result.value,
    selection: {
      start: result.selection.start,
      end: result.selection.start + body.length,
    },
  };
}

/** A markdown link, reusing the selection as the label when there is one. */
export function link(
  value: string,
  sel: Selection,
  url = 'https://',
): EditResult {
  const selected = value.slice(sel.start, sel.end);
  const label = selected || 'link text';
  const text = `[${label}](${url})`;
  const result = replace(value, sel, text, { start: 0, end: 0 });
  // Select whichever half the writer still has to fill in.
  const urlStart = sel.start + label.length + 3;
  return {
    value: result.value,
    selection: selected
      ? { start: urlStart, end: urlStart + url.length }
      : { start: sel.start + 1, end: sel.start + 1 + label.length },
  };
}

/** An image reference. Alt text is required, so it is what gets selected. */
export function image(
  value: string,
  sel: Selection,
  url: string,
  alt: string,
): EditResult {
  const label = alt || 'describe this image';
  const block = `![${label}](${url})`;
  const result = insertBlock(value, sel, block);
  const altStart = result.selection.start - block.length + 2;
  return {
    value: result.value,
    selection: alt
      ? result.selection
      : { start: altStart, end: altStart + label.length },
  };
}

export function table(value: string, sel: Selection): EditResult {
  const block = [
    '| Column | Column |',
    '| --- | --- |',
    '| Value | Value |',
  ].join('\n');
  return insertBlock(value, sel, block, 2);
}
