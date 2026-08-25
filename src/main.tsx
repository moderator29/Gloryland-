import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "./context/AppContext";
import { UserProvider } from "./context/UserContext";
import { MotionProvider } from "./context/MotionContext";
import { LoginGate } from "./components/LoginGate";
import { Toaster } from "sonner";
import { BottomNav } from "./components/BottomNav";
import { SiteFooter } from "./components/SiteFooter";
import { Backdrop } from "./components/Backdrop";
import { FrameLight } from "./components/FrameLight";
import { CursorTrail } from "./components/CursorTrail";
import { WelcomeCards } from "./components/WelcomeCards";
import { PwaInstall } from "./components/PwaInstall";
import { Skeleton } from "./components/Skeleton";
import { GlobalFilters } from "./components/GlobalFilters";
import { BtcTickerBar } from "./components/BtcTickerBar";
import { CurtainReveal } from "./components/CurtainReveal";
import { GoldRail } from "./components/GoldRail";
import { HelpDrawer } from "./components/HelpDrawer";
import { VaultDial } from "./components/VaultDial";
import { Analytics } from "@vercel/analytics/react";

import "./index.css";

const Home = lazy(() => import("./routes/index"));
const Packages = lazy(() => import("./routes/packages"));
const Portal = lazy(() => import("./routes/portal"));
const Portfolio = lazy(() => import("./routes/portfolio"));
const Settings = lazy(() => import("./routes/settings"));
const NotFound = lazy(() => import("./routes/not-found"));

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
  const onPortal = location.pathname === "/portal";
  return (
    <>
      {onPortal && <VaultDial trigger={location.pathname} />}
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
            <Route
              path="portfolio"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <Portfolio />
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
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>
        </Routes>
      </AnimatePresence>
    </>
  );
}

function Layout() {
  return (
    <div className="relative min-h-screen bg-[#080d16] text-white">
      <BtcTickerBar />
      <Backdrop />
      <FrameLight />
      <GoldRail />
      <div className="relative z-10">
        <Outlet />
        <SiteFooter />
      </div>
      <BottomNav />
      <WelcomeCards />
      <PwaInstall />
      <CursorTrail />
      <HelpDrawer />
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
    <UserProvider>
      <MotionProvider>
        <AppProvider>
          <GlobalFilters />
          <CurtainReveal />
          <LoginGate>
            <BrowserRouter>
              <AnimatedRoutes />
              <Analytics />
            </BrowserRouter>
          </LoginGate>
        </AppProvider>
      </MotionProvider>
    </UserProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
