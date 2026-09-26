import type { Metadata } from 'next';
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
export const siteName = 'Ashok Bhattarai';
/* The site-wide card. Redefining `openGraph` in a page replaces the root
   layout's copy wholesale — images included — and the root opengraph-image
   file does not reach back into the (public) group to refill it, so every page
   that does not ship its own card has to name this one. The route is static,
   so unlike the per-slug variant it carries no content hash. */
const siteOgImage = siteUrl ? `${siteUrl}/opengraph-image` : undefined;
type PageOptions = {
  /* `profile` for the about page, `article` for writing — Google and LinkedIn
     both read og:type when deciding how to render a result. */
  type?: 'website' | 'profile' | 'article';
  /* `null` leaves og:image unset for routes with a sibling opengraph-image
     file: Next mints those URLs with a content hash, so the only correct value
     is the one it writes itself. */
  image?: string | null;
  /* Set on paginated or filtered views that should not compete with their
     canonical parent in the index. */
  noindex?: boolean;
  /* The root layout appends "| Ashok Bhattarai" to every plain-string title.
     Pages that already name him — the home, about and contact pages — opt out
     here rather than shipping the name twice in one <title>. */
  absoluteTitle?: boolean;
};
export function metadata(
  title: string,
  description: string,
  path: string,
  keywords?: string[],
  options: PageOptions = {},
): Metadata {
  const {
    type = 'website',
    image = siteOgImage,
    noindex = false,
    absoluteTitle = false,
  } = options;
  /* Spread rather than assigned: an explicit `images: undefined` still counts
     as the page defining the key, and Next then skips the opengraph-image file
     merge entirely. The key has to be absent for the sibling route to win. */
  const images = image
    ? { images: [{ url: image, width: 1200, height: 630, alt: title }] }
    : {};
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords,
    /* Absolute canonical: crawlers prefer it, and it stays correct even if a
       layout without metadataBase ever renders the page. */
    alternates: siteUrl ? { canonical: `${siteUrl}${path}` } : undefined,
    openGraph: {
      title,
      description,
      type,
      ...(siteUrl ? { url: `${siteUrl}${path}` } : {}),
      siteName,
      locale: 'en_US',
      ...images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    robots:
      siteUrl && !noindex
        ? {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              'max-image-preview': 'large',
              'max-snippet': -1,
              'max-video-preview': -1,
            },
          }
        : { index: false, follow: true },
  };
}
/* Serialised into a <script type="application/ld+json">. The escape stops a
   "</script>" inside any CMS field from closing the tag early. */
export function jsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
