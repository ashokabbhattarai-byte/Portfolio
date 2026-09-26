import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { getProfile } from '@/lib/content';
import { siteUrl } from '@/lib/seo';
import '@/styles/globals.css';
import '@fontsource-variable/geist';
export async function generateMetadata(): Promise<Metadata> {
  const profile = await getProfile();
  /* The default title carries the two queries worth ranking for — the name and
     the role-plus-place — and stays inside the ~60 characters Google renders
     before truncating. Deeper routes override it through the template. */
  const title = `${profile.name} — ${profile.role} & AI Engineer in ${profile.location}`;
  const description = `${profile.name} (ashokbhattarai) is a ${profile.role} based in ${profile.location}, specializing in Next.js, React, TypeScript, AI products, and full-stack software development.`;
  const keywords = [
    'Ashok Bhattarai',
    'ashokbhattarai',
    'Ashok Bhattarai Portfolio',
    'Ashok Bhattarai Nepal',
    'Ashok Bhattarai Lalitpur',
    'Ashok Bhattarai Developer',
    'Ashok Bhattarai Software Engineer',
    'Ashok Bhattarai Rumsan',
    'ashokabbhattarai',
    'ashokabbhattaraii',
    profile.name,
    `${profile.name} developer`,
    `${profile.name} portfolio`,
    profile.role,
    `Software developer ${profile.location}`,
    'Software developer Nepal',
    'Full-stack developer Nepal',
    'Next.js developer',
    'React developer',
    'TypeScript engineer',
    'AI product engineer',
    'Quality assurance engineer',
    'Hire software developer Nepal',
  ];
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${profile.name}` },
    description,
    keywords,
    authors: [{ name: profile.name, url: siteUrl }],
    creator: profile.name,
    publisher: profile.name,
    category: 'Technology',
    applicationName: `${profile.name} Portfolio`,
    referrer: 'origin-when-cross-origin',
    /* Stops Safari turning the phone-shaped numbers in project copy into
       tappable links, which breaks the type. */
    formatDetection: { telephone: false, address: false, email: false },
    alternates: {
      canonical: siteUrl,
      languages: {
        'en-US': siteUrl,
        'ne-NP': siteUrl,
        'x-default': siteUrl,
      },
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    openGraph: {
      title,
      description,
      type: 'profile',
      siteName: `${profile.name} — Portfolio`,
      locale: 'en_US',
      url: siteUrl,
      images: [
        {
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${profile.name} — Software Developer & AI Engineer`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@ashokabbhattarai',
      site: '@ashokabbhattarai',
      images: [`${siteUrl}/opengraph-image`],
    },
  };
}
/* theme-color lives here rather than in the metadata object: Next renders it
   as <meta name="theme-color"> from the viewport export, and the value matches
   theme_color in app/manifest.ts so the address bar and the installed app agree. */
export const viewport: Viewport = {
  themeColor: '#292a2e',
  width: 'device-width',
  initialScale: 1,
};
/* The root layout owns only the document shell. Every piece of marketing
    chrome — motion system, header, cursor — belongs to the (public) group, so
    the admin never downloads GSAP or Lenis at all. */
import { QueryProvider } from '@/lib/query/provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-motion="ready"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        {/* Resolves the motion mode before the first paint: a stored choice
             wins, otherwise the system preference decides. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){var d=document.documentElement,v=null;try{v=localStorage.getItem('portfolio-motion')}catch(e){}if(v!=='full'&&v!=='calm')v=matchMedia('(prefers-reduced-motion: reduce)').matches?'calm':'full';d.dataset.flow=v})()",
          }}
        />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
