// api/lib/poster.js  (ESM)

const BASE   = process.env.POSTER_BASE || "https://joinposter.com/api";
// Персональний токен (старий формат: account:hash)
const TOKEN  = process.env.POSTER_TOKEN || "";
// OAuth-токен застосунку (ПОВИНЕН бути встановлений!)
const ACCESS = process.env.POSTER_ACCESS_TOKEN || "";
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// Формуємо form-data: завжди кладемо і token, і access_token, якщо вони є
function form(params = {}) {
  const body = new URLSearchParams();
  if (TOKEN)  body.set("token", TOKEN);
  if (ACCESS) body.set("access_token", ACCESS);
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));
  return body;
}

export async function posterCall(method, params = {}, preferPost = true) {
  // Якщо немає ACCESS — одразу пояснюємо, чому впаде incomingOrders/transactions
  if (!ACCESS) {
    // menu.* ще може працювати зі звичайним token, але createIncomingOrder/transactions.create — НІ
    // Тому кидаємо зрозумілу помилку
    throw new Error("POSTER_ACCESS_TOKEN is not set");
  }

  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: form(params) });
    const txt = await r.text();
    if (!r.ok) throw new Error(`Poster HTTP ${r.status}: ${txt}`);
    try { return JSON.parse(txt); } catch { /* fallback нижче */ }
  }

  const u = new URL(url);
  u.search = form(params).toString();
  const r2 = await fetch(u);
  const txt2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${txt2}`);
  return JSON.parse(txt2);
}

/* === Хелпери === */

export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

// Мапимо позиції кошика за назвою з сайту -> product_id у Poster
export async function mapLinesByName(cart = []) {
  const menu = await getMenuProducts();
  const byName = new Map(
    menu.map(p => [String(p.product_name || "").trim().toLowerCase(), p])
  );

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

// Створення онлайн-замовлення (incomingOrders.createIncomingOrder)
export async function createIncomingOrder({ spotId, customer, lines }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
  }));

  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",
    first_name: customer.firstName || "",
    last_name: customer.lastName || "",
    comment: customer.np || "",
    products,
    // за потреби: service_mode: 2 (на виніс) або 3 (доставка)
  };

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) {
    throw new Error(`incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}

// (опційно) Продаж (чек) через transactions.create
export async function createSale({ spotId, customer, lines, total, reference }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    price: Math.round(Number(l.price || 0) * 100), // копійки
  }));

  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",
    products,
    payed_sum: Math.round(Number(total || 0) * 100),
    payed_currency: "UAH",
    comment: reference || "",
  };

  const resp = await posterCall("transactions.create", payload, true);
  if (resp?.error) {
    throw new Error(`transactions.create error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}