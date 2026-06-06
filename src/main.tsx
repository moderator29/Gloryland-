import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Toaster } from "sonner";
import { BottomNav } from "./components/BottomNav";
import { Analytics } from "@vercel/analytics/react"

import Home from "./routes/index";
import Packages from "./routes/packages";
import Portal from "./routes/portal";
import "./index.css";

function Layout() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      <Outlet />
      <BottomNav />
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
