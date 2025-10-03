// Minimal ERPNext client (browser).
// Uses token auth via env vars. Restart the dev server after editing .env.

const BASE_URL = (process.env.REACT_APP_ERP_BASE_URL || "").replace(/\/$/, "");
const API_KEY = process.env.REACT_APP_ERP_API_KEY || "";
const API_SECRET = process.env.REACT_APP_ERP_API_SECRET || "";

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("REACT_APP_ERP_BASE_URL is not set.");
}

export const ERP_BASE_URL = BASE_URL;

function authHeaders() {
  if (!API_KEY || !API_SECRET) return {};
  return { Authorization: `token ${API_KEY}:${API_SECRET}` };
}

function toQS(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, v);
  });
  return qs.toString();
}

async function get(path, params = {}) {
  const qs = toQS(params);
  const url = `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { ...authHeaders(), Accept: "application/json" },
    mode: "cors",
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ERPNext GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Build absolute file URL for /files/... etc. */
export function toAbsoluteUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
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
    "modified",
  ]);

  const params = {
    fields,
    order_by: "modified desc",
    limit_start: String((page - 1) * pageSize),
    limit_page_length: String(pageSize),
  };

  const filters = [];
  if (status && status !== "All") {
    filters.push(["Sales Invoice", "status", "=", status]);
  }
  if (filters.length) params.filters = JSON.stringify(filters);

  if (search) {
    params.or_filters = JSON.stringify([
      ["Sales Invoice", "name", "like", `%${search}%`],
      ["Sales Invoice", "customer", "like", `%${search}%`],
    ]);
  }

  const data = await get("/api/resource/Sales%20Invoice", params);
  return Array.isArray(data?.data) ? data.data : [];
}

/** Get logged user id (email). Falls back to env user if needed. */
export async function getLoggedUser() {
  try {
    const resp = await get("/api/method/frappe.auth.get_logged_user");
    return resp?.message || null;
  } catch {
    return process.env.REACT_APP_ERP_USER || null;
  }
}

/** Get a User doc (name, full_name, user_image). */
export async function getUserDoc(userId) {
  if (!userId) return null;
  const fields = JSON.stringify(["name", "full_name", "user_image"]);
  const resp = await get(`/api/resource/User/${encodeURIComponent(userId)}`, { fields });
  return resp?.data || null;
}
