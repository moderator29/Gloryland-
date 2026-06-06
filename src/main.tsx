import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppProvider } from "./context/AppContext";
import { Toaster } from "sonner";
import { BottomNav } from "./components/BottomNav";
import { Backdrop } from "./components/Backdrop";
import { WelcomeCards } from "./components/WelcomeCards";
import { PwaInstall } from "./components/PwaInstall";
import { Analytics } from "@vercel/analytics/react";

import Home from "./routes/index";
import Packages from "./routes/packages";
import Portal from "./routes/portal";
import "./index.css";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="packages" element={<Packages />} />
          <Route path="portal" element={<Portal />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function Layout() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white pb-20">
      <Backdrop />
      <div className="relative z-10">
        <Outlet />
      </div>
      <BottomNav />
      <WelcomeCards />
      <PwaInstall />
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
