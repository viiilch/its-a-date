// api/lib/poster.js  (ESM, пріоритет — OAuth access_token на піддомені акаунта)

const ACCOUNT = process.env.POSTER_ACCOUNT || "";                     // its-a-date
const ACCESS  = process.env.POSTER_ACCESS_TOKEN || "";                // OAuth access_token
const BASE    =
  process.env.POSTER_BASE ||
  (ACCOUNT ? `https://${ACCOUNT}.joinposter.com/api` : "https://joinposter.com/api");

const PERSONAL = process.env.POSTER_TOKEN || "";                      // особистий токен (fallback)
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// Формуємо форму з правильним параметром токена
function form(params = {}) {
  const body = new URLSearchParams();

  if (ACCESS) {
    // режим OAuth — обов’язково на піддомені акаунта і параметр access_token
    body.set("access_token", ACCESS);
  } else if (PERSONAL) {
    // fallback: особистий токен
    body.set("token", PERSONAL);
  } else {
    throw new Error("No Poster token set (POSTER_ACCESS_TOKEN or POSTER_TOKEN)");
  }

  for (const [k, v] of Object.entries(params)) body.set(k, String(v));
  return body;
}

async function posterCall(method, params = {}, preferPost = true) {
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

// --- Хелпери ---

export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

export async function mapLinesByName(cart = []) {
  const menu = await getMenuProducts();
  const byName = new Map(
    menu.map(p => [String(p.product_name).trim().toLowerCase(), p])
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
  };

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) throw new Error(
    `incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`
  );
  return resp?.response || resp;
}