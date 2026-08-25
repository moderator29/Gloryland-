import { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";

/**
 * Vercel's analytics script is served by the platform itself, so requesting it
 * anywhere else (local preview, a non-Vercel host) resolves to the SPA
 * fallback and throws. Mount it only where it can actually load.
 */
function isVercelHost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h !== "localhost" && h !== "127.0.0.1" && !h.endsWith(".local");
}

import { UserProvider } from "./context/UserContext";
import { MotionProvider } from "./context/MotionContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppShell } from "./components/shell/AppShell";
import { Gate } from "./components/shell/Gate";
import { Skeleton } from "./components/system/ui";

import "./index.css";

/* Public */
const Landing = lazy(() => import("./routes/landing"));
const Privacy = lazy(() => import("./routes/legal/privacy"));
const Terms = lazy(() => import("./routes/legal/terms"));
const Risk = lazy(() => import("./routes/legal/risk"));

/* Application */
const Home = lazy(() => import("./routes/app/home"));
const Desk = lazy(() => import("./routes/app/desk"));
const Vaults = lazy(() => import("./routes/app/vaults"));
const VaultNew = lazy(() => import("./routes/app/vault-new"));
const VaultDetail = lazy(() => import("./routes/app/vault-detail"));
const Tiers = lazy(() => import("./routes/app/tiers"));
const Rewards = lazy(() => import("./routes/app/rewards"));
const AnalyticsPage = lazy(() => import("./routes/app/analytics"));
const Insights = lazy(() => import("./routes/app/insights"));
const Activity = lazy(() => import("./routes/app/activity"));
const Copilot = lazy(() => import("./routes/app/copilot"));
const Support = lazy(() => import("./routes/app/support"));
const Settings = lazy(() => import("./routes/app/settings"));
const NotFound = lazy(() => import("./routes/not-found"));

/** Skeleton shaped like the dashboards it stands in for, not a generic spinner. */
function RouteFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-44 w-full" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function PageFallback() {
  return (
    <div className="min-h-screen bg-[var(--ink-000)] p-8">
      <Skeleton className="mx-auto h-[70vh] max-w-5xl" />
    </div>
  );
}

function App() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || import.meta.env.DEV)
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <UserProvider>
      <MotionProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              {/* Public marketing and legal */}
              <Route
                path="/"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Landing />
                  </Suspense>
                }
              />
              <Route
                path="/legal/privacy"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Privacy />
                  </Suspense>
                }
              />
              <Route
                path="/legal/terms"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Terms />
                  </Suspense>
                }
              />
              <Route
                path="/legal/risk"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Risk />
                  </Suspense>
                }
              />

              {/* Authenticated application */}
              <Route
                path="/app"
                element={
                  <Gate>
                    <AppShell />
                  </Gate>
                }
              >
                <Route
                  index
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Home />
                    </Suspense>
                  }
                />
                <Route
                  path="desk"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Desk />
                    </Suspense>
                  }
                />
                <Route
                  path="vaults"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Vaults />
                    </Suspense>
                  }
                />
                <Route
                  path="vaults/new"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <VaultNew />
                    </Suspense>
                  }
                />
                <Route
                  path="vaults/:id"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <VaultDetail />
                    </Suspense>
                  }
                />
                <Route
                  path="tiers"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Tiers />
                    </Suspense>
                  }
                />
                <Route
                  path="rewards"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Rewards />
                    </Suspense>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <AnalyticsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="insights"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Insights />
                    </Suspense>
                  }
                />
                <Route
                  path="activity"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Activity />
                    </Suspense>
                  }
                />
                <Route
                  path="copilot"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Copilot />
                    </Suspense>
                  }
                />
                <Route
                  path="support"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Support />
                    </Suspense>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <Suspense fallback={<RouteFallback />}>
                      <Settings />
                    </Suspense>
                  }
                />
              </Route>

              {/* Legacy paths from the previous product */}
              <Route path="/portal" element={<Navigate to="/app/desk" replace />} />
              <Route path="/portfolio" element={<Navigate to="/app/vaults" replace />} />
              <Route path="/packages" element={<Navigate to="/app/tiers" replace />} />
              <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

              <Route
                path="*"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <NotFound />
                  </Suspense>
                }
              />
            </Routes>
          </ErrorBoundary>
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: "rgba(24,33,56,0.92)",
                border: "1px solid rgba(120,170,240,0.26)",
                color: "#f2f6ff",
                backdropFilter: "blur(16px)",
              },
            }}
          />
          {import.meta.env.PROD && isVercelHost() && <Analytics />}
        </BrowserRouter>
      </MotionProvider>
    </UserProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
