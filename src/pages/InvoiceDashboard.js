import React, { useMemo, useState } from "react";

const sample = [
  { id: "INV-00123", customer: "Acme LLC", date: "2025-09-10", total: 1240.50, status: "Paid" },
  { id: "INV-00124", customer: "Globex",   date: "2025-09-12", total: 780.00,  status: "Overdue" },
  { id: "INV-00125", customer: "Initech",  date: "2025-09-18", total: 213.99,  status: "Draft" },
];

export default function InvoiceDashboard() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return sample.filter(r =>
      r.id.toLowerCase().includes(s) ||
      r.customer.toLowerCase().includes(s) ||
      r.status.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div className="card">
      <div className="card-head">
        <h1>Invoices</h1>
        <div className="filters">
          <input
            className="input"
            placeholder="Filter by #, customer, status"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <select className="input">
            <option value="">All statuses</option>
            <option>Draft</option>
            <option>Paid</option>
            <option>Overdue</option>
          </select>
        </div>
      </div>

      <div className="table">
        <div className="t-head">
          <div>#</div><div>Customer</div><div>Date</div><div>Total</div><div>Status</div>
        </div>
        {rows.map(r => (
          <div className="t-row" key={r.id}>
            <div className="mono">{r.id}</div>
            <div>{r.customer}</div>
            <div>{r.date}</div>
            <div>${r.total.toLocaleString()}</div>
            <div><span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span></div>
          </div>
        ))}
        {rows.length === 0 && <div className="empty">No invoices match your filter.</div>}
      </div>
    </div>
  );
}
