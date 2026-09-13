'use client';

import type { MediaAsset } from '@portfolio/types';
import { SwitchField, TextAreaField, TextField } from './fields';

export type SeoValues = {
  title: string;
  slug: string;
  excerpt: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  noIndex?: boolean;
  noFollow?: boolean;
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';

/** What Google and the social card will actually show, given the fallbacks the
 *  public pages apply. Seeing the truncation is the point. */
function resolved(values: SeoValues) {
  const title = (values.seoTitle || values.title || 'Untitled article').trim();
  const description = (values.seoDescription || values.excerpt || '').trim();
  return {
    title,
    description,
    ogTitle: (values.ogTitle || title).trim(),
    ogDescription: (values.ogDescription || description).trim(),
    url: `${SITE.replace(/\/$/, '')}/blog/${values.slug || 'your-article'}`,
  };
}

function Counter({ value, limit }: { value: number; limit: number }) {
  const over = value > limit;
  return (
    <span className={over ? 'seo-count is-over' : 'seo-count'}>
      {value}/{limit}
      {over ? ' — will be truncated' : ''}
    </span>
  );
}

export function BlogSeoPanel({
  values,
  errors,
  onChange,
  ogImage,
  onPickOgImage,
}: {
  values: SeoValues;
  errors: Record<string, string | undefined>;
  onChange: (patch: Partial<SeoValues>) => void;
  ogImage?: MediaAsset | null;
  onPickOgImage: () => void;
}) {
  const preview = resolved(values);

  return (
    <fieldset className="adm-fieldset">
      <legend>Search &amp; social</legend>

      <div className="seo-preview" aria-label="Search result preview">
        <p className="seo-preview-label">Google result</p>
        <div className="seo-serp">
          <span className="seo-serp-url">{preview.url}</span>
          <span className="seo-serp-title">{preview.title.slice(0, 60)}</span>
          <span className="seo-serp-desc">
            {preview.description.slice(0, 158) || 'No description yet.'}
          </span>
        </div>
      </div>

      <div className="seo-preview" aria-label="Social card preview">
        <p className="seo-preview-label">Social card</p>
        <div className="seo-card">
          {ogImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ogImage.url} alt={ogImage.alt || preview.ogTitle} />
          ) : (
            <div className="seo-card-empty">
              No social image — the site-wide card is used
            </div>
          )}
          <div className="seo-card-body">
            <span className="seo-card-site">
              {SITE.replace(/^https?:\/\//, '')}
            </span>
            <strong>{preview.ogTitle.slice(0, 70)}</strong>
            <span>{preview.ogDescription.slice(0, 120)}</span>
          </div>
        </div>
        <button type="button" className="adm-btn tiny" onClick={onPickOgImage}>
          {ogImage ? 'Change social image' : 'Choose social image'}
        </button>
      </div>

      <div className="blog-settings-stack">
        <TextField
          id="seoTitle"
          label="SEO title"
          value={values.seoTitle ?? ''}
          onChange={(v) => onChange({ seoTitle: v })}
          error={errors.seoTitle}
          maxLength={200}
          placeholder={values.title || 'Falls back to the article title'}
        />
        <p className="adm-hint">
          <Counter value={preview.title.length} limit={60} /> · Shown as the
          clickable headline in search results.
        </p>

        <TextAreaField
          id="seoDescription"
          label="Meta description"
          rows={3}
          value={values.seoDescription ?? ''}
          onChange={(v) => onChange({ seoDescription: v })}
          error={errors.seoDescription}
          placeholder={values.excerpt || 'Falls back to the summary'}
        />
        <p className="adm-hint">
          <Counter value={preview.description.length} limit={158} /> · The
          snippet under the headline.
        </p>

        <TextField
          id="canonicalUrl"
          label="Canonical URL"
          type="url"
          value={values.canonicalUrl ?? ''}
          onChange={(v) => onChange({ canonicalUrl: v })}
          error={errors.canonicalUrl}
          hint="Only set this if the article was first published elsewhere."
        />

        <TextField
          id="ogTitle"
          label="Social title"
          value={values.ogTitle ?? ''}
          onChange={(v) => onChange({ ogTitle: v })}
          maxLength={200}
          placeholder={preview.title}
          hint="Falls back to the SEO title."
        />
        <TextAreaField
          id="ogDescription"
          label="Social description"
          rows={2}
          value={values.ogDescription ?? ''}
          onChange={(v) => onChange({ ogDescription: v })}
          placeholder={preview.description}
        />

        <SwitchField
          id="noIndex"
          label="Ask search engines not to index"
          checked={values.noIndex ?? false}
          onChange={(v) => onChange({ noIndex: v })}
          hint="Use for pages you want reachable by link but out of search."
        />
        <SwitchField
          id="noFollow"
          label="Ask search engines not to follow links"
          checked={values.noFollow ?? false}
          onChange={(v) => onChange({ noFollow: v })}
        />
      </div>
    </fieldset>
  );
}
