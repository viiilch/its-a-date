// api/lib/poster.js  (ESM, Node 18+)

/**
 * ✅ ПІДТРИМКА ДВОХ РІЗНИХ ТОКЕНІВ:
 * - POSTER_TOKEN          → параметр "token" (старий API, працює для menu.* тощо)
 * - POSTER_ACCESS_TOKEN   → параметр "access_token" (OAuth2, обов'язковий для incomingOrders.*, transactions.*, access.*)
 *
 * ЩО ПОТРІБНО В ENV (Vercel → Project → Settings → Environment Variables):
 * - POSTER_BASE           = https://joinposter.com/api        (або лишити порожнім)
 * - POSTER_TOKEN          = 069868:xxxxxxxxxxxxxxxxxxxxxxxx   (опціонально; працює для menu.*)
 * - POSTER_ACCESS_TOKEN   = 069868:yyyyyyyyyyyyyyyyyyyyyyyy   (ОБОВ'ЯЗКОВО для incomingOrders.*, transactions.*, access.*)
 * - POSTER_SPOT_ID        = 1
 */

export const POSTER_BASE         = process.env.POSTER_BASE || "https://joinposter.com/api";
export const POSTER_TOKEN        = process.env.POSTER_TOKEN || "";              // token=
export const POSTER_ACCESS_TOKEN = process.env.POSTER_ACCESS_TOKEN || "";       // access_token=
export const POSTER_SPOT_ID      = process.env.POSTER_SPOT_ID || "1";

/** Які методи вимагають access_token */
const REQUIRE_ACCESS = [
  "incomingOrders.",   // створення онлайн-замовлень та ін.
  "transactions.",     // створення продажів/чеків
  "access.",           // каси/зміни тощо
];

/** Визначити, чи метод потребує access_token */
function needsAccessToken(method) {
  return REQUIRE_ACCESS.some(prefix => method.startsWith(prefix));
}

/** Зібрати form-тіло з правильним ключем токена */
function makeForm(method, params = {}) {
  const body = new URLSearchParams();

  // Вибір токена
  if (needsAccessToken(method)) {
    if (!POSTER_ACCESS_TOKEN) {
      throw new Error(
        `Метод "${method}" потребує OAuth2 токен. Додай POSTER_ACCESS_TOKEN у Vercel env (отриманий через poster-auth-callback).`
      );
    }
    body.set("access_token", POSTER_ACCESS_TOKEN);
  } else {
    // menu.* та інші можна через старий token=, або теж через access_token, якщо він є
    if (POSTER_TOKEN) {
      body.set("token", POSTER_TOKEN);
    } else if (POSTER_ACCESS_TOKEN) {
      body.set("access_token", POSTER_ACCESS_TOKEN);
    } else {
      throw new Error(
        `Немає жодного токена. Додай POSTER_TOKEN або POSTER_ACCESS_TOKEN у Vercel env.`
      );
    }
  }

  // Інші параметри
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }
  return body;
}

/** Базовий виклик Poster API з POST, потім fallback GET */
export async function posterCall(method, params = {}, preferPost = true) {
  const url = `${POSTER_BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };

  // POST
  if (preferPost) {
    const body = makeForm(method, params);
    const r = await fetch(url, { method: "POST", headers, body });
    const t = await r.text();
    if (!r.ok) throw new Error(`Poster HTTP ${r.status}: ${t}`);
    try { return JSON.parse(t); } catch { /* нижче fallback GET */ }
  }

  // GET (fallback)
  const qs = makeForm(method, params).toString();
  const u  = `${url}?${qs}`;
  const r2 = await fetch(u);
  const t2 = await r2.text();
  if (!r2.ok) throw new Error(`Poster HTTP ${r2.status}: ${t2}`);
  return JSON.parse(t2);
}

/** 1) Отримати продукти меню (для мапінгу назв → product_id) */
export async function getMenuProducts() {
  const data = await posterCall("menu.getProducts", {}, false);
  // Відповідь успішна має поле response
  if (data?.error) throw new Error(`menu.getProducts error: ${JSON.stringify(data.error)}`);
  return data?.response || [];
}

/** 2) Мапінг позицій кошика (за назвою title) до product_id із Poster */
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

/** 3) Створити online-замовлення (incomingOrders.createIncomingOrder) */
export async function createIncomingOrder({ spotId, customer, lines, total }) {
  // products[count] — десяткове число дозволено, але ми даємо ціле
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    // price: у копійках — МИ НЕ ПЕРЕДАЄМО, щоб бралась ціна з меню в закладі
  }));

  const payload = {
    spot_id: String(spotId || POSTER_SPOT_ID),
    // Дані клієнта: згідно з докою, якщо немає client_id — ОБОВ'ЯЗКОВО phone
    phone: (customer?.phone || "").trim(),
    first_name: (customer?.firstName || "").trim(),
    last_name: (customer?.lastName || "").trim(),
    comment: (customer?.np || "").trim(),
    // Тип (1 — у закладі, 2 — на виніс, 3 — доставка); залишимо 2 (takeaway)
    service_mode: 2,
    products,
  };

  const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);
  if (resp?.error) {
    throw new Error(`incomingOrders.createIncomingOrder error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}

/** 4) Створити ПРОДАЖ/чек (transactions.create)
 *    ⚠️ Працює ТІЛЬКИ з access_token і відкритою зміною на касі.
 *    Мінімальний payload: spot_id, products[count, product_id, price?]
 *    Ціни в копійках (якщо передаєш price).
 */
export async function createSale({ spotId, customer, lines, total }) {
  // Poster чекає ціни в копійках (UAH → *100)
  const products = lines.map(l => ({
    product_id: String(l.product_id),
    count: l.qty,
    price: Math.round(Number(l.price || 0) * 100), // копійки
  }));

  const payload = {
    spot_id: String(spotId || POSTER_SPOT_ID),
    products,
    // опціонально інформація про оплату (раз MonoPay уже списав)
    payment: {
      type: 1,                 // 1 — була попередня оплата
      sum: Math.round(Number(total || 0) * 100), // у копійках
      currency: "UAH",
    },
    // клієнт як коментар до чека
    comment: [
      (customer?.firstName || ""), (customer?.lastName || "")
    ].join(" ").trim() + (customer?.np ? ` | ${customer.np}` : ""),
  };

  const resp = await posterCall("transactions.create", payload, true);
  if (resp?.error) {
    throw new Error(`transactions.create error: ${JSON.stringify(resp.error)}`);
  }
  return resp?.response || resp;
}

/** 5) Діагностика — корисно для /api/poster-test */
export function posterDiag() {
  return {
    base: POSTER_BASE,
    hasOldToken: Boolean(POSTER_TOKEN),
    hasAccessToken: Boolean(POSTER_ACCESS_TOKEN),
    spot: String(POSTER_SPOT_ID || "1"),
  };
}