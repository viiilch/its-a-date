// api/lib/poster.js  (ESM, Node 18+)

// ====== ENV ======
const BASE  = process.env.POSTER_BASE  || "https://joinposter.com/api";
const TOKEN = process.env.POSTER_TOKEN || "";                   // має бути у Vercel Env
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";// "1" за замовчуванням

// ====== helpers ======
function safeLog(obj) {
  // не логимо токени
  const clone = JSON.parse(JSON.stringify(obj || {}));
  if (clone.token) clone.token = "HIDDEN";
  if (clone.access_token) clone.access_token = "HIDDEN";
  return clone;
}

/**
 * Формує urlencoded body. ВАЖЛИВО: додаємо ОБИДВА параметри:
 * - token         — працює з menu/* та іншим
 * - access_token  — потрібен для access/*, transactions/* тощо
 */
function form(params = {}) {
  const body = new URLSearchParams();
  if (TOKEN) {
    body.set("token", TOKEN);
    body.set("access_token", TOKEN);
  }
  for (const [k, v] of Object.entries(params)) {
    // NULL/undefined не шлемо
    if (v !== undefined && v !== null) body.set(k, String(v));
  }
  return body;
}

/**
 * Базовий виклик Poster API
 * @param {string} method - наприклад "menu.getProducts"
 * @param {object} params - параметри запиту
 * @param {boolean} preferPost - спочатку POST, інакше GET
 */
export async function posterCall(method, params = {}, preferPost = true) {
  if (!TOKEN) throw new Error("POSTER_TOKEN is not set");
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  // 1) POST
  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: form(params) });
    const t = await r.text();
    // Poster інколи відповідає рядком; парсимо лише JSON
    if (r.ok && t.trim().startsWith("{")) {
      const parsed = JSON.parse(t);
      if (parsed?.error) throw new Error(`${method} error: ${JSON.stringify(parsed.error)}`);
      return parsed;
    }
    // якщо не JSON — падати не будемо, спробуємо GET
  }

  // 2) GET fallback
  const u = new URL(url);
  u.search = form(params).toString();
  const r2 = await fetch(u.toString());
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  const parsed2 = JSON.parse(t2);
  if (parsed2?.error) throw new Error(`${method} error: ${JSON.stringify(parsed2.error)}`);
  return parsed2;
}

// ====== API wrappers ======

/** Завантажити меню (товари) */
export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

/**
 * Мапимо позиції кошика (за title) до product_id з Poster
 * cart елемент: { title, qty, price }
 */
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
    if (!p) {
      notFound.push({ title: it.title, qty: it.qty });
      continue;
    }
    lines.push({
      product_id: String(p.product_id),
      title: it.title,
      qty: Number(it.qty || 1),
      price: Number(it.price || 0),
    });
  }
  return { lines, notFound };
}

function buildClientFromCustomer(customer = {}) {
  const first = (customer.firstName || "").trim();
  const last  = (customer.lastName  || "").trim();
  return {
    name: [first, last].filter(Boolean).join(" ").trim() || first || last || "",
    phone: (customer.phone || "").trim(),
    comment: (customer.np || "").trim(),
  };
}

/**
 * Створення ONLINE-замовлення (incomingOrders.createIncomingOrder)
 * Мінімальний payload, як у документації Poster
 */
export async function createIncomingOrder({ spotId, customer, lines }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty
  }));

  const payload = {
    spot_id: String(spotId),
    phone: customer?.phone || "",
    first_name: customer?.firstName || "",
    last_name: customer?.lastName || "",
    comment: customer?.np || "",
    products
  };

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  return resp?.response || resp;
}

/**
 * (Варіант B) Створення ПРОДАЖУ (чека) — transactions.create
 * ⚠️ ПРАГМАТИЧНО: схема мінімальна; за потреби додаси register_id, payment_type тощо.
 * Якщо касова зміна закрита або бракує прав — Poster поверне помилку.
 */
export async function createSale({ spotId, customer, lines, total }) {
  // Poster часто очікує products як масив з product_id та count (і інколи price)
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    // price: l.price, // розкоментуй, якщо у вашій конфігурації потрібна ціна
  }));

  const client = buildClientFromCustomer(customer);

  const payload = {
    spot_id: String(spotId),
    products,
    // Мінімальна оплата без деталізації каналів:
    payed: Number(total || lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0)),
    // Клієнт/коментарі — опціонально, але корисно:
    client_name: client.name || undefined,
    client_phone: client.phone || undefined,
    comment: client.comment || undefined,
  };

  // Логи без секретів
  console.info("transactions.create →", safeLog({ payload }));

  const resp = await posterCall("transactions.create", payload, true);
  return resp?.response || resp;
}