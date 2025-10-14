// api/lib/poster.js  (ESM)
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

// Нормалізуємо назву: у нижній регістр, прибираємо все, крім букв/цифр, стискаємо пробіли
function normName(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/&/g, "and")           // замінимо & → and
    .replace(/[’'`]/g, "")          // прибрати апострофи
    .replace(/[^a-z0-9а-яіїєґ\s]+/gi, " ") // інше сміття → пробіл
    .replace(/\s+/g, " ")           // стиснути пробіли
    .trim();
}

export async function mapLinesByName(cart = []) {
  const menu = await getMenuProducts();

  // Побудуємо кілька індексів для надійності:
  const byExact = new Map();   // точна нормалізована назва → продукт
  const list = [];             // масив {norm, prod} для contains/startsWith

  for (const p of menu) {
    const name = String(p.product_name || "");
    const norm = normName(name);
    if (norm) {
      if (!byExact.has(norm)) byExact.set(norm, p);
      list.push({ norm, prod: p });
    }
  }

  const lines = [];
  const notFound = [];

  for (const it of cart) {
    const title = String(it.title || "");
    const want = normName(title);
    if (!want) { notFound.push({ title: it.title, qty: it.qty }); continue; }

    // 1) повний збіг
    let found = byExact.get(want);

    // 2) якщо ні — пошук за “містить”
    if (!found) {
      found = list.find(x => x.norm === want || x.norm.includes(want) || want.includes(x.norm))?.prod;
    }

    if (!found) {
      notFound.push({ title: it.title, qty: it.qty });
      continue;
    }

    lines.push({
      product_id: String(found.product_id),
      title: it.title,
      qty: Number(it.qty || 1),
      price: Number(it.price || 0),
    });
  }

  return { lines, notFound };
}

  return { lines, notFound };


// Створення онлайн-замовлення (incomingOrders.createIncomingOrder)
export async function createIncomingOrder({ spotId, customer, lines }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty
  }));

  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",
    first_name: customer.firstName || "",
    last_name: customer.lastName || "",
    comment: customer.np || "",
    products
  };

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) throw new Error(`Poster incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  return resp?.response || resp;
}