import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Supremely fast defaults: 5m fresh, 30m cached, no refetch on focus,
        // one retry to avoid hammering a transient 500.
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        // Do not dehydrate pending queries – only success/error are serialised
        // to the client. Pending queries would be re-fetched anyway.
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Singleton for the browser; a fresh client per request on the server.
let browserClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
