import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listSalesInvoices,
  deleteSalesInvoice,
  toAbsoluteUrl,
  getLoggedUser,
  getUserDoc,
} from "../api/erpnext";
import { Link, useNavigate } from "react-router-dom";

/* ---------- Icons ---------- */
function Icon({ d, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Modal ---------- */
function Modal({ open, title, children, onClose, onConfirm, confirmText = "Confirm", confirmTone = "danger" }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="icon-btn sm" onClick={onClose} title="Close">
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          <button className="btn" type="button" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${confirmTone === "danger" ? "danger" : "primary"}`}
            type="button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */
function Toast({ msg, tone = "ok", onDone }) {
  const timer = useRef(null);
  useEffect(() => {
    if (!msg) return;
    timer.current = setTimeout(() => onDone?.(), 2600);
    return () => clearTimeout(timer.current);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className={`toast ${tone}`}>
      {msg}
    </div>
  );
}

export default function InvoiceDashboard() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(() => new Set());
  const [me, setMe] = useState({ avatar: "", name: "" });

  // actions menu
  const [actOpen, setActOpen] = useState(false);
  const actWrapRef = useRef(null);

  // modal + toast
  const [modal, setModal] = useState({ open: false, ids: [] });
  const [toast, setToast] = useState({ msg: "", tone: "ok" });

  // close actions menu if clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!actWrapRef.current) return;
      if (!actWrapRef.current.contains(e.target)) setActOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Fetch profile (avatar)
  useEffect(() => {
    (async () => {
      try {
        const u = await getLoggedUser();
        const doc = await getUserDoc(u);
        const img = toAbsoluteUrl(doc?.user_image || "");
        setMe({ avatar: img, name: doc?.full_name || doc?.name || u });
      } catch {
        setMe({ avatar: "", name: "User" });
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await listSalesInvoices();
      setRows(res || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (status !== "All") r = r.filter((x) => (x.status || "").toLowerCase() === status.toLowerCase());
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          String(x.name).toLowerCase().includes(t) ||
          String(x.customer || "").toLowerCase().includes(t)
      );
    }
    return r;
  }, [rows, q, status]);

  const totals = useMemo(() => {
    const paid = rows.filter((r) => (r.status || "").toLowerCase() === "paid").reduce((s, x) => s + (Number(x.grand_total) || 0), 0);
    const unpaid = rows
      .filter((r) => (r.status || "").toLowerCase() !== "paid")
      .reduce((s, x) => s + (Number(x.outstanding_amount) || 0), 0);
    return { paid, unpaid };
  }, [rows]);

  function toggle(id) {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id);
      else ns.add(id);
      return ns;
    });
  }
  function toggleAll(ids) {
    setSelected((s) => {
      const ns = new Set(s);
      const allSelected = ids.every((id) => ns.has(id));
      if (allSelected) ids.forEach((id) => ns.delete(id));
      else ids.forEach((id) => ns.add(id));
      return ns;
    });
  }

  function confirmDelete(ids) {
    setModal({
      open: true,
      ids: Array.isArray(ids) ? ids : [ids],
      title: `Delete ${Array.isArray(ids) ? ids.length : 1} invoice(s)`,
    });
  }

  async function doDelete(ids) {
    const failures = [];
    for (const id of ids) {
      try {
        await deleteSalesInvoice(id);
      } catch (e) {
        failures.push(id);
      }
    }
    if (failures.length) {
      setToast({
        msg:
          `Some invoices could not be deleted (likely submitted): ` +
          failures.join(", "),
        tone: "warn",
      });
    } else {
      setToast({ msg: "Invoice(s) deleted.", tone: "ok" });
    }
    await load();
    setSelected(new Set());
  }

  const visibleIds = filtered.map((r) => r.name);
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  return (
    <div className="page">
      {/* brand strip */}
      <div className="page-brand">
        <img className="brand-icon-lg" src="/assets/images/logo.png" alt="Brand" />
        <div className="brand-copy">
          <div className="brand-wordmark tight">
            <span className="merrix">Merrix</span>
            <span className="erp">ERP</span>
          </div>
          <div className="brand-sub muted">Invoices</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="card kpi">
          <div className="kpi-icon"><Icon d="M3 12h38" /></div>
          <div><div className="kpi-val">{filtered.length}</div><div className="kpi-label">Invoices</div></div>
        </div>
        <div className="card kpi">
          <div className="kpi-icon"><Icon d="M20 7l-9 9-4-4" /></div>
          <div><div className="kpi-val">${(totals.paid || 0).toLocaleString()}</div><div className="kpi-label">Paid</div></div>
        </div>
        <div className="card kpi">
          <div className="kpi-icon"><Icon d="M12 8v8m4-4H8" /></div>
          <div><div className="kpi-val">${(totals.unpaid || 0).toLocaleString()}</div><div className="kpi-label">Unpaid</div></div>
        </div>
        <div className="card kpi">
          <div className="kpi-icon"><Icon d="M4 4h16v16H4z" /></div>
          <div><div className="kpi-val">{status}</div><div className="kpi-label">Filter</div></div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card toolbar">
        <div className="left" style={{ gap: 10 }}>
          <div className="dd w-220">
            <button className="dd-trigger" type="button" onClick={() => setStatus((s) => s === "All" ? "Paid" : s)}>
              <span className="value">{status}</span>
              <span className="dd-chevron">▾</span>
            </button>
            {/* keep simple presets if you want later */}
          </div>
          <input className="input" placeholder="Search invoices…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="right" style={{ position: "relative" }} ref={actWrapRef}>
          {selected.size > 0 ? (
            <>
              <button className="btn" type="button" onClick={() => setActOpen((o) => !o)}>
                Actions ({selected.size})
              </button>
              {actOpen && (
                <div className="menu-flyout left">
                  {selected.size === 1 && (
                    <div
                      className="dd-option"
                      onMouseDown={() => {
                        const id = Array.from(selected)[0];
                        setActOpen(false);
                        navigate(`/invoice/${encodeURIComponent(id)}`);
                      }}
                    >
                      View / Edit
                    </div>
                  )}
                  <div
                    className="dd-option"
                    onMouseDown={() => {
                      setActOpen(false);
                      confirmDelete(Array.from(selected));
                    }}
                  >
                    Delete selected
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link className="btn primary" to="/create" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon d="M12 5v14M5 12h14" />
              Create Invoice
            </Link>
          )}
          <div className="avatar sm" title={me.name}>
            {me.avatar ? (
              <img src={me.avatar} alt={me.name} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
            ) : ((me.name || "U").slice(0, 1).toUpperCase())}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card table">
        <div className="t-head wide-cols">
          <div className="th center">
            <input type="checkbox" checked={allChecked} onChange={() => toggleAll(visibleIds)} />
          </div>
          <div className="th">#</div>
          <div className="th">Client</div>
          <div className="th">Status</div>
          <div className="th right">Total</div>
          <div className="th">Issued Date</div>
          <div className="th right">Balance</div>
          <div className="th center">Actions</div>
        </div>

        {loading ? (
          <div className="t-row"><div className="td">Loading…</div></div>
        ) : filtered.length === 0 ? (
          <div className="t-row"><div className="td">No invoices</div></div>
        ) : (
          filtered.map((r) => (
            <div key={r.name} className="t-row wide-cols">
              <div className="td center">
                <input type="checkbox" checked={selected.has(r.name)} onChange={() => toggle(r.name)} />
              </div>
              <div className="td id">
                <span className="id-code" title={r.name}>{r.name}</span>
              </div>
              <div className="td">
                <div className="client roomy">
                  <div className="avatar">
                    {String(r.customer || "?").slice(0,1).toUpperCase()}
                  </div>
                  <div className="who">
                    <div className="name">{r.customer || "—"}</div>
                  </div>
                </div>
              </div>
              <div className="td">
                {String(r.status || "Draft").toLowerCase() === "paid" ? (
                  <span className="badge paid">Paid</span>
                ) : String(r.status || "").toLowerCase() === "overdue" ? (
                  <span className="badge overdue">Overdue</span>
                ) : (
                  <span className="badge unpaid">{r.status || "Unpaid"}</span>
                )}
              </div>
              <div className="td right">
                ${Number(r.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="td">{r.posting_date || "—"}</div>
              <div className="td right">
                ${Number(r.outstanding_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="td center">
                <div className="actions">
                  <button
                    className="icon-btn view"
                    title="View / Edit"
                    type="button"
                    onClick={() => navigate(`/invoice/${encodeURIComponent(r.name)}`)}
                  >
                    <Icon d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Zm9 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Delete"
                    type="button"
                    onClick={() => confirmDelete(r.name)}
                  >
                    <Icon d="M3 6h18M8 6v12m8-12v12M10 6l1-2h2l1 2" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <div className="t-foot">
          <div className="muted">Showing {filtered.length} of {rows.length}</div>
          <div className="pager">
            <button className="page-btn" disabled>‹</button>
            <span className="page-num">1</span>
            <button className="page-btn" disabled>›</button>
          </div>
        </div>
      </div>

      {/* Confirm delete modal */}
      <Modal
        open={modal.open}
        title="Delete invoices"
        onClose={() => setModal({ open: false, ids: [] })}
        onConfirm={() => {
          const ids = modal.ids || [];
          setModal({ open: false, ids: [] });
          doDelete(ids);
        }}
        confirmText="Delete"
        confirmTone="danger"
      >
        <p style={{ margin: 0 }}>
          Do you want to permanently delete{" "}
          <strong>{modal.ids?.length || 0}</strong> invoice
          {modal.ids?.length > 1 ? "s" : ""}?<br />
          <span className="muted">This will delete them from ERPNext as well.</span>
        </p>
      </Modal>

      {/* Toast for feedback */}
      <Toast msg={toast.msg} tone={toast.tone} onDone={() => setToast({ msg: "", tone: "ok" })} />
    </div>
  );
}
