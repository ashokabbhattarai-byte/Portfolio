'use client';

import type { BlogStatus } from '@portfolio/types';

export type Readiness = {
  label: string;
  detail?: string;
  ok: boolean;
  /** Advisory only — a missing one warns but never blocks publishing. */
  optional?: boolean;
};

/**
 * What an article still needs before it can go out.
 *
 * The server enforces the same minimums, but a writer should learn about a
 * missing summary while they are writing, not from a rejected save.
 */
export function readiness(values: {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  featuredImageId?: string | null;
  seoDescription?: string | null;
}): Readiness[] {
  const words = values.content.trim().split(/\s+/).filter(Boolean).length;
  return [
    {
      label: 'A title',
      ok: values.title.trim().length >= 2,
      detail: values.title.trim() ? undefined : 'What is this article called?',
    },
    {
      label: 'A short summary',
      ok: values.excerpt.trim().length >= 10,
      detail:
        values.excerpt.trim().length >= 10
          ? `${values.excerpt.trim().length} characters`
          : 'Shown in listings and search results',
    },
    {
      label: 'Article content',
      ok: values.content.trim().length >= 20,
      detail: words ? `${words} words` : 'Nothing written yet',
    },
    {
      label: 'A featured image',
      ok: Boolean(values.featuredImageId),
      optional: true,
      detail: 'Used at the top of the article and on social cards',
    },
    {
      label: 'At least one topic',
      ok: values.tags.length > 0,
      optional: true,
      detail: 'Helps readers find related writing',
    },
  ];
}

export const blockers = (checks: Readiness[]) =>
  checks.filter((check) => !check.ok && !check.optional);

const STATUS_COPY: Record<
  string,
  {
    label: string;
    tone: 'draft' | 'live' | 'scheduled' | 'hidden';
    note: string;
  }
> = {
  DRAFT: {
    label: 'Draft',
    tone: 'draft',
    note: 'Only you can see this.',
  },
  REVIEW: {
    label: 'In review',
    tone: 'draft',
    note: 'Not visible to the public.',
  },
  PUBLISHED: {
    label: 'Live',
    tone: 'live',
    note: 'Anyone can read this at its public address.',
  },
  SCHEDULED: {
    label: 'Scheduled',
    tone: 'scheduled',
    note: 'Publishes automatically, even with your laptop closed.',
  },
  UNPUBLISHED: {
    label: 'Unpublished',
    tone: 'hidden',
    note: 'Taken off the public site. The writing is kept.',
  },
  ARCHIVED: {
    label: 'Archived',
    tone: 'hidden',
    note: 'Put away. Not visible to anyone.',
  },
};

function formatNepal(value?: string | null): string {
  if (!value) return '';
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  return at.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kathmandu',
  });
}

export function StatusBadge({
  status,
  scheduledAt,
  publishedAt,
}: {
  status: BlogStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
}) {
  const copy = STATUS_COPY[status] ?? STATUS_COPY.DRAFT;
  const when =
    status === 'SCHEDULED'
      ? formatNepal(scheduledAt)
      : status === 'PUBLISHED'
        ? formatNepal(publishedAt)
        : '';

  return (
    <div className={`pub-status is-${copy.tone}`}>
      <span className="pub-status-dot" aria-hidden="true" />
      <div>
        <strong>{copy.label}</strong>
        <span>
          {copy.note}
          {when
            ? ` ${status === 'SCHEDULED' ? 'Goes out' : 'Published'} ${when} (Nepal time).`
            : ''}
        </span>
      </div>
    </div>
  );
}

export function ReadinessList({ checks }: { checks: Readiness[] }) {
  return (
    <ul className="pub-checks">
      {checks.map((check) => (
        <li
          key={check.label}
          className={
            check.ok ? 'is-done' : check.optional ? 'is-optional' : 'is-missing'
          }
        >
          <span className="pub-check-mark" aria-hidden="true">
            {check.ok ? '✓' : check.optional ? '·' : '!'}
          </span>
          <span>
            <strong>{check.label}</strong>
            {check.optional && !check.ok ? ' — optional' : ''}
            {check.detail ? <small>{check.detail}</small> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
