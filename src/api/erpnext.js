// Robust ERPNext API helpers with fallbacks
import axios from "axios";

/** ENV
 * REACT_APP_ERP_HOST        -> http://213.199.47.191
 * REACT_APP_ERP_APP_URL     -> http://213.199.47.191
 * REACT_APP_ERP_API_KEY     -> <your key>
 * REACT_APP_ERP_API_SECRET  -> <your secret>
 */

export const ERP_HOST = (process.env.REACT_APP_ERP_HOST || "").replace(/\/+$/, "");
export const ERP_APP_URL =
  (process.env.REACT_APP_ERP_APP_URL || ERP_HOST || "").replace(/\/+$/, "");
const API_KEY = process.env.REACT_APP_ERP_API_KEY || "";
const API_SECRET = process.env.REACT_APP_ERP_API_SECRET || "";

const AUTH =
  API_KEY && API_SECRET ? { Authorization: `token ${API_KEY}:${API_SECRET}` } : {};

const api = axios.create({
  baseURL: `${ERP_HOST}/api`,
  headers: {
    "Content-Type": "application/json",
    ...AUTH,
  },
  timeout: 20000,
});

function unbox(res) {
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data?.message !== undefined) return res.data.message;
  return res?.data;
}

/* ---------- Utilities ---------- */
export function toAbsoluteUrl(path) {
  if (!path) return "";
  const p = String(path);
  if (/^(https?:|data:|blob:)/i.test(p)) return p;
  const base = ERP_APP_URL || ERP_HOST || "";
  if (p.startsWith("/")) return `${base}${p}`;
  return `${base}/${p}`;
}

export async function getLoggedUser() {
  try {
    const r = await api.get(`/method/frappe.auth.get_logged_user`);
    const u = unbox(r);
    if (u && typeof u === "string") return u;
  } catch {}
  return "Administrator";
}

export async function getUserDoc(userNameOrEmail) {
  if (!userNameOrEmail) return null;
  const params = {
    fields: JSON.stringify([
      "name",
      "full_name",
      "first_name",
      "last_name",
      "username",
      "user_image",
      "email",
      "enabled",
    ]),
  };
  try {
    const r = await api.get(`/resource/User/${encodeURIComponent(userNameOrEmail)}`, { params });
    return unbox(r);
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

/* ---------- Customers & Items ---------- */
export async function searchCustomers(q = "") {
  const params = {
    fields: JSON.stringify(["name", "customer_name", "image"]),
    or_filters: JSON.stringify([
      ["Customer", "name", "like", `%${q}%`],
      ["Customer", "customer_name", "like", `%${q}%`],
    ]),
    limit_page_length: 10,
    order_by: "modified desc",
  };

  try {
    const r = await api.get(`/resource/Customer`, { params });
    const rows = unbox(r) || [];
    return rows.map((c) => ({
      name: c.name,
      customer_name: c.customer_name || c.name,
      image: c.image || "",
    }));
  } catch {
    try {
      const r2 = await api.post(`/method/frappe.desk.search.search_link`, {
        doctype: "Customer",
        txt: q || "",
        page_length: 10,
      });
      const out = unbox(r2) || [];
      return out.map((o) => ({
        name: o.value,
        customer_name: o.description || o.value,
        image: "",
      }));
    } catch {
      return [];
    }
  }
}

export async function searchItems(q = "") {
  const params = {
    fields: JSON.stringify([
      "name",
      "item_name",
      "stock_uom",
      "image",
      "description",
      "standard_rate",
    ]),
    or_filters: JSON.stringify([
      ["Item", "name", "like", `%${q}%`],
      ["Item", "item_name", "like", `%${q}%`],
      ["Item", "item_code", "like", `%${q}%`],
    ]),
    limit_page_length: 10,
    order_by: "modified desc",
  };

  try {
    const r = await api.get(`/resource/Item`, { params });
    return unbox(r) || [];
  } catch {
    try {
      const r2 = await api.post(`/method/frappe.desk.search.search_link`, {
        doctype: "Item",
        txt: q || "",
        page_length: 10,
      });
      const out = unbox(r2) || [];
      return out.map((o) => ({ name: o.value, item_name: o.description || o.value }));
    } catch {
      return [];
    }
  }
}

export async function getItem(name) {
  try {
    const r = await api.get(`/resource/Item/${encodeURIComponent(name)}`);
    return unbox(r);
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

/* ---------- Sales Invoice CRUD ---------- */
export async function listSalesInvoices(params = {}) {
  const defaults = {
    fields: JSON.stringify([
      "name",
      "customer",
      "posting_date",
      "grand_total",
      "outstanding_amount",
      "status",
    ]),
    limit_page_length: 50,
    order_by: "posting_date desc, modified desc",
  };
  const r = await api.get(`/resource/Sales%20Invoice`, { params: { ...defaults, ...params } });
  return unbox(r) || [];
}

export async function getSalesInvoice(name) {
  const params = {
    fields: JSON.stringify([
      "name",
      "customer",
      "posting_date",
      "posting_time",
      "due_date",
      "grand_total",
      "outstanding_amount",
      "status",
      "is_pos",
      "is_return",
      "is_debit_note",
      "update_stock",
      "apply_discount_on",
      "is_cash_or_non_trade_discount",
      "additional_discount_percentage",
      "discount_amount",
    ]),
  };
  const r = await api.get(`/resource/Sales%20Invoice/${encodeURIComponent(name)}`, { params });
  const doc = unbox(r);

  // fetch children (items, taxes) in one go
  const r2 = await api.get(
    `/resource/Sales%20Invoice/${encodeURIComponent(name)}`,
    {
      params: {
        fields: JSON.stringify(["name"]),
        children: JSON.stringify({
          items: ["name", "item_code", "description", "uom", "qty", "rate", "amount"],
          taxes: ["name", "charge_type", "account_head", "rate"],
        }),
      },
    }
  ).catch(() => null);

  if (r2?.data?.data?.children) {
    doc.items = r2.data.data.children.items || [];
    doc.taxes = r2.data.data.children.taxes || [];
  }
  return doc;
}

export async function createSalesInvoice(payload) {
  const r = await api.post(`/resource/Sales%20Invoice`, {
    doctype: "Sales Invoice",
    ...payload,
  });
  return unbox(r);
}

export async function updateSalesInvoice(name, payload) {
  const r = await api.put(`/resource/Sales%20Invoice/${encodeURIComponent(name)}`, payload);
  return unbox(r);
}

export async function deleteSalesInvoice(name) {
  const r = await api.delete(`/resource/Sales%20Invoice/${encodeURIComponent(name)}`);
  return unbox(r);
}

export const ERP_BASE_URL = `${ERP_HOST}/api`;
export default api;
