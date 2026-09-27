'use client';
import { useQuery } from '@tanstack/react-query';
import { publicViewsOptions } from '@/lib/engagement-queries';
export function ViewCount({ path }: { path: string }) {
  const { data } = useQuery(publicViewsOptions(path));
  if (data?.views == null) return null;
  return (
    <span
      className="view-count"
      title={
        path.startsWith('/blog/')
          ? 'Unique browsers that have viewed this article. Repeat visits count once.'
          : 'Recorded page views, including return visits. Known bots and signed-in editors are excluded.'
      }
    >
      {data.views.toLocaleString()} {data.views === 1 ? 'view' : 'views'}
    </span>
  );
}
