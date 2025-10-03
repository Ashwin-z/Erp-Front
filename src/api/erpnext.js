import axios from "axios";

// If REACT_APP_ERP_BASE_URL is empty, we call relative paths like /api/...,
// which CRA proxies to http://213.199.47.191 (see package.json "proxy").
const RAW_BASE = (process.env.REACT_APP_ERP_BASE_URL || "").trim();
export const ERP_BASE_URL = RAW_BASE ? RAW_BASE.replace(/\/$/, "") : "";

// Helper to build URL (relative in dev)
function buildUrl(path) {
  // Ensure we always have a leading slash and never double slashes
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${ERP_BASE_URL}${p}`;
}

// Axios instance
const api = axios.create({
  baseURL: "", // always relative; CRA proxy handles host/port in dev
  withCredentials: false,
  validateStatus: (s) => s >= 200 && s < 300 // axios throws on non-2xx
});

// Inject auth + accept
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

/** List Sales Invoices with filters/paging/search. */
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
  if (status && status !== "All") {
    filters.push(["Sales Invoice", "status", "=", status]);
  }
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
