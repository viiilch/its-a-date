// api/lib/poster.js  (ESM) — універсальний клієнт Poster
const BASE  = process.env.POSTER_BASE  || "https://joinposter.com/api";
const TOKEN = process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_TOKEN || "";
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

function makeForm(params = {}) {
  const body = new URLSearchParams();
  // ⚠️ Кладемо токен в ОБИДВА ключі, щоб задовольнити всі методи Poster
  body.set("token", TOKEN);
  body.set("access_token", TOKEN);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  return body;
}

// універсальний виклик
export async function posterCall(method, params = {}, forcePost = true) {
  if (!TOKEN) throw new Error("POSTER_ACCESS_TOKEN/POSTER_TOKEN is not set");

  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  // БАГАТО методів вимагають саме POST + form-data
  if (forcePost) {
    const r = await fetch(url, { method: "POST", headers, body: makeForm(params) });
    const t = await r.text();
    // іноді приходить \n або пробіли — чистимо
    const clean = t.trim();
    if (!r.ok) throw new Error(`Poster HTTP ${r.status}: ${clean}`);
    try { return JSON.parse(clean); } catch { throw new Error(`Poster JSON parse error: ${clean}`); }
  }

  // fallback GET (рідко потрібно)
  const u = new URL(url);
  u.search = makeForm(params).toString();
  const r2 = await fetch(u);
  const t2 = (await r2.text()).trim();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

/** Довідник меню (GET можна, але стабільніше через POST=false) */
export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

/** Меппінг назв з кошика -> product_id у Poster */
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

/** Створення онлайн-замовлення (incomingOrders.createIncomingOrder) — строго POST */
export async function createIncomingOrder({ spotId, customer, lines, payment } = {}) {
  const products = lines.map(l => ({ product_id: String(l.product_id), count: l.qty }));

  const payload = {
    spot_id: String(spotId),
    phone: customer?.phone || "",
    first_name: customer?.firstName || "",
    last_name: customer?.lastName || "",
    comment: customer?.np || "",
    // необов’язково, але Poster краще сприймає products як form-array
    // makeForm() сам зробить x-www-form-urlencoded, але для масивів Poster приймає такий формат:
    // products[0][product_id], products[0][count], ...
  };

  // Розкладаємо products у payload як form-keys
  products.forEach((p, i) => {
    payload[`products[${i}][product_id]`] = p.product_id;
    payload[`products[${i}][count]`] = p.count;
  });

  // Якщо була попередня оплата — можна додати
  if (payment && payment.sum) {
    payload["payment[type]"] = 1;
    payload["payment[sum]"]  = payment.sum;     // у копійках
    payload["payment[currency]"] = payment.currency || "UAH";
  }

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) throw new Error(`incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  return resp?.response || resp;
}