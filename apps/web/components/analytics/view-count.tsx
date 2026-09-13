'use client';
import { useQuery } from '@tanstack/react-query';
import type { PublicViewCount } from '@portfolio/types';
export function ViewCount({ path }: { path: string }) {
  const { data } = useQuery<PublicViewCount>({
    queryKey: ['public-views', path],
    queryFn: async () => {
      const response = await fetch(
        `/api/analytics/views?path=${encodeURIComponent(path)}`,
      );
      if (!response.ok) throw new Error('View count unavailable');
      return response.json();
    },
    staleTime: 30000,
    retry: 1,
  });
  if (data?.views == null) return null;
  return (
    <span
      className="view-count"
      title="Recorded page views, including return visits. Known bots and signed-in editors are excluded."
    >
      {data.views.toLocaleString()} {data.views === 1 ? 'view' : 'views'}
    </span>
  );
}
