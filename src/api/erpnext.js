// Minimal ERPNext client for the browser.
// Reads base URL and credentials from environment variables.
// Create .env (see bottom of this message) and RESTART dev server.

const BASE_URL = (process.env.REACT_APP_ERP_BASE_URL || "").replace(/\/$/, "");
const API_KEY = process.env.REACT_APP_ERP_API_KEY || "";
const API_SECRET = process.env.REACT_APP_ERP_API_SECRET || "";

if (!BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("REACT_APP_ERP_BASE_URL is not set. Set it in your .env");
}

// Build common headers
function authHeaders() {
  if (!API_KEY || !API_SECRET) return {};
  return {
    Authorization: `token ${API_KEY}:${API_SECRET}`,
  };
}

// Generic GET
async function get(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}${path}${qs ? "?" + qs : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...authHeaders(),
      Accept: "application/json",
    },
    // If you hit CORS issues in dev, either use a proxy or enable CORS in ERPNext
    mode: "cors",
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ERPNext GET ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

// -------------------- Public API -------------------- //

/**
 * List Sales Invoices with filters, paging and search.
 * @param {{search?:string,status?:string,page?:number,pageSize?:number}} options
 * @returns {Promise<Array>}
 */
export async function listSalesInvoices(options = {}) {
  const { search = "", status = "All", page = 1, pageSize = 25 } = options;

  // Fields we need for the table
  const fields = JSON.stringify([
    "name",                // invoice id
    "status",              // Paid/Unpaid/Overdue/Draft/Cancelled
    "customer",            // client name
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
    limit_page_length: String(pageSize),
  };

  // Filters
  const filters = [];
  if (status && status !== "All") {
    filters.push(["Sales Invoice", "status", "=", status]);
  }
  if (filters.length) params.filters = JSON.stringify(filters);

  // Search across name + customer
  if (search) {
    params.or_filters = JSON.stringify([
      ["Sales Invoice", "name", "like", `%${search}%`],
      ["Sales Invoice", "customer", "like", `%${search}%`],
    ]);
  }

  const data = await get("/api/resource/Sales%20Invoice", params);
  // ERPNext returns { data: [...] }
  return Array.isArray(data?.data) ? data.data : [];
}
