import axios from "axios";

// API base (empty in dev to use CRA proxy)
const RAW_BASE = (process.env.REACT_APP_ERP_BASE_URL || "").trim();
export const ERP_BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/$/, "") : "";

// NEW: absolute UI host for opening ERPNext pages in a new tab
export const ERP_APP_URL =
  (process.env.REACT_APP_ERP_APP_URL || "").trim().replace(/\/$/, "") ||
  ERP_BASE_URL; // fallback if you do set a full base

function buildUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ERP_BASE_URL}${p}`;
}

const api = axios.create({
  baseURL: "", // relative; CRA proxy in dev
  withCredentials: false,
  validateStatus: (s) => s >= 200 && s < 300
});

api.interceptors.request.use((config) => {
  const key = process.env.REACT_APP_ERP_API_KEY || "";
  const secret = process.env.REACT_APP_ERP_API_SECRET || "";
  config.headers = { ...(config.headers || {}), Accept: "application/json" };
  if (key && secret) config.headers.Authorization = `token ${key}:${secret}`;
  return config;
});

export function toAbsoluteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${ERP_BASE_URL || ""}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function listSalesInvoices(options = {}) {
  const { search = "", status = "All", page = 1, pageSize = 25 } = options;

  const fields = JSON.stringify([
    "name",
    "status",
    "customer",
    "company",
    "grand_total",
    "outstanding_amount",
    "posting_date",
    "modified"
  ]);

  const params = {
    fields,
    order_by: "modified desc",
    limit_start: String((page - 1) * pageSize),
    limit_page_length: String(pageSize)
  };

  const filters = [];
  if (status && status !== "All") filters.push(["Sales Invoice", "status", "=", status]);
  if (filters.length) params.filters = JSON.stringify(filters);

  if (search) {
    params.or_filters = JSON.stringify([
      ["Sales Invoice", "name", "like", `%${search}%`],
      ["Sales Invoice", "customer", "like", `%${search}%`]
    ]);
  }

  const { data } = await api.get(buildUrl("/api/resource/Sales%20Invoice"), { params });
  return Array.isArray(data?.data) ? data.data : [];
}

export async function getLoggedUser() {
  const { data } = await api.get(buildUrl("/api/method/frappe.auth.get_logged_user"));
  return data?.message || null;
}

export async function getUserDoc(userId) {
  if (!userId) return null;
  const fields = JSON.stringify(["name", "full_name", "user_image"]);
  const { data } = await api.get(buildUrl(`/api/resource/User/${encodeURIComponent(userId)}`), {
    params: { fields }
  });
  return data?.data || null;
}

export async function createSalesInvoice(doc) {
  const { data } = await api.post(buildUrl("/api/resource/Sales%20Invoice"), doc, {
    headers: { "Content-Type": "application/json" }
  });
  return data?.data;
}

export async function searchCustomers(query) {
  const fields = JSON.stringify(["name", "customer_name", "customer_group"]);
  const params = { fields, limit_page_length: "20", order_by: "modified desc" };
  if (query) {
    params.or_filters = JSON.stringify([
      ["Customer", "name", "like", `%${query}%`],
      ["Customer", "customer_name", "like", `%${query}%`]
    ]);
  }
  const { data } = await api.get(buildUrl("/api/resource/Customer"), { params });
  return Array.isArray(data?.data) ? data.data : [];
}

export async function searchItems(query) {
  const fields = JSON.stringify(["name", "item_name", "description", "standard_rate", "stock_uom"]);
  const params = { fields, limit_page_length: "20", order_by: "modified desc" };
  if (query) {
    params.or_filters = JSON.stringify([
      ["Item", "name", "like", `%${query}%`],
      ["Item", "item_name", "like", `%${query}%`],
      ["Item", "description", "like", `%${query}%`]
    ]);
  }
  const { data } = await api.get(buildUrl("/api/resource/Item"), { params });
  return Array.isArray(data?.data) ? data.data : [];
}

export async function getItem(name) {
  if (!name) return null;
  const fields = JSON.stringify(["name", "item_name", "description", "standard_rate", "stock_uom"]);
  const { data } = await api.get(buildUrl(`/api/resource/Item/${encodeURIComponent(name)}`), {
    params: { fields }
  });
  return data?.data || null;
}
