import React, { useEffect, useMemo, useRef, useState } from "react";
import Dropdown from "../components/Dropdown";
import { listSalesInvoices } from "../api/erpnext";

// Map ERPNext status into our badge classes if needed
const STATUS = ["Paid", "Unpaid", "Draft", "Overdue", "Cancelled"];

function fmtMoney(n) {
  if (typeof n !== "number") return n;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export default function InvoiceDashboard() {
  // UI state
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  // Data state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const refreshTimer = useRef(null);

  // Logo (from /public)
  const LOGO_SRC = process.env.PUBLIC_URL + "/assets/images/logo.png";

  // Fetch function
  const fetchInvoices = async () => {
    try {
      setErr("");
      setLoading(true);
      const data = await listSalesInvoices({
        search: q,
        status: statusFilter,
        page,
        pageSize: perPage,
      });
      // Map ERPNext fields into our row model
      const mapped = data.map((d, idx) => ({
        id: d.name, // e.g., INV-0001
        status: d.status,
        client: d.customer,
        company: d.company,
        total: Number(d.grand_total) || 0,
        issued: fmtDate(d.posting_date || d.modified),
        balance: Number(d.outstanding_amount) || 0,
        // Fake avatar initials
        avatar: null,
        role: "Template Customization",
        _key: `${d.name}-${idx}`,
      }));
      setRows(mapped);
    } catch (e) {
      console.error(e);
      setErr(e.message || "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  // Initial + on filter change
  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, page, perPage]);

  // Live refresh every 10s
  useEffect(() => {
    refreshTimer.current && clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(() => {
      fetchInvoices();
    }, 10000);
    return () => refreshTimer.current && clearInterval(refreshTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, page, perPage]);

  // KPIs computed from current page data (or compute server-side if needed)
  const kpis = useMemo(() => {
    const paidSum = rows
      .filter((r) => r.status === "Paid")
      .reduce((a, b) => a + b.total, 0);
    const unpaidSum = rows
      .filter((r) => r.status !== "Paid")
      .reduce((a, b) => a + (b.total - b.balance), 0);

    return {
      clients: new Set(rows.map((r) => r.client)).size,
      invoices: rows.length,
      paid: paidSum,
      unpaid: unpaidSum,
    };
  }, [rows]);

  // Dropdown options
  const perPageOptions = useMemo(
    () => [10, 25, 50].map((n) => ({ value: n, label: String(n) })),
    []
  );
  const statusOptions = useMemo(
    () => [{ value: "All", label: "Invoice Status", placeholder: true }, ...STATUS.map((s) => ({ value: s, label: s }))],
    []
  );

  return (
    <div className="page">
      {/* Page brand header (small icon + wordmark) */}
      <div className="page-brand card">
        <img
          className="brand-icon-lg"
          src={LOGO_SRC}
          alt="Merrix ERP"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='12' fill='#f2f3ff'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial' font-size='16' fill='#7367f0'>ME</text></svg>`
              );
          }}
        />
        <div className="brand-copy">
          <div className="brand-wordmark tight">
            <span className="merrix">Merrix</span>
            <span className="erp">ERP</span>
          </div>
          <div className="brand-sub muted">Dashboard overview</div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="kpi-grid">
        <div className="kpi card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M16 11c1.7 0 3-1.8 3-4s-1.3-4-3-4-3 1.8-3 4 1.3 4 3 4ZM3 21v-1a5 5 0 0 1 5-5h2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div className="kpi-val">{kpis.clients}</div>
          <div className="kpi-label">Clients</div>
        </div>
        <div className="kpi card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M7 4h10a2 2 0 0 1 2 2v12l-5-3-5 3V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/></svg>
          </div>
          <div className="kpi-val">{kpis.invoices}</div>
          <div className="kpi-label">Invoices</div>
        </div>
        <div className="kpi card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg>
          </div>
          <div className="kpi-val">${(kpis.paid / 1000).toFixed(2)}k</div>
          <div className="kpi-label">Paid</div>
        </div>
        <div className="kpi card">
          <div className="kpi-icon">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-8-8" stroke="currentColor" strokeWidth="1.6" fill="none"/><path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.6" fill="none"/></svg>
          </div>
          <div className="kpi-val">${fmtMoney(kpis.unpaid)}</div>
          <div className="kpi-label">Unpaid</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar card">
        <div className="left">
          <div className="show-select">
            <span>Show</span>
            <Dropdown
              small
              className="w-90"
              options={perPageOptions}
              value={perPage}
              onChange={(val) => {
                setPerPage(val);
                setPage(1);
              }}
            />
          </div>

          <button className="btn primary" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            Create Invoice
          </button>
        </div>

        <div className="right">
          <input
            className="input"
            placeholder="Search Invoice"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />

          <Dropdown
            className="w-220"
            alignRight
            options={statusOptions}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table card">
        <div className="t-head">
          <div className="th center"><input type="checkbox" aria-label="select all" /></div>
          <div className="th">#</div>
          <div className="th">Status</div>
          <div className="th">Client</div>
          <div className="th right">Total</div>
          <div className="th">Issued Date</div>
          <div className="th">Balance</div>
          <div className="th center">Actions</div>
        </div>

        {err && (
          <div className="t-row" role="alert" style={{ color: "var(--red)", fontWeight: 700 }}>
            {err}
          </div>
        )}

        {loading && !rows.length ? (
          <div className="t-row"><div className="td">Loading…</div></div>
        ) : rows.length === 0 ? (
          <div className="t-row"><div className="td">No invoices found.</div></div>
        ) : (
          rows.map((r) => (
            <div className="t-row" key={r._key}>
              <div className="td center"><input type="checkbox" aria-label={`select ${r.id}`} /></div>
              <div className="td id"><a href="#!">{r.id}</a></div>
              <div className="td"><span className={`badge ${String(r.status || "").toLowerCase()}`}>{r.status}</span></div>
              <div className="td client">
                <div className="avatar">{(r.client || "?").split(" ").map((s) => s[0]).join("").slice(0,2)}</div>
                <div className="who">
                  <div className="name">{r.client}</div>
                  <div className="role">{r.role}</div>
                </div>
              </div>
              <div className="td right">${fmtMoney(r.total)}</div>
              <div className="td">{r.issued}</div>
              <div className="td">
                {r.status === "Paid" ? (
                  <span className="badge paid">Paid</span>
                ) : Number(r.balance) > 0 ? (
                  <span className="badge warning">Due</span>
                ) : (
                  <span className="badge">—</span>
                )}
              </div>
              <div className="td center actions">
                <button className="icon-btn sm" title="Delete" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 6h18M8 6v12m8-12v12M10 6l1-2h2l1 2" stroke="currentColor" strokeWidth="1.7" fill="none"/></svg>
                </button>
                <button className="icon-btn sm" title="Preview" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 12s4-7 9-7 9 7 9 7-4 7-9 7-9-7-9-7Z" stroke="currentColor" strokeWidth="1.7" fill="none"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>
                </button>
                <button className="icon-btn sm" title="More" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>
                </button>
              </div>
            </div>
          ))
        )}

        <div className="t-foot">
          <div className="muted">Showing {rows.length} entries (auto-refreshing every 10s)</div>
          <div className="pager">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)} aria-label="first page" type="button">«</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="prev page" type="button">‹</button>
            <span className="page-num">{page}</span>
            <button className="page-btn" onClick={() => setPage((p) => p + 1)} aria-label="next page" type="button">›</button>
            {/* We don't know total pages from the simple endpoint; you can compute from a count API if needed */}
          </div>
        </div>
      </div>
    </div>
  );
}
