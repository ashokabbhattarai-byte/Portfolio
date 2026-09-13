import { describe, expect, test } from 'bun:test';
import { AUDIENCE_TZ, describeSchedule, toLocalInput } from './schedule-picker';

describe('schedule formatting', () => {
  test('the audience timezone is Nepal', () => {
    expect(AUDIENCE_TZ).toBe('Asia/Kathmandu');
  });

  /* The server stores an instant; the input needs a local wall clock. Getting
     this backwards shifts every schedule by the machine's UTC offset. */
  test('an instant becomes a datetime-local string in the local zone', () => {
    const iso = '2026-09-20T14:15:00.000Z';
    const local = toLocalInput(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Round-tripping through the input must land on the same instant.
    expect(new Date(local).toISOString()).toBe(iso);
  });

  test('empty and unparseable values produce an empty input', () => {
    expect(toLocalInput(null)).toBe('');
    expect(toLocalInput(undefined)).toBe('');
    expect(toLocalInput('')).toBe('');
    expect(toLocalInput('not a date')).toBe('');
  });

  /* Nepal is UTC+05:45 — a half-hour-naive formatter lands 15 minutes out,
     which is exactly the kind of bug nobody notices until a post goes early.
     The separators vary by ICU build, so the date and clock are asserted
     rather than the exact punctuation. */
  test('the listing line is rendered in Nepal time, offset included', () => {
    const line = describeSchedule('2026-09-20T14:15:00.000Z');
    expect(line).toContain('20');
    expect(line).toMatch(/Sept?/);
    expect(line).toContain('2026');
    expect(line).toContain('20:00'); // 14:15 UTC + 05:45
  });

  test('a time either side of midnight in Nepal keeps the right date', () => {
    // 18:20 UTC is 00:05 the *next* day in Kathmandu.
    const line = describeSchedule('2026-09-20T18:20:00.000Z');
    expect(line).toContain('21');
    expect(line).toContain('00:05');
  });

  test('missing or broken values render as nothing rather than "Invalid Date"', () => {
    expect(describeSchedule(null)).toBe('');
    expect(describeSchedule(undefined)).toBe('');
    expect(describeSchedule('nonsense')).toBe('');
  });
});
