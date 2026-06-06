import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Toaster } from "sonner";
import { BottomNav } from "./components/BottomNav";
import { Backdrop } from "./components/Backdrop";
import { WelcomeCards } from "./components/WelcomeCards";
import { Analytics } from "@vercel/analytics/react";

import Home from "./routes/index";
import Packages from "./routes/packages";
import Portal from "./routes/portal";
import "./index.css";

function Layout() {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white pb-20">
      <Backdrop />
      <div className="relative z-10">
        <Outlet />
      </div>
      <BottomNav />
      <WelcomeCards />
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="packages" element={<Packages />} />
            <Route path="portal" element={<Portal />} />
          </Route>
        </Routes>
        <Analytics />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>,
);
