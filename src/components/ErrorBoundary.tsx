import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Deliberately free of framer-motion and other app modules: this renders when
// something inside the tree has already crashed, so it leans only on plain
// markup and the global stylesheet.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-[#080d16] px-5 py-10 text-white">
        <div className="glass-luxury aurora-border w-full max-w-md p-8 text-center">
          <h1 className="font-display text-3xl text-gradient-gold">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An unexpected error interrupted the portal. Reload to pick up where you left off.
          </p>
          <div className="mt-6">
            <button
              type="button"
              className="btn-gilt px-5 py-2.5 text-sm"
              onClick={() => location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
