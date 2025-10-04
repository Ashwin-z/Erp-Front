import React, { useEffect, useMemo, useState } from "react";
import {
  createSalesInvoice,
  searchCustomers,
  searchItems,
  getItem,
} from "../api/erpnext";
import { useNavigate } from "react-router-dom";

const toCurrency = (n) =>
  (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const nowHHMMSS = () => new Date().toTimeString().slice(0, 8);

const initialState = {
  naming_series: "ACC-SINV-.YYYY.-",
  customer: "",
  posting_date: today(),
  posting_time: nowHHMMSS(),
  due_date: "",
  is_pos: 0,
  is_return: 0,
  is_debit_note: 0,
  update_stock: 0,
  apply_discount_on: "Grand Total",
  is_cash_or_non_trade_discount: 0,
  additional_discount_percentage: 0,
  discount_amount: 0,
  tax_category: "",
  taxes_and_charges: "",
  shipping_rule: "",
  incoterm: "",
  items: [{ item_code: "", description: "", uom: "", qty: 1, rate: 0 }],
  taxes: [],
};

/* --- AsyncTypeahead (simple combobox) --- */
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
      } catch (err) {
        console.warn("Typeahead fetch failed:", err?.response?.status || err?.message);
        if (!alive) return;
        setOpts([]); // swallow errors
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

/* --- Items Table Row --- */
function ItemRow({ row, onChange, onRemove }) {
  const [suggest, setSuggest] = useState([]);

  return (
    <tr>
      <td className="col-item">
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
                  const res = await searchItems(val);
                  setSuggest(res || []);
                } catch {
                  setSuggest([]);
                }
              } else {
                setSuggest([]);
              }
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
                        item_code: it.name, // docname
                        description: full?.description || it.item_name || it.name,
                        uom: full?.stock_uom || it.stock_uom || "",
                        rate: Number(full?.standard_rate) || Number(row.rate) || 0,
                      });
                    } catch {
                      onChange({ ...row, item_code: it.name });
                    }
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
      <td className="col-qty">
        <input
          type="number"
          step="0.01"
          className="input"
          value={row.qty}
          onChange={(e) => onChange({ ...row, qty: e.target.value })}
        />
      </td>
      <td className="col-rate">
        <input
          type="number"
          step="0.01"
          className="input"
          value={row.rate}
          onChange={(e) => onChange({ ...row, rate: e.target.value })}
        />
      </td>
      <td className="col-amt">${toCurrency(row.qty * row.rate)}</td>
      <td className="col-act">
        <button className="icon-btn sm" type="button" title="Remove" onClick={onRemove}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6v12m8-12v12M10 6l1-2h2l1 2" stroke="currentColor" strokeWidth="1.7" fill="none" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

/* --- Taxes Table Row --- */
function TaxRow({ row, onChange, onRemove }) {
  return (
    <tr>
      <td className="col-type">
        <select
          className="input"
          value={row.charge_type}
          onChange={(e) => onChange({ ...row, charge_type: e.target.value })}
        >
          <option value="On Net Total">On Net Total</option>
          <option value="Actual">Actual</option>
        </select>
      </td>
      <td className="col-acct">
        <input
          className="input"
          placeholder="Account Head"
          value={row.account_head}
          onChange={(e) => onChange({ ...row, account_head: e.target.value })}
        />
      </td>
      <td className="col-rate">
        <input
          type="number"
          step="0.01"
          className="input"
          placeholder={row.charge_type === "Actual" ? "Amount" : "Rate %"}
          value={row.rate}
          onChange={(e) => onChange({ ...row, rate: e.target.value })}
        />
      </td>
      <td className="col-act">
        <button className="icon-btn sm" type="button" title="Remove" onClick={onRemove}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M3 6h18M8 6v12m8-12v12M10 6l1-2h2l1 2" stroke="currentColor" strokeWidth="1.7" fill="none" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export default function CreateInvoice() {
  const navigate = useNavigate();

  const [state, setState] = useState(initialState);
  const [created, setCreated] = useState(null); // {name}
  const [isSaving, setIsSaving] = useState(false);

  const totals = useMemo(() => {
    const total_qty = state.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const net_total = state.items.reduce(
      (s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0),
      0
    );
    let total_taxes_and_charges = 0;
    state.taxes.forEach((t) => {
      const rate = Number(t.rate) || 0;
      if (t.charge_type === "Actual") total_taxes_and_charges += rate;
      else total_taxes_and_charges += net_total * (rate / 100);
    });
    const base =
      state.apply_discount_on === "Grand Total" ? net_total + total_taxes_and_charges : net_total;
    const discount_total =
      (Number(state.discount_amount) || 0) ||
      base * ((Number(state.additional_discount_percentage) || 0) / 100);
    const grand_total = Math.max(0, net_total + total_taxes_and_charges - discount_total);
    return {
      total_qty,
      net_total,
      total_taxes_and_charges,
      discount_total,
      grand_total,
      outstanding_amount: grand_total,
    };
  }, [state]);

  const addItemRow = () =>
    setState((s) => ({
      ...s,
      items: [...s.items, { item_code: "", description: "", uom: "", qty: 1, rate: 0 }],
    }));
  const updateItemRow = (i, r) =>
    setState((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? r : it)) }));
  const removeItemRow = (i) =>
    setState((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  const addTaxRow = () =>
    setState((s) => ({
      ...s,
      taxes: [...s.taxes, { charge_type: "On Net Total", account_head: "", rate: 0 }],
    }));
  const updateTaxRow = (i, r) =>
    setState((s) => ({ ...s, taxes: s.taxes.map((it, idx) => (idx === i ? r : it)) }));
  const removeTaxRow = (i) =>
    setState((s) => ({ ...s, taxes: s.taxes.filter((_, idx) => idx !== i) }));

  const canSave = state.customer && state.items.some((i) => i.item_code && Number(i.qty) > 0);

  async function resolveItemsBeforeSave(items) {
    const resolved = [];
    const notFound = [];

    for (const row of items) {
      const code = String(row.item_code || "").trim();
      if (!code || !(Number(row.qty) > 0)) continue;

      let doc = null;
      try { doc = await getItem(code); } catch { doc = null; }

      if (!doc) {
        try {
          const candidates = await searchItems(code);
          const exactByName =
            candidates.find((c) => String(c.name).toLowerCase() === code.toLowerCase()) ||
            candidates.find((c) => String(c.item_name || "").toLowerCase() === code.toLowerCase());
          const pick = exactByName || candidates[0];
          if (pick) { try { doc = await getItem(pick.name); } catch { doc = null; } }
        } catch { /* ignore */ }
      }

      if (!doc) { notFound.push(code); continue; }

      resolved.push({
        item_code: doc.name,
        qty: Number(row.qty) || 0,
        rate: Number(row.rate) || Number(doc.standard_rate) || 0,
        description: row.description || doc.description || undefined,
        uom: row.uom || doc.stock_uom || undefined,
      });
    }

    return { resolved, notFound };
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return; // guard
    if (!canSave) {
      alert("Customer and at least 1 item (qty > 0) are required.");
      return;
    }

    setIsSaving(true);
    try {
      const { resolved, notFound } = await resolveItemsBeforeSave(state.items);
      if (notFound.length) {
        alert(
          `These items were not found in ERPNext: ${notFound.join(
            ", "
          )}\n\nPick an existing item from the dropdown or create it in ERPNext first.`
        );
        setIsSaving(false);
        return;
      }

      const payload = {
        naming_series: state.naming_series,
        customer: state.customer,
        posting_date: state.posting_date,
        posting_time: state.posting_time,
        due_date: state.due_date || undefined,
        is_pos: Number(!!state.is_pos),
        is_return: Number(!!state.is_return),
        is_debit_note: Number(!!state.is_debit_note),
        update_stock: Number(!!state.update_stock),

        tax_category: state.tax_category || undefined,
        taxes_and_charges: state.taxes_and_charges || undefined,
        shipping_rule: state.shipping_rule || undefined,
        incoterm: state.incoterm || undefined,

        apply_discount_on: state.apply_discount_on,
        is_cash_or_non_trade_discount: Number(!!state.is_cash_or_non_trade_discount),
        additional_discount_percentage: Number(state.additional_discount_percentage) || 0,
        discount_amount: Number(state.discount_amount) || 0,

        items: resolved,
        taxes: state.taxes.map((t) => ({
          charge_type: t.charge_type || "On Net Total",
          account_head: t.account_head,
          rate: Number(t.rate) || 0,
        })),
      };

      const doc = await createSalesInvoice(payload);

      // No auto-open and no "Open in ERPNext" button.
      setCreated({ name: doc.name });

      // Optional: reset form after success
      // setState(initialState);
      // Or navigate to list: navigate("/");
    } catch (e2) {
      console.error(e2);
      const serverMsg =
        e2?.response?.data?._server_messages ||
        e2?.response?.data?.message ||
        e2.message;
      alert("Failed to create invoice: " + serverMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const newErpInvoiceUrl = ""; // intentionally unused now

  return (
    <div className="page create-invoice">
      {/* Simple success note without any ERPNext link */}
      {created && (
        <div
          className="card"
          style={{
            padding: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderLeft: "4px solid var(--green)",
          }}
        >
          <div>
            Invoice <strong>{created.name}</strong> created successfully.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setState(initialState);
                setCreated(null);
              }}
            >
              New Invoice
            </button>
            <button className="btn" type="button" onClick={() => { setCreated(null); navigate("/"); }}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      <form className="card title-bar" onSubmit={onSubmit}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>New Sales Invoice</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Removed "Get Items From …" link and ERPNext open */}
          <button
            className="btn primary"
            type="submit"
            disabled={!canSave || isSaving}
            aria-busy={isSaving ? "true" : "false"}
          >
            Save
          </button>
          {isSaving && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {/* Inline SVG spinner (no CSS needed) */}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.7s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
              <span className="muted">Saving…</span>
            </div>
          )}
        </div>
      </form>

      {/* DETAILS */}
      <div className="card" style={{ padding: 16, display: "grid", gap: 18 }}>
        <div className="section-title">Details</div>

        <div className="grid2">
          <div>
            <label className="lbl">Series</label>
            <input
              className="input"
              value={state.naming_series}
              onChange={(e) => setState({ ...state, naming_series: e.target.value })}
            />
          </div>
          <div>
            <label className="lbl">Date</label>
            <input
              type="date"
              className="input"
              value={state.posting_date}
              onChange={(e) => setState({ ...state, posting_date: e.target.value })}
            />
          </div>
        </div>

        <div className="grid2">
          <div>
            <label className="lbl">Customer</label>
            <AsyncTypeahead
              value={state.customer}
              onChange={(v) => setState({ ...state, customer: v })}
              fetcher={searchCustomers}
              placeholder="Begin typing for results"
              renderOption={(c) => (
                <>
                  <div className="opt-title">{c.customer_name || c.name}</div>
                  <div className="opt-sub">{c.name}</div>
                </>
              )}
            />
          </div>
          <div className="grid2">
            <div>
              <label className="lbl">Posting Time</label>
              <input
                type="time"
                className="input"
                value={state.posting_time}
                onChange={(e) => setState({ ...state, posting_time: e.target.value })}
              />
            </div>
            <div>
              <label className="lbl">Payment Due Date</label>
              <input
                type="date"
                className="input"
                value={state.due_date}
                onChange={(e) => setState({ ...state, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flags">
          <label className="flag">
            <input
              type="checkbox"
              checked={!!state.is_pos}
              onChange={(e) => setState({ ...state, is_pos: e.target.checked })}
            />
            Include Payment (POS)
          </label>
          <label className="flag">
            <input
              type="checkbox"
              checked={!!state.is_return}
              onChange={(e) => setState({ ...state, is_return: e.target.checked })}
            />
            Is Return (Credit Note)
          </label>
          <label className="flag">
            <input
              type="checkbox"
              checked={!!state.is_debit_note}
              onChange={(e) => setState({ ...state, is_debit_note: e.target.checked })}
            />
            Rate Adjustment Entry (Debit Note)
          </label>
        </div>
      </div>

      {/* ITEMS */}
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="section-title">Items</div>
        <label className="flag" style={{ width: "fit-content" }}>
          <input
            type="checkbox"
            checked={!!state.update_stock}
            onChange={(e) => setState({ ...state, update_stock: e.target.checked })}
          />
          Update Stock
        </label>

        <table className="si-table">
          <thead>
            <tr>
              <th style={{ width: "40%" }}>Item</th>
              <th style={{ width: 120 }}>Quantity</th>
              <th style={{ width: 160 }}>Rate</th>
              <th style={{ width: 160 }}>Amount</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {state.items.map((row, i) => (
              <ItemRow
                key={i}
                row={row}
                onChange={(r) => updateItemRow(i, r)}
                onRemove={() => removeItemRow(i)}
              />
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={addItemRow}>
            Add Row
          </button>
        </div>

        <div className="grid2 mt8">
          <div>
            <div className="muted">Total Quantity</div>
            <div className="big">{toCurrency(totals.total_qty)}</div>
          </div>
          <div>
            <div className="muted">Total (Net Total)</div>
            <div className="big">${toCurrency(totals.net_total)}</div>
          </div>
        </div>
      </div>

      {/* TAXES & CHARGES */}
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="section-title">Taxes and Charges</div>
        <table className="si-table">
          <thead>
            <tr>
              <th style={{ width: 220 }}>Type</th>
              <th>Account Head</th>
              <th style={{ width: 200 }}>Tax Rate / Amount</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {state.taxes.map((row, i) => (
              <TaxRow
                key={i}
                row={row}
                onChange={(r) => updateTaxRow(i, r)}
                onRemove={() => removeTaxRow(i)}
              />
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={addTaxRow}>
            Add Row
          </button>
        </div>

        <div className="mt8">
          <div className="muted">Total Taxes and Charges</div>
          <div className="big">${toCurrency(totals.total_taxes_and_charges)}</div>
        </div>
      </div>

      {/* ADDITIONAL DISCOUNT */}
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="section-title">Additional Discount</div>
        <div className="grid3">
          <div>
            <label className="lbl">Apply Additional Discount On</label>
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
            <label className="lbl">Additional Discount Percentage</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={state.additional_discount_percentage}
              onChange={(e) =>
                setState({ ...state, additional_discount_percentage: e.target.value })
              }
            />
          </div>
          <div>
            <label className="lbl">Additional Discount Amount</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={state.discount_amount}
              onChange={(e) => setState({ ...state, discount_amount: e.target.value })}
            />
          </div>
        </div>
        <label className="flag">
          <input
            type="checkbox"
            checked={!!state.is_cash_or_non_trade_discount}
            onChange={(e) =>
              setState({ ...state, is_cash_or_non_trade_discount: e.target.checked })
            }
          />
          Is Cash or Non Trade Discount
        </label>
      </div>

      {/* TOTALS */}
      <div className="card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div className="section-title">Totals</div>
        <div className="grid3">
          <div>
            <div className="muted">Grand Total</div>
            <div className="big">${toCurrency(totals.grand_total)}</div>
          </div>
          <div>
            <div className="muted">Discount</div>
            <div className="big">-${toCurrency(totals.discount_total)}</div>
          </div>
          <div>
            <div className="muted">Outstanding Amount</div>
            <div className="big">${toCurrency(totals.outstanding_amount)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
