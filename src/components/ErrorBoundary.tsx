import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Last line of defence for a render error.
 *
 * Deliberately imports nothing from the app: no router, no motion, no icons.
 * If a dependency is what broke, this screen still has to render. That means
 * plain CSS classes from the global stylesheet and an inline mark.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message ?? "" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{ background: "var(--ink-000)" }}
        className="flex min-h-screen items-center justify-center px-5"
      >
        <div className="panel-hi edge-light w-full max-w-md p-8 text-center">
          <svg viewBox="0 0 100 100" width="40" height="40" className="mx-auto block" aria-hidden>
            <circle cx="50" cy="50" r="12" fill="#7DD3FC" />
            <circle
              cx="50"
              cy="50"
              r="30"
              fill="none"
              stroke="#2E8BFF"
              strokeWidth="5"
              strokeDasharray="14 10"
            />
          </svg>

          <h1 className="display mt-5 text-xl">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
            This screen failed to render. Your ledger is untouched, nothing has been lost.
          </p>

          {this.state.message && (
            <p className="inset mt-4 break-words p-3 text-left font-mono text-[11px] text-[var(--text-mid)]">
              {this.state.message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button onClick={() => location.reload()} className="btn btn-primary">
              Reload
            </button>
            <a href="/app" className="btn btn-outline">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
