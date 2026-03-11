import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { Layout, type Page } from "./components/Layout";
import { Analytics } from "./pages/Analytics";
import { Backtesting } from "./pages/Backtesting";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { Signals } from "./pages/Signals";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "signals":
        return <Signals />;
      case "analytics":
        return <Analytics />;
      case "backtesting":
        return <Backtesting />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dark">
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </Layout>
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.12 0.022 258)",
            border: "1px solid oklch(0.22 0.03 255)",
            color: "oklch(0.92 0.01 220)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
          },
        }}
      />
    </div>
  );
}
