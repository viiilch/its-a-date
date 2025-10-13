// api/lib/poster.js  (ESM)

const BASE  = process.env.POSTER_BASE  || "https://joinposter.com/api";
const TOKEN = process.env.POSTER_TOKEN || "";
export const POSTER_SPOT_ID = process.env.POSTER_SPOT_ID || "1";

function form(params = {}) {
  const b = new URLSearchParams();
  b.set("token", TOKEN);
  for (const [k, v] of Object.entries(params)) b.set(k, String(v));
  return b;
}

export async function posterCall(method, params = {}, preferPost = true) {
  if (!TOKEN) throw new Error("POSTER_TOKEN is not set");
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  // 1) POST
  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: form(params) });
    const t = await r.text();
    // Poster інколи віддає 200 навіть з HTML, тому перевіряємо
    if (r.ok && t.trim().startsWith("{")) return JSON.parse(t);
  }
  // 2) GET fallback
  const u = new URL(url);
  u.search = form(params).toString();
  const r2 = await fetch(u);
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

/* ===== Довідник товарів (щоб зіставити назву → product_id) ===== */
export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  return data?.response || [];
}

/* ===== Мапінг позицій кошика за назвою товару ===== */
export async function mapLinesByName(cart = []) {
  const products = await getMenuProducts();
  const byName = new Map(
    products.map(p => [String(p.product_name).trim().toLowerCase(), p])
  );

  const lines = [];
  const notFound = [];

  for (const it of cart) {
    const key = String(it.title || it.name || "").trim().toLowerCase();
    const p = byName.get(key);
    if (!p) {
      notFound.push({ title: it.title, qty: it.qty, price: it.price });
      continue;
    }
    lines.push({
      product_id: String(p.product_id),
      title: p.product_name,
      qty: Number(it.qty || 1),
      price: Number(it.price || 0),
    });
  }
  return { lines, notFound };
}

/* ===== Підготовка «чорнетки» продажу (для логів) ===== */
export async function createIncomingOrderDraft({ spotId, customer, lines, total }) {
  return {
    spot_id: String(spotId),
    client: {
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      phone: customer.phone,
      comment: customer.np || "",
    },
    items: lines.map(l => ({
      product_id: String(l.product_id),
      count: l.qty,
      price: l.price,
      title: l.title,
    })),
    total,
  };
}

/* ===== Створення ПРОДАЖУ в Poster =====
   Використовуємо метод transactions.create (продаж на точці/касі).
   Якщо твому акаунту цей метод недоступний, у відповіді буде error.code=30 (Unknown API method).
   Тоді напиши в підтримку Poster, щоб включили доступ, або тимчасово можна падати на incomingOrders.create.
*/
export async function createSale({ reference, spotId, customer, lines, total }) {
  // Мінімальні обов’язкові поля: spot_id, products[]
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: Number(l.qty),
    price: Number(l.price),   // у гривнях, без копійок
  }));

  const params = {
    spot_id: String(spotId),
    products: JSON.stringify(products),
    comment: `Online: ${reference} — ${customer.firstName} ${customer.lastName}; ${customer.phone}; ${customer.np || ""}`,
  };

  console.info("POSTER CALL → transactions.create", params);

  const resp = await posterCall("transactions.create", params, true);

  if (resp?.error) {
    // Якщо метод недоступний (code 30) — пробуємо створити вхідне замовлення як fallback
    if (String(resp.error.code) === "30") {
      console.warn("transactions.create недоступний, Fallback → incomingOrders.create");
      const draft = await createIncomingOrderDraft({ spotId, customer, lines, total });
      const inResp = await posterCall(
        "incomingOrders.create",
        { incoming_order: JSON.stringify(draft) },
        true
      );
      if (inResp?.error) throw new Error(`Poster incomingOrders.create error: ${JSON.stringify(inResp.error)}`);
      return { via: "incomingOrders.create", response: inResp };
    }
    throw new Error(`Poster transactions.create error: ${JSON.stringify(resp.error)}`);
  }

  return { via: "transactions.create", response: resp };
}
// ==== ДОДАТИ в api/lib/poster.js ====

export async function createIncomingOrder({ spotId, customer, lines }) {
  // Poster очікує масив products з product_id та count
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty, // кількість
  }));

  const payload = {
    spot_id: String(spotId),
    phone: customer.phone || "",           // опційно
    first_name: customer.firstName || "",  // опційно
    last_name: customer.lastName || "",    // опційно
    comment: customer.np || "",            // NP адреса/коментар
    products,
  };

  // POST-запит
  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  return resp?.response || resp;
}