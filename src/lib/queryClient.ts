import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The backend returns 503 for a few seconds right after a cold start,
      // while it's still connecting to the database. Give that case extra
      // retries with backoff so a fresh page load recovers on its own instead
      // of staying empty until the user logs out and back in.
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status === 503) return failureCount < 5;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex, error: any) => {
        const status = error?.response?.status;
        if (status === 503) return Math.min(1000 * 2 ** attemptIndex, 8000);
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      refetchOnWindowFocus: false,
      // Always fetch fresh data — never serve stale cache from a previous admin session.
      staleTime: 0,
    },
  },
});
