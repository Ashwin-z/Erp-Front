import React from "react";
import { Routes, Route, Link, NavLink } from "react-router-dom";
import InvoiceDashboard from "./pages/InvoiceDashboard";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">Custom ERP UI</div>
        <nav>
          <NavLink to="/" end className="nav" >Invoices</NavLink>
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <Link to="/" className="logo">Sales</Link>
          <div className="spacer" />
          <input className="search" placeholder="Search invoices…" />
          <button className="btn">New Invoice</button>
        </header>

        <Routes>
          <Route path="/" element={<InvoiceDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
