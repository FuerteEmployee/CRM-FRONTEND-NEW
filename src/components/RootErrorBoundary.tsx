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
export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unhandled render error caught by RootErrorBoundary:", error, info.componentStack);
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
