// api/lib/poster.js (ESM, підтримка token + access_token)

const RAW_BASE = process.env.POSTER_BASE || "https://joinposter.com/api";
const TOKEN    = process.env.POSTER_TOKEN || ""; // старий API-токен (працює для menu.*, тощо)
const ACCESS   = process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_OAUTH_TOKEN || ""; // OAuth2 access_token
const ACCOUNT  = process.env.POSTER_ACCOUNT || "its-a-date"; // сабдомен акаунта (без .joinposter.com)
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// Якщо є OAuth токен — використовуємо сабдомен акаунта (вимога Poster для access_token)
const BASE = (ACCESS && ACCOUNT)
  ? `https://${ACCOUNT}.joinposter.com/api`
  : RAW_BASE;

// Які методи вимагають саме access_token (OAuth)
function needsAccessToken(method) {
  return (
    method.startsWith("incomingOrders.") ||
    method.startsWith("access.") ||
    method === "transactions.create" ||
    method.startsWith("finance.") ||
    method.startsWith("book.") ||
    method.startsWith("cash_shift.") ||
    method.startsWith("clients.") ||
    method.startsWith("settings.") ||
    method.startsWith("spots.")
  );
}

function buildForm(params = {}, method = "") {
  const body = new URLSearchParams();

  // Підставляємо ОБИДВА поля — це безпечно; Poster сам візьме потрібне.
  if (TOKEN)  body.set("token", TOKEN);
  if (ACCESS) body.set("access_token", ACCESS);

  // Валідація перед викликом:
  if (needsAccessToken(method) && !ACCESS) {
    throw new Error("Poster OAuth access token is missing (POSTER_ACCESS_TOKEN). Re-run OAuth.");
  }
  if (!needsAccessToken(method) && !TOKEN && !ACCESS) {
    throw new Error("Poster token is missing. Set POSTER_TOKEN or POSTER_ACCESS_TOKEN.");
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  return body;
}

export async function posterCall(method, params = {}, preferPost = true) {
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: buildForm(params, method) });
    const t = await r.text();
    if (!r.ok) throw new Error(`Poster HTTP ${r.status}: ${t}`);
    try { return JSON.parse(t); } catch { /* якщо не JSON — спробуємо GET */ }
  }

  const u = new URL(url);
  u.search = buildForm(params, method).toString();
  const r2 = await fetch(u);
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

/** Допоміжні */
export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

// Мапимо позиції кошика (за title) до product_id з Poster
export async function mapLinesByName(cart = []) {
  const menu = await getMenuProducts();
  const byName = new Map(menu.map(p => [String(p.product_name).trim().toLowerCase(), p]));
  const lines = [];
  const notFound = [];

  for (const it of cart) {
    const key = String(it.title || "").trim().toLowerCase();
    const p = byName.get(key);
    if (!p) { notFound.push({ title: it.title, qty: it.qty }); continue; }
    lines.push({
      product_id: String(p.product_id),
      title: it.title,
      qty: Number(it.qty || 1),
      price: Number(it.price || 0),
    });
  }
  return { lines, notFound };
}

// Створення online-замовлення (incomingOrders.createIncomingOrder) — потребує OAuth (access_token)
export async function createIncomingOrder({ spotId, customer = {}, lines = [], total }) {
  const products = lines.map(l => ({ product_id: String(l.product_id), count: l.qty }));

  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",
    first_name: customer.firstName || "",
    last_name:  customer.lastName || "",
    comment:    customer.np || "",
    products,
  };

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) throw new Error(`incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  return resp?.response || resp;
}

// Створення продажу (чека) — transactions.create — також потребує OAuth (access_token)
export async function createSale({ reference, spotId, customer = {}, lines = [], total = 0 }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    price: Math.round(Number(l.price || 0) * 100), // у копійках
  }));

  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",
    comment: (reference || "").toString(),
    products,
    payment: { type: 1, sum: Math.round(Number(total || 0) * 100), currency: "UAH" },
  };

  const resp = await posterCall("transactions.create", payload, true);
  if (resp?.error) throw new Error(`transactions.create error: ${JSON.stringify(resp.error)}`);
  return resp?.response || resp;
}