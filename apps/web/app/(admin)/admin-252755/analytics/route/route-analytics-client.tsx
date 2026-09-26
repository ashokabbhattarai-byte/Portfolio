'use client';
import { useState } from 'react';
import { useAnalyticsRoute, type AnalyticsDays } from '@/lib/query/hooks';
import { AnalyticsDetail } from '@/components/admin/analytics-detail';
export function RouteAnalyticsClient({ path }: { path: string }) {
  const [days, setDays] = useState<AnalyticsDays>('30');
  const query = useAnalyticsRoute(path, days);
  return (
    <AnalyticsDetail
      data={query.data}
      days={days}
      onRange={setDays}
      refresh={() => void query.refetch()}
      busy={query.isFetching}
      error={query.error}
    />
  );
}
