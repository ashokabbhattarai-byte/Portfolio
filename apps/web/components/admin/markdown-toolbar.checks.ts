import { describe, expect, test } from 'bun:test';
import {
  codeBlock,
  image,
  insertBlock,
  link,
  table,
  toggleLinePrefix,
  toggleOrderedList,
  toggleWrap,
} from './markdown-toolbar';

/** Writes the selection inline as «…» so expectations read as what the writer
 *  would see highlighted in the textarea afterwards. */
function show({
  value,
  selection,
}: {
  value: string;
  selection: { start: number; end: number };
}) {
  return (
    value.slice(0, selection.start) +
    '«' +
    value.slice(selection.start, selection.end) +
    '»' +
    value.slice(selection.end)
  );
}

/** Parses the same notation, so a test can state its input the same way. */
function at(text: string) {
  const start = text.indexOf('«');
  const end = text.indexOf('»') - 1;
  return { value: text.replace(/[«»]/g, ''), selection: { start, end } };
}

describe('inline formatting', () => {
  test('wraps a selection and keeps it selected', () => {
    const { value, selection } = at('make «this» bold');
    expect(show(toggleWrap(value, selection, '**', 'bold text'))).toBe(
      'make **«this»** bold',
    );
  });

  test('inserts a placeholder when nothing is selected', () => {
    const { value, selection } = at('start «»here');
    expect(show(toggleWrap(value, selection, '**', 'bold text'))).toBe(
      'start **«bold text»**here',
    );
  });

  test('unwraps when the markers are inside the selection', () => {
    const { value, selection } = at('make «**this**» plain');
    expect(show(toggleWrap(value, selection, '**', 'x'))).toBe(
      'make «this» plain',
    );
  });

  test('unwraps when the markers sit just outside the selection', () => {
    const { value, selection } = at('make **«this»** plain');
    expect(show(toggleWrap(value, selection, '**', 'x'))).toBe(
      'make «this» plain',
    );
  });

  test('italic nests inside bold rather than eating one asterisk', () => {
    const { value, selection } = at('**«bold»**');
    expect(toggleWrap(value, selection, '*', 'x').value).toBe('***bold***');
  });

  test('bold still unwraps its own markers when italic is adjacent', () => {
    const { value, selection } = at('*«**both**»*');
    expect(toggleWrap(value, selection, '**', 'x').value).toBe('*both*');
  });
});

describe('line prefixes', () => {
  test('applies a heading to the line the caret is on', () => {
    const { value, selection } = at('Introdu«»ction');
    expect(toggleLinePrefix(value, selection, '## ').value).toBe(
      '## Introduction',
    );
  });

  test('toggles the same heading back off', () => {
    const { value, selection } = at('## Introdu«»ction');
    expect(toggleLinePrefix(value, selection, '## ').value).toBe(
      'Introduction',
    );
  });

  test('switches between heading levels instead of stacking', () => {
    const { value, selection } = at('## Head«»ing');
    expect(
      toggleLinePrefix(value, selection, '### ', ['## ', '#### ']).value,
    ).toBe('### Heading');
  });

  test('prefixes every line of a multi-line selection', () => {
    const { value, selection } = at('«one\ntwo\nthree»');
    expect(toggleLinePrefix(value, selection, '- ').value).toBe(
      '- one\n- two\n- three',
    );
  });

  test('leaves blank lines alone', () => {
    const { value, selection } = at('«one\n\ntwo»');
    expect(toggleLinePrefix(value, selection, '> ').value).toBe(
      '> one\n\n> two',
    );
  });
});

describe('ordered lists', () => {
  test('numbers the selected lines', () => {
    const { value, selection } = at('«first\nsecond\nthird»');
    expect(toggleOrderedList(value, selection).value).toBe(
      '1. first\n2. second\n3. third',
    );
  });

  test('strips numbering when it is already there', () => {
    const { value, selection } = at('«1. first\n2. second»');
    expect(toggleOrderedList(value, selection).value).toBe('first\nsecond');
  });

  test('converts a bulleted list rather than doubling the marker', () => {
    const { value, selection } = at('«- first\n- second»');
    expect(toggleOrderedList(value, selection).value).toBe(
      '1. first\n2. second',
    );
  });
});

