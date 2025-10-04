import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSalesInvoice,
  updateSalesInvoice,
  searchCustomers,
  searchItems,
  getItem,
} from "../api/erpnext";

const toCurrency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AsyncTypeahead({ value, onChange, fetcher, placeholder = "", renderOption }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open) return;
      try {
        const res = await fetcher(q || "");
        if (!alive) return;
        setOpts(res || []);
      } catch {
        setOpts([]);
      }
    })();
    return () => { alive = false; };
  }, [q, open, fetcher]);

  return (
    <div className="combo">
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { setQ(e.target.value); onChange(e.target.value); }}
      />
      {open && opts?.length > 0 && (
        <div className="combo-pop">
          {opts.map((o) => (
            <div
              key={o.name}
              className="combo-opt"
              onMouseDown={() => { onChange(o.name); setQ(o.name); setOpen(false); }}
            >
              {renderOption ? renderOption(o) : <span>{o.name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemRow({ row, onChange, onRemove }) {
  const [suggest, setSuggest] = useState([]);

  return (
    <tr>
      <td>
        <div className="combo">
          <input
            className="input"
            value={row.item_code}
            placeholder="Begin typing item…"
            onChange={async (e) => {
              const val = e.target.value;
              onChange({ ...row, item_code: val });
              if (val.length >= 2) {
                try {
                  const res = await searchItems(val); setSuggest(res || []);
                } catch { setSuggest([]); }
              } else { setSuggest([]); }
            }}
            onBlur={() => setTimeout(() => setSuggest([]), 150)}
          />
          {!!suggest.length && (
            <div className="combo-pop">
              {suggest.map((it) => (
                <div
                  key={it.name}
                  className="combo-opt"
                  onMouseDown={async () => {
                    try {
                      const full = await getItem(it.name);
                      onChange({
                        ...row,
                        item_code: it.name,
                        description: full?.description || it.item_name || it.name,
                        uom: full?.stock_uom || it.stock_uom || "",
                        rate: Number(full?.standard_rate) || Number(row.rate) || 0,
                      });
                    } catch { onChange({ ...row, item_code: it.name }); }
                    setSuggest([]);
                  }}
                >
                  <div className="opt-title">{it.item_name || it.name}</div>
                  <div className="opt-sub">{it.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {!!row.description && <div className="muted tiny mt4">{row.description}</div>}
      </td>
      <td>
        <input type="number" step="0.01" className="input" value={row.qty}
               onChange={(e) => onChange({ ...row, qty: e.target.value })}/>
      </td>
      <td>
        <input type="number" step="0.01" className="input" value={row.rate}
               onChange={(e) => onChange({ ...row, rate: e.target.value })}/>
      </td>
      <td className="col-amt">${toCurrency(row.qty * row.rate)}</td>
      <td>
        <button className="icon-btn sm danger" type="button" onClick={onRemove} title="Remove row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M8 6v12m8-12v12M10 6l1-2h2l1 2" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export default function InvoiceViewEdit() {
  const { name } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const doc = await getSalesInvoice(name);
        // Normalise children arrays
        setState({
          ...doc,
          items: (doc.items || []).map((i) => ({
            item_code: i.item_code, description: i.description || "", uom: i.uom || "",
            qty: Number(i.qty) || 0, rate: Number(i.rate) || 0
          })),
          taxes: (doc.taxes || []).map((t) => ({
            charge_type: t.charge_type || "On Net Total",
            account_head: t.account_head || "",
            rate: Number(t.rate) || 0
          })),
        });
      } catch (e) {
        alert("Failed to load invoice: " + (e?.response?.data?.message || e.message));
        navigate("/");
      }
    })();
  }, [name, navigate]);

  const totals = useMemo(() => {
    if (!state) return { net_total: 0, taxes: 0, grand_total: 0 };
    const net = state.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
    let taxes = 0;
    state.taxes.forEach((t) => {
      const r = Number(t.rate) || 0;
      if (t.charge_type === "Actual") taxes += r;
      else taxes += net * (r / 100);
    });
    const base = state.apply_discount_on === "Grand Total" ? net + taxes : net;
    const disc = (Number(state.discount_amount) || 0) ||
      base * ((Number(state.additional_discount_percentage) || 0) / 100);
    const grand = Math.max(0, net + taxes - disc);
    return { net_total: net, taxes, grand_total: grand };
  }, [state]);

  if (!state) return <div className="page"><div className="card" style={{padding:16}}>Loading…</div></div>;

  const canSave = state.customer && state.items.some((i) => i.item_code && Number(i.qty) > 0);

  async function onSave(e) {
    e.preventDefault();
    if (saving || !canSave) return;
    setSaving(true);
    try {
      const payload = {
        customer: state.customer,
        posting_date: state.posting_date,
        posting_time: state.posting_time,
        due_date: state.due_date || undefined,
        apply_discount_on: state.apply_discount_on,
        is_cash_or_non_trade_discount: Number(!!state.is_cash_or_non_trade_discount),
        additional_discount_percentage: Number(state.additional_discount_percentage) || 0,
        discount_amount: Number(state.discount_amount) || 0,
        items: state.items.map((r) => ({
          item_code: r.item_code, qty: Number(r.qty) || 0, rate: Number(r.rate) || 0,
          description: r.description || undefined, uom: r.uom || undefined
        })),
        taxes: state.taxes.map((t) => ({
          charge_type: t.charge_type || "On Net Total",
          account_head: t.account_head, rate: Number(t.rate) || 0,
        })),
      };
      await updateSalesInvoice(name, payload);
      alert("Invoice updated.");
      navigate("/");
    } catch (e2) {
      alert("Failed to save: " + (e2?.response?.data?.message || e2.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <form className="card title-bar" onSubmit={onSave}>
        <div style={{ fontWeight:800, fontSize:18 }}>Invoice: {name}</div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button className="btn primary" type="submit" disabled={!canSave || saving}>
            Save
          </button>
          {saving && <span className="muted">Saving…</span>}
        </div>
      </form>

      <div className="card" style={{ padding:16, display:"grid", gap:16 }}>
        <div className="grid2">
          <div>
            <label className="lbl">Customer</label>
            <AsyncTypeahead
              value={state.customer}
              onChange={(v) => setState({ ...state, customer: v })}
              fetcher={searchCustomers}
              placeholder="Begin typing for results"
              renderOption={(c) => (<><div className="opt-title">{c.customer_name || c.name}</div><div className="opt-sub">{c.name}</div></>)}
            />
          </div>
          <div className="grid2">
            <div>
              <label className="lbl">Date</label>
              <input
                type="date" className="input" value={state.posting_date}
                onChange={(e) => setState({ ...state, posting_date: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">Due Date</label>
              <input
                type="date" className="input" value={state.due_date || ""}
                onChange={(e) => setState({ ...state, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:16, display:"grid", gap:12 }}>
        <div className="section-title">Items</div>
        <table className="si-table">
          <thead>
            <tr>
              <th style={{ width:"40%" }}>Item</th>
              <th style={{ width:120 }}>Qty</th>
              <th style={{ width:160 }}>Rate</th>
              <th style={{ width:160 }}>Amount</th>
              <th style={{ width:60 }} />
            </tr>
          </thead>
          <tbody>
            {state.items.map((row, i) => (
              <ItemRow
                key={i}
                row={row}
                onChange={(r) => setState((s) => ({ ...s, items: s.items.map((x, idx) => idx === i ? r : x) }))}
                onRemove={() => setState((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }))}
              />
            ))}
          </tbody>
        </table>
        <button className="btn" type="button" onClick={() =>
          setState((s) => ({ ...s, items: [...s.items, { item_code:"", description:"", uom:"", qty:1, rate:0 }] }))
        }>Add Row</button>
        <div className="grid2">
          <div>
            <div className="muted">Net Total</div>
            <div className="big">${toCurrency(totals.net_total)}</div>
          </div>
          <div>
            <div className="muted">Grand Total</div>
            <div className="big">${toCurrency(totals.grand_total)}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:16, display:"grid", gap:12 }}>
        <div className="section-title">Discounts</div>
        <div className="grid3">
          <div>
            <label className="lbl">Apply On</label>
            <select
              className="input"
              value={state.apply_discount_on}
              onChange={(e) => setState({ ...state, apply_discount_on: e.target.value })}
            >
              <option value="Grand Total">Grand Total</option>
              <option value="Net Total">Net Total</option>
            </select>
          </div>
          <div>
            <label className="lbl">Discount %</label>
            <input
              type="number" step="0.01" className="input"
              value={state.additional_discount_percentage || 0}
              onChange={(e) => setState({ ...state, additional_discount_percentage: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Discount Amount</label>
            <input
              type="number" step="0.01" className="input"
              value={state.discount_amount || 0}
              onChange={(e) => setState({ ...state, discount_amount: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
