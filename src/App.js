import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import InvoiceDashboard from "./pages/InvoiceDashboard";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceViewEdit from "./pages/InvoiceViewEdit";
import NotFound from "./pages/NotFound";

function Icon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("ui_theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  return (
    <div className="vuexy-shell">
      <aside className="vuexy-sidebar">
        <div className="brand">
          <img className="brand-icon" src="/assets/images/logo.png" alt="Logo" />
          <div className="brand-wordmark">
            <span className="merrix">Merrix</span>
            <span className="erp">ERP</span>
          </div>
        </div>
        <nav className="s-nav">
          <div className="s-section">Main</div>
          <NavLink to="/" end className="s-link">
            <Icon d="M3 7h18M3 12h18M3 17h18" />
            <span>Invoice</span>
          </NavLink>
        </nav>
      </aside>

      <main className="vuexy-main">
        <header className="vuexy-topbar">
          <div className="search-wrap">
            <Icon d="M11 19a8 8 0 1 1 5.293-2.707L22 22" />
            <input className="search-input" placeholder="Search [CTRL + K]" />
          </div>
          <div className="top-actions">
            <button
              className="icon-btn"
              title="Theme"
              aria-pressed={theme === "dark"}
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              type="button"
            >
              <Icon d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
            </button>
            <div className="avatar sm">U</div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<InvoiceDashboard />} />
          <Route path="/create" element={<CreateInvoice />} />
          <Route path="/invoice/:name" element={<InvoiceViewEdit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