describe('blocks', () => {
  test('a code block selects the body for immediate typing', () => {
    const { value, selection } = at('intro«»');
    const result = codeBlock(value, selection);
    expect(result.value).toBe('intro\n\n```\nyour code here\n```\n\n');
    expect(
      result.value.slice(result.selection.start, result.selection.end),
    ).toBe('your code here');
  });

  test('a code block keeps the selected text as its body', () => {
    const { value, selection } = at('«const x = 1;»');
    expect(codeBlock(value, selection).value).toContain(
      '```\nconst x = 1;\n```',
    );
  });

  /* The blank line matters: "above\n---" is a setext H2 in Markdown, so a
     divider inserted without it would silently restyle the line above. */
  test('a block keeps a blank line above so it is not read as a heading', () => {
    const { value, selection } = at('above\n«»');
    expect(insertBlock(value, selection, '---').value).toBe('above\n\n---\n\n');
  });

  test('an existing blank line is not doubled', () => {
    const { value, selection } = at('above\n\n«»');
    expect(insertBlock(value, selection, '---').value).toBe('above\n\n---\n\n');
  });

  test('a table lands with a header row', () => {
    const { value, selection } = at('«»');
    expect(table(value, selection).value).toContain('| --- | --- |');
  });
});

describe('links and images', () => {
  test('a link reuses the selection as its label and selects the URL', () => {
    const { value, selection } = at('see «the docs» for more');
    const result = link(value, selection);
    expect(result.value).toBe('see [the docs](https://) for more');
    expect(
      result.value.slice(result.selection.start, result.selection.end),
    ).toBe('https://');
  });

  test('a link with no selection offers a label to overwrite', () => {
    const { value, selection } = at('see «»here');
    const result = link(value, selection);
    expect(result.value).toBe('see [link text](https://)here');
    expect(
      result.value.slice(result.selection.start, result.selection.end),
    ).toBe('link text');
  });

  test('an image carries the alt text through from the library', () => {
    const { value, selection } = at('text«»');
    const result = image(value, selection, 'https://cdn/x.webp', 'A diagram');
    expect(result.value).toContain('![A diagram](https://cdn/x.webp)');
  });

  test('an image with no alt text selects the prompt to replace', () => {
    const { value, selection } = at('«»');
    const result = image(value, selection, 'https://cdn/x.webp', '');
    expect(
      result.value.slice(result.selection.start, result.selection.end),
    ).toBe('describe this image');
  });
});

describe('caret behaviour after line edits', () => {
  /* The bug this guards: leaving the whole line selected meant the next
     character typed wiped the heading that had just been applied. */
  test('a collapsed caret stays in the text, shifted by the prefix', () => {
    const { value, selection } = at('Introdu«»ction');
    const result = toggleLinePrefix(value, selection, '## ');
    expect(result.value).toBe('## Introduction');
    expect(result.selection.start).toBe(result.selection.end);
    // Was after "Introdu" (7); the "## " prefix pushes it to 10.
    expect(result.selection.start).toBe(10);
    expect(result.value.slice(0, result.selection.start)).toBe('## Introdu');
  });

  test('removing a prefix pulls the caret back with it', () => {
    const { value, selection } = at('## Introdu«»ction');
    const result = toggleLinePrefix(value, selection, '## ');
    expect(result.value).toBe('Introduction');
    expect(result.value.slice(0, result.selection.start)).toBe('Introdu');
  });

  test('the caret never slides before the start of its line', () => {
    const { value, selection } = at('«»## Heading');
    const result = toggleLinePrefix(value, selection, '## ');
    expect(result.selection.start).toBeGreaterThanOrEqual(0);
    expect(result.value).toBe('Heading');
  });

  test('a real selection still covers the whole transformed block', () => {
    const { value, selection } = at('«one\ntwo»');
    const result = toggleLinePrefix(value, selection, '- ');
    expect(
      result.value.slice(result.selection.start, result.selection.end),
    ).toBe('- one\n- two');
  });

  test('numbering keeps a collapsed caret inside its line', () => {
    const { value, selection } = at('alp«»ha');
    const result = toggleOrderedList(value, selection);
    expect(result.value).toBe('1. alpha');
    expect(result.selection.start).toBe(result.selection.end);
    expect(result.value.slice(0, result.selection.start)).toBe('1. alp');
  });
});
