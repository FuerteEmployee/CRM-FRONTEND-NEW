import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Last-resort net around the whole app: with no boundary here, an error
// thrown during render (e.g. a corrupted localStorage value read by a
// top-level provider) unmounts the entire tree and leaves #root blank
// forever, with nothing shown to the user and no way to recover short of
// manually clearing site data.
// Dev-only Vite Fast Refresh artifact: after a background tab sits idle long
// enough for the HMR websocket to drop and reconnect, it can hot-swap a
// context module (e.g. SettingsContext.tsx) in isolation from files that
// import its hook (e.g. ThemeContext.tsx), leaving the consumer holding a
// stale Context object while the Provider now provides a new one — so the
// hook's "must be used within a ...Provider" guard throws even though the
// provider nesting in App.tsx is correct. A real crash would reappear right
// after reload; this one won't, since a plain reload re-fetches every module
// fresh and consistent. Never fires in production — there's no HMR there.
const isDevProviderDriftError = (error: Error): boolean =>
  import.meta.env.DEV && /must be used within a .*Provider/.test(error.message);

const RELOAD_GUARD_KEY = "crm_root_boundary_auto_reload";

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unhandled render error caught by RootErrorBoundary:", error, info.componentStack);

    if (isDevProviderDriftError(error) && !sessionStorage.getItem(RELOAD_GUARD_KEY)) {
      // Guard against a reload loop if this ever turns out to be a real,
      // persistent error rather than a transient HMR artifact.
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      window.location.reload();
    }
  }

  componentDidMount() {
    // Clear the guard only after rendering stays error-free for a few
    // seconds — confirms the reload actually fixed it, rather than clearing
    // it the instant we mount (which would let a persistent error reload
    // forever instead of ever reaching the fallback UI below).
    setTimeout(() => sessionStorage.removeItem(RELOAD_GUARD_KEY), 5000);
  }

  handleReset = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#666", maxWidth: 420 }}>
            The app hit an unexpected error and couldn't load. Resetting usually fixes it.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "0.6rem 1.4rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset and reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
