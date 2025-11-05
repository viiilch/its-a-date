// api/lib/poster.js (ESM)

const RAW_BASE = process.env.POSTER_BASE || "https://joinposter.com/api"; // глобальна база
const TOKEN    = process.env.POSTER_TOKEN || ""; // старий app-token (для menu.*, incomingOrders.*)
const ACCESS   = process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_OAUTH_TOKEN || ""; // OAuth access_token
const ACCOUNT  = process.env.POSTER_ACCOUNT || "its-a-date"; // сабдомен акаунта без .joinposter.com
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// Які методи ВИМАГАЮТЬ саме access_token (OAuth, через сабдомен)
function needsAccessToken(method) {
  return (
    method.startsWith("access.") ||
    method.startsWith("finance.") ||
    method.startsWith("book.") ||
    method.startsWith("cash_shift.") ||
    method.startsWith("clients.") ||
    method.startsWith("settings.") ||
    method.startsWith("spots.") ||
    method === "transactions.create"
  );
}

// Які методи треба гнати на ГЛОБАЛЬНУ базу + app-token
function forceGlobalWithToken(method) {
  return method.startsWith("incomingOrders.") || method.startsWith("menu.");
}

// Вибір базового URL залежно від методу
function pickBase(method) {
  if (forceGlobalWithToken(method)) return RAW_BASE;
  if (ACCESS && ACCOUNT) return `https://${ACCOUNT}.joinposter.com/api`;
  return RAW_BASE;
}

// Формування form-data з правильним набором токенів
function buildForm(params = {}, method = "") {
  const body = new URLSearchParams();

  if (forceGlobalWithToken(method)) {
    // incomingOrders.*, menu.* — обов’язково app-token
    if (!TOKEN) throw new Error("Poster app token (POSTER_TOKEN) is missing for this method.");
    body.set("token", TOKEN);
  } else if (needsAccessToken(method)) {
    // методи, що вимагають OAuth
    if (!ACCESS) throw new Error("Poster OAuth access token (POSTER_ACCESS_TOKEN) is missing for this method.");
    body.set("access_token", ACCESS);
  } else {
    // інше — дозволимо будь-що з наявного
    if (ACCESS) body.set("access_token", ACCESS);
    if (TOKEN)  body.set("token", TOKEN);
    if (!ACCESS && !TOKEN) {
      throw new Error("No Poster credentials. Set POSTER_TOKEN or POSTER_ACCESS_TOKEN.");
    }
  }

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  return body;
}

export async function posterCall(method, params = {}, preferPost = true) {
  const BASE = pickBase(method);
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  // POST
  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: buildForm(params, method) });
    const t = await r.text();
    if (!r.ok) throw new Error(`Poster HTTP ${r.status}: ${t}`);
    try { return JSON.parse(t); } catch { /* спробуємо GET нижче */ }
  }

  // fallback GET
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

// Створення online-замовлення (incomingOrders.createIncomingOrder) — ГЛОБАЛЬНА база + token
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

// Створення продажу (чека) — transactions.create — Сабдомен акаунта + access_token
export async function createSale({ reference, spotId, customer = {}, lines = [], total = 0 }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    price: Math.round(Number(l.price || 0) * 100), // копійки
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