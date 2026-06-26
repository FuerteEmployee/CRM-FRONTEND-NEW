import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Always fetch fresh data — never serve stale cache from a previous admin session.
      staleTime: 0,
    },
  },
});
