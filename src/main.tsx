import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "./context/AppContext";
import { Toaster } from "sonner";
import { BottomNav } from "./components/BottomNav";
import { Backdrop } from "./components/Backdrop";
import { FrameLight } from "./components/FrameLight";
import { CursorTrail } from "./components/CursorTrail";
import { WelcomeCards } from "./components/WelcomeCards";
import { PwaInstall } from "./components/PwaInstall";
import { Skeleton } from "./components/Skeleton";
import { Analytics } from "@vercel/analytics/react";

import "./index.css";

const Home = lazy(() => import("./routes/index"));
const Packages = lazy(() => import("./routes/packages"));
const Portal = lazy(() => import("./routes/portal"));

function RouteFallback() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <Skeleton className="h-64" rounded="3xl" />
      <Skeleton className="h-12" rounded="full" />
      <Skeleton className="h-40" rounded="3xl" />
      <Skeleton className="h-40" rounded="3xl" />
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <Suspense fallback={<RouteFallback />}>
                <Home />
              </Suspense>
            }
          />
          <Route
            path="packages"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Packages />
              </Suspense>
            }
          />
          <Route
            path="portal"
            element={
              <Suspense fallback={<RouteFallback />}>
                <Portal />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function Layout() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] pb-20 text-white">
      <Backdrop />
      <FrameLight />
      <div className="relative z-10">
        <Outlet />
      </div>
      <BottomNav />
      <WelcomeCards />
      <PwaInstall />
      <CursorTrail />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}

function App() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || import.meta.env.DEV) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return (
    <AppProvider>
      <BrowserRouter>
        <AnimatedRoutes />
        <Analytics />
      </BrowserRouter>
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
