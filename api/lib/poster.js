// ESM-модуль з чистими експортами — без top-level return
const BASE  = process.env.POSTER_BASE  || "https://joinposter.com/api";
const TOKEN = process.env.POSTER_TOKEN || "";
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

function form(params = {}) {
  const body = new URLSearchParams();
  body.set("token", TOKEN);
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));
  return body;
}

export async function posterCall(method, params = {}, preferPost = true) {
  if (!TOKEN) throw new Error("POSTER_TOKEN is not set");
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: form(params) });
    const t = await r.text();
    if (r.ok && t.trim().startsWith("{")) return JSON.parse(t);
  }
  const u = new URL(url);
  u.search = form(params).toString();
  const r2 = await fetch(u);
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

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

// Створення incoming order (онлайн-замовлення)
export async function createIncomingOrder({ spotId, customer, lines }) {
  const products = lines.map(l => ({ product_id: String(l.product_id), count: l.qty }));
  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",
    first_name: customer.firstName || "",
    last_name: customer.lastName || "",
    comment: customer.np || "",
    products,
  };
  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) {
    throw new Error(`Poster incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}
// --- ДОДАТИ НИЖЧЕ У ФАЙЛ api/lib/poster.js ---

/**
 * Створити чек у Poster (автопродаж) через transactions.create
 * Приймає: spotId, customer {firstName,lastName,phone,np}, lines [{product_id, qty, price}], total
 * Платіж виставляємо як безготівковий (карта) — payment=1, payed_sum=total
 */
export async function createSale({ spotId, customer, lines, total }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: Number(l.qty) || 1,
    price: Number(l.price) || 0,
    title: l.title || ""
  }));

  const payload = {
    spot_id: String(spotId),
    products,
    first_name: customer.firstName || "",
    last_name:  customer.lastName  || "",
    phone:      customer.phone     || "",
    comment:    customer.np ? `НП: ${customer.np}` : "",
    // Оплата карткою (безготівка). Poster у простому випадку приймає:
    // payment = 1 (card) і payed_sum = сума чеку.
    payment: 1,
    payed_sum: Number(total) || products.reduce((s,p)=>s + (p.price * p.count), 0),
  };

  const resp = await posterCall("transactions.create", payload, true);
  if (resp?.error) {
    throw new Error(`Poster transactions.create error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}