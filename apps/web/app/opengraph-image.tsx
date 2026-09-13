import { getProfile } from '@/lib/content';
import { socialImage } from '@/lib/og-image';
export const alt = 'Ashok Bhattarai — Software developer in Nepal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image() {
  const profile = await getProfile().catch(
    () =>
      ({
        name: 'Ashok Bhattarai',
        role: 'Software developer',
        location: 'Nepal',
      }) as never,
  );
  return socialImage(
    'Full-stack software, built to be relied on.',
    `${profile.name} / ${profile.role}`,
    profile,
  );
}
