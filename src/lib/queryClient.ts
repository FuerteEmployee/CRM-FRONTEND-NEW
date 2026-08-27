import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Cross-session leakage is handled by queryClient.clear() on login/logout
      // (see PermissionContext), not by this setting — so we can safely cache
      // data briefly and avoid re-fetching + re-showing loading spinners every
      // time a page is revisited within the same session.
      staleTime: 30_000,
    },
  },
});
