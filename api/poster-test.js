// api/lib/poster.js  (ESM)

export const POSTER_BASE   = process.env.POSTER_BASE   || "https://joinposter.com/api";
export const POSTER_TOKEN  = process.env.POSTER_TOKEN  || "";
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

/** універсальний виклик Poster API з POST і GET-фолбеком */
async function posterCall(method, params = {}, preferPost = true) {
  if (!POSTER_TOKEN) throw new Error("POSTER_TOKEN is not set");
  const url = `${POSTER_BASE}/${method}`;

  // Poster часто приймає form-urlencoded; об’єкти серіалізуємо як JSON
  const flat = {};
  for (const [k, v] of Object.entries(params)) {
    flat[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
  }

  const body = new URLSearchParams({ token: POSTER_TOKEN, ...flat }).toString();

  let res;
  if (preferPost) {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
  }
  if (!res || !res.ok) {
    const qs = new URLSearchParams({ token: POSTER_TOKEN, ...flat }).toString();
    res = await fetch(`${url}?${qs}`);
  }

  // Poster інколи повертає HTML при 404 — підстрахуємось
  let data;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (data?.error) {
    throw new Error(`Poster API error @ ${method}: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
  return data?.response ?? data;
}

/** Отримати продукти (для мапінгу назв → product_id) */
export async function fetchProducts() {
  const resp = await posterCall("menu.getProducts", {});
  // зазвичай resp — це масив, але інколи об’єкт {response:[...]}
  return Array.isArray(resp) ? resp : (resp?.response || []);
}

/** Мапінг позицій кошика за НАЗВОЮ на product_id у Poster */
export async function mapLinesByName(cart) {
  const products = await fetchProducts();
  const idx = new Map();
  for (const p of products) {
    const key = String(p.product_name || "").trim().toLowerCase();
    if (key) idx.set(key, String(p.product_id));
  }

  const lines = [];
  const notFound = [];
  for (const it of cart || []) {
    const key = String(it.title || it.product_name || "").trim().toLowerCase();
    const pid = idx.get(key);
    if (pid) {
      lines.push({
        product_id: pid,
        title: it.title || key,
        qty: Number(it.qty) || 1,
        price: Number(it.price) || 0, // у гривнях
      });
    } else {
      notFound.push({ title: it.title || key, qty: it.qty || 1 });
    }
  }
  return { lines, notFound };
}

/** Створити ПРОДАЖ (чек) у Poster — transactions.create */
export async function createSale({ reference, spotId, customer, lines, total }) {
  const products = lines.map(l => ({
    product_id: l.product_id,
    count: l.qty,
    price: l.price,
    title: l.title
  }));

  const payload = {
    spot_id: String(spotId || POSTER_SPOT_ID || "1"),
    products,
    phone: customer?.phone || "",
    comment: `${customer?.firstName || ""} ${customer?.lastName || ""} | NP: ${customer?.np || ""} | Ref: ${reference}`,
    // за потреби: table_id, service_mode, discount, etc.
  };

  const resp = await posterCall("transactions.create", payload);
  return resp;
}