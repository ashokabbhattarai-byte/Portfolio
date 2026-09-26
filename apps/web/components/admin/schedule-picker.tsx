'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TextField } from './fields';

/** Where the audience is. Scheduling copy is written from their clock, not the
 *  author's, because "8pm" means 8pm for readers. */
export const AUDIENCE_TZ = 'Asia/Kathmandu';

/** `datetime-local` speaks local wall-clock time, not instants. */
export function toLocalInput(value?: string | null): string {
  if (!value) return '';
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  return new Date(at.getTime() - at.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

const pad = (n: number) => String(n).padStart(2, '0');
const asInput = (at: Date) =>
  `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(
    at.getHours(),
  )}:${pad(at.getMinutes())}`;

/** Next occurrence of `hour` on a given weekday (0 = Sunday), or tomorrow. */
function nextAt(hour: number, weekday?: number): Date {
  const at = new Date();
  at.setSeconds(0, 0);
  at.setHours(hour, 0);
  if (weekday === undefined) {
    at.setDate(at.getDate() + 1);
  } else {
    const delta = (weekday - at.getDay() + 7) % 7 || 7;
    at.setDate(at.getDate() + delta);
  }
  return at;
}

function presets(): { label: string; value: string }[] {
  const all = [
    { label: 'Tomorrow, 9am', value: asInput(nextAt(9)) },
    { label: 'Tomorrow, 6pm', value: asInput(nextAt(18)) },
    { label: 'Monday, 9am', value: asInput(nextAt(9, 1)) },
    { label: 'Next week', value: asInput(nextAt(9, new Date().getDay())) },
  ];
  /* On a Sunday, "tomorrow" and "Monday" are the same instant — two buttons
     that highlight together and do the same thing. First label wins. */
  const seen = new Set<string>();
  return all
    .filter((option) => !seen.has(option.value) && seen.add(option.value))
    .slice(0, 3);
}

/** "in 3 hours", "in 6 days" — the sanity check that catches a wrong year.
 *  `now` is passed in rather than read here so callers stay pure during render. */
function relative(target: Date, now: number): string {
  const ms = target.getTime() - now;
  if (ms <= 0) return 'in the past';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}

/**
 * UTC offset of a zone at a given instant, in milliseconds.
 *
 * Comparing zone *names* is not enough: a browser may report `Asia/Katmandu`
 * (the old spelling) for what we call `Asia/Kathmandu`, and the picker would
 * then helpfully explain that 9am equals 9am. Offsets settle it, and also
 * catch any other zone that happens to share Nepal's clock.
 */
function offsetAt(at: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - at.getTime();
}

const inZone = (at: Date, timeZone: string) =>
  at.toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone,
  });

/**
 * Asks for the moment an article goes public, then lets you confirm it.
 *
 * A modal rather than an inline panel: the trigger lives in the sticky action
 * bar at the bottom of the page and the sidebar is a screen away, so rendering
 * the picker up there looked like the button had done nothing.
 *
 * The input is the author's local wall clock, but the promise is about the
 * reader's, so the confirmation line always restates the time in the audience
 * timezone — and shows both when the two differ.
 */
export function SchedulePicker({
  open,
  value,
  error,
  busy,
  confirmLabel,
  title,
  onChange,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  value: string;
  error?: string;
  busy?: boolean;
  confirmLabel: string;
  title: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.showModal();
      /* Land on the date field rather than the first preset: it is the one
         control that always answers the question, whatever the presets say. */
      node.querySelector<HTMLInputElement>('#scheduledAt')?.focus();
    }
    if (!open && node.open) node.close();
  }, [open]);

  /* The clock lives in state: reading Date.now() during render would make the
     render impure, and holding it lets the countdown tick on its own. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

  const options = useMemo(() => presets(), []);
  const authorTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const target = value ? new Date(value) : null;
  const valid = target !== null && !Number.isNaN(target.getTime());
  const future = valid && target.getTime() > now;
  /* Only worth restating the time when the author's clock actually differs. */
  const sameClock =
    !valid || offsetAt(target, authorTz) === offsetAt(target, AUDIENCE_TZ);

  return (
    <dialog
      ref={dialog}
      className="sched-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          onCancel();
        }
      }}
    >
      <header className="sched-head">
        <h2>{title}</h2>
      </header>
      <div className="sched">
        <p className="sched-title">Pick a time</p>

        <div className="sched-presets">
          {options.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`adm-btn tiny${value === option.value ? ' is-chosen' : ''}`}
              aria-pressed={value === option.value}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <TextField
          id="scheduledAt"
          type="datetime-local"
          label="Or choose a date and time"
          required
          value={value}
          onChange={onChange}
          error={error}
        />

        {valid && (
          <p
            className={`sched-confirm${future ? '' : ' is-past'}`}
            role="status"
          >
            {future ? (
              <>
                Goes live <strong>{inZone(target, AUDIENCE_TZ)}</strong> in
                Nepal — {relative(target, now)}.
                {!sameClock && (
                  <>
                    {' '}
                    That is {inZone(target, authorTz)} where you are ({authorTz}
                    ).
                  </>
                )}
              </>
            ) : (
              <>That time has already passed. Pick a moment in the future.</>
            )}
          </p>
        )}

        <div className="pub-actions">
          <button
            type="button"
            className="adm-btn primary"
            disabled={busy || !future}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="adm-btn ghost"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>

        <p className="adm-hint">
          The server publishes it at that moment, whether or not you are online.
        </p>
      </div>
    </dialog>
  );
}

/** Compact "goes out …" line for list rows. Absolute only — a relative phrase
 *  would need the current time, which callers must not read during render. */
export function describeSchedule(scheduledAt?: string | null): string {
  if (!scheduledAt) return '';
  const at = new Date(scheduledAt);
  if (Number.isNaN(at.getTime())) return '';
  return at.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: AUDIENCE_TZ,
  });
}
