// api/lib/poster.js  (ESM, універсальний для token/access_token + піддомен акаунта)

// 1) БАЗА: використовуємо саме піддомен акаунта (обовʼязково для OAuth кейсів)
const ACCOUNT = process.env.POSTER_ACCOUNT || "";         // its-a-date
const BASE =
  process.env.POSTER_BASE ||
  (ACCOUNT ? `https://${ACCOUNT}.joinposter.com/api` : "https://joinposter.com/api");

// 2) Токени: OAuth (access_token) і, за потреби, персональний (token)
const ACCESS = process.env.POSTER_ACCESS_TOKEN || "";     // 069868:**************
const TOKEN  = process.env.POSTER_TOKEN || "";            // можна не ставити
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// Службове: зібрати x-www-form-urlencoded, покласти ОБИДВА ключі
function form(params = {}) {
  const u = new URLSearchParams();
  // ВАЖЛИВО: кладемо і access_token, і token — Poster прийме будь-який валідний
  if (ACCESS) {
    u.set("access_token", ACCESS);
    u.set("token", ACCESS);
  } else if (TOKEN) {
    u.set("token", TOKEN);
  }
  for (const [k, v] of Object.entries(params)) u.set(k, String(v));
  return u;
}

// Єдиний виклик Poster (спочатку POST, якщо не JSON — фолбек на GET)
export async function posterCall(method, params = {}, preferPost = true) {
  // Мінімальна перевірка
  if (!ACCESS && !TOKEN) {
    throw new Error("No Poster token configured (POSTER_ACCESS_TOKEN or POSTER_TOKEN)");
  }
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  // POST
  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: form(params) });
    const t = await r.text();
    // якщо прийшов JSON — повертаємо
    if (r.ok && t.trim().startsWith("{")) return JSON.parse(t);
    // інакше — пробуємо GET
  }

  // GET (фолбек)
  const u = new URL(url);
  u.search = form(params).toString();
  const r2 = await fetch(u);
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

// Отримати меню (для мапінгу назв)
export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

// Мапимо позиції кошика (за title) -> product_id в Poster
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
      price: Number(it.price || 0)
    });
  }
  return { lines, notFound };
}

// Створити ONLINE-замовлення (incomingOrders.createIncomingOrder)
export async function createIncomingOrder({ spotId, customer, lines, total }) {
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    // price можна не передавати — Poster візьме ціну з меню/закладу
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
  if (resp?.error) {
    throw new Error(`incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}