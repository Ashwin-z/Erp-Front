import React, { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import InvoiceDashboard from "./pages/InvoiceDashboard";
import NotFound from "./pages/NotFound";

function Icon({ d, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  // Dark theme toggle (persists)
  const [theme, setTheme] = useState(() => localStorage.getItem("ui_theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  // Logo from /public (place at public/assets/images/logo.png)
  const logoSrc = process.env.PUBLIC_URL + "/assets/images/logo.png";

  return (
    <div className="vuexy-shell">
      {/* Sidebar */}
      <aside className="vuexy-sidebar">
        <div className="brand">
          {/* Small square icon */}
          <img
            className="brand-icon"
            src={logoSrc}
            alt="Merrix ERP"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='#f2f3ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial' font-size='18' fill='#7367f0'>ME</text></svg>`
                );
            }}
          />

          {/* Wordmark */}
          <div className="brand-wordmark" aria-label="Merrix ERP">
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

          <div className="s-section">Users</div>
          <button className="s-link ghost" type="button">
            <Icon d="M16 11c1.657 0 3-1.79 3-4s-1.343-4-3-4-3 1.79-3 4 1.343 4 3 4ZM5 21v-1a5 5 0 0 1 5-5h2" />
            <span>Users</span>
          </button>

          <div className="s-section">Other</div>
          <button className="s-link ghost" type="button">
            <Icon d="M12 3v18M3 12h18" />
            <span>Kanban</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="vuexy-main">
        {/* Topbar */}
        <header className="vuexy-topbar">
          <div className="search-wrap">
            <Icon d="M11 19a8 8 0 1 1 5.293-2.707L22 22" />
            <input className="search-input" placeholder="Search [CTRL + K]" />
          </div>

          <div className="top-actions">
            <button className="icon-btn" title="Translate" type="button">
              <Icon d="M3 5h8m-8 6h8M5 21h4M13 21l8-18M15 10h6" />
            </button>

            {/* Dark mode */}
            <button
              className="icon-btn"
              title="Toggle theme"
              aria-pressed={theme === "dark"}
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            >
              <Icon d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z" />
            </button>

            <button className="icon-btn" title="Notifications" type="button">
              <Icon d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14V11a6 6 0 1 0-12 0v3a2 2 0 0 1-.6 1.4L4 17h5" />
            </button>
            <div className="avatar sm">A</div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<InvoiceDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
