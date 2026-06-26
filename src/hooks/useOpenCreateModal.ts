import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Opens a page's "create" modal when the URL carries `?new=1`.
 *
 * Used by the Fuerte AI voice assistant: when the user says e.g.
 * "create new task", the assistant navigates to /admin/tasks?new=1 and this
 * hook fires the page's modal-open callback, then strips the param so a
 * refresh/back-navigation doesn't re-open it.
 *
 * @param open   callback that opens the create modal (e.g. () => setOpen(true))
 * @param param  query-param key to watch (defaults to "new")
 */
export function useOpenCreateModal(open: () => void, param = "new") {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get(param) === "1") {
      open();
      const next = new URLSearchParams(searchParams);
      next.delete(param);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}
