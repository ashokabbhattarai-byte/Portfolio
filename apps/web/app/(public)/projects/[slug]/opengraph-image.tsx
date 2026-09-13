import { getProfile, getProject } from '@/lib/content';
import { socialImage } from '@/lib/og-image';
export const alt = 'Project case study by Ashok Bhattarai';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [p, profile] = await Promise.all([
    getProject(slug),
    getProfile().catch(() => null),
  ]);
  return socialImage(
    p?.title ?? 'Selected projects',
    p?.summary ??
      (profile
        ? `Software development by ${profile.name}`
        : 'Software development by Ashok Bhattarai'),
    profile ?? undefined,
  );
}
