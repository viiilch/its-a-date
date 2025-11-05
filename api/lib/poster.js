// api/lib/poster.js  (ESM) — універсальна підтримка API token + OAuth access_token

const ACCOUNT = process.env.POSTER_ACCOUNT || "its-a-date";
// OAuth-токен (через OAuth callback). Бери з env: POSTER_ACCESS_TOKEN або POSTER_OAUTH_TOKEN
const ACCESS  = process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_OAUTH_TOKEN || "";
// Старий API-токен (не OAuth). Не обов’язковий, але може знадобитись для частини методів.
const TOKEN   = process.env.POSTER_TOKEN || "";
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// Базовий URL: якщо є OAuth-токен і логін акаунта, ходимо на сабдомен
const RAW_BASE = process.env.POSTER_BASE || "https://joinposter.com/api";
const BASE = (ACCESS && ACCOUNT)
  ? `https://${ACCOUNT}.joinposter.com/api`
  : RAW_BASE;

// Які методи точно потребують саме access_token (OAuth)
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

// Формуємо body/query для запиту
function formParams(params = {}, method = "") {
  const body = new URLSearchParams();

  // Якщо є OAuth — обов’язково додаємо access_token
  if (ACCESS) body.set("access_token", ACCESS);
  // За наявності — можна також додати звичайний token (не завадить)
  if (TOKEN)  body.set("token", TOKEN);

  // Валідація: метод вимагає OAuth, але його немає
  if (needsAccessToken(method) && !ACCESS) {
    throw new Error("Poster OAuth access token is missing (POSTER_ACCESS_TOKEN). Re-run OAuth.");
  }
  // Якщо метод не вимагає OAuth — має бути хоча б один із токенів
  if (!needsAccessToken(method) && !ACCESS && !TOKEN) {
    throw new Error("Poster token is missing. Set POSTER_ACCESS_TOKEN (OAuth) or POSTER_TOKEN.");
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  return body;
}

// Базовий виклик API
export async function posterCall(method, params = {}, preferPost = true) {
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: formParams(params, method) });
    const t = await r.text();
    if (!r.ok) throw new Error(`Poster HTTP ${r.status}: ${t}`);
    try { return JSON.parse(t); } catch { /* fallthrough to GET */ }
  }

  const u = new URL(url);
  u.search = formParams(params, method).toString();
  const r2 = await fetch(u);
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

/** Зручні хелпери */
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

// Створення online-замовлення (потребує OAuth access_token)
export async function createIncomingOrder({ spotId, customer = {}, lines = [], total }) {
  const products = lines.map(l => ({ product_id: String(l.product_id), count: l.qty }));
  const payload = {
    spot_id: String(spotId),
    phone:     customer.phone || "",
    first_name: customer.firstName || "",
    last_name:  customer.lastName  || "",
    comment:    customer.np || "",
    products,
  };
  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) throw new Error(`incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  return resp?.response || resp;
}

// Створення продажу (чека) — потребує OAuth access_token
export async function createSale({ reference, spotId, customer = {}, lines = [], total = 0 }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    price: Math.round(Number(l.price || 0) * 100), // у копійках
  }));
  const payload = {
    spot_id: String(spotId),
    phone:   customer.phone || "",
    comment: (reference || "").toString(),
    products,
    payment: { type: 1, sum: Math.round(Number(total || 0) * 100), currency: "UAH" },
  };
  const resp = await posterCall("transactions.create", payload, true);
  if (resp?.error) throw new Error(`transactions.create error: ${JSON.stringify(resp.error)}`);
  return resp?.response || resp;
}