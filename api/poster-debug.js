// api/poster-debug.js
export const config = { runtime: "nodejs" };

const ACCOUNT = process.env.POSTER_ACCOUNT || "its-a-date";
const ACCESS  = process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_OAUTH_TOKEN || "";
const BASE    = `https://${ACCOUNT}.joinposter.com/api`;

function form(params = {}) {
  const b = new URLSearchParams();
  if (ACCESS) b.set("access_token", ACCESS);
  for (const [k, v] of Object.entries(params)) if (v != null) b.set(k, String(v));
  return b;
}

async function poster(method, params = {}) {
  const url = `${BASE}/${method}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form(params)
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, text, json: safeJSON(text), url, method, params };
}

function safeJSON(t){ try { return JSON.parse(t); } catch { return null; } }

export default async function handler(req, res) {
  try {
    // 1) простий доступ до закладів (мали б побачити spot_id)
    const spots = await poster("spots.getSpots");

    // 2) тест створення online-замовлення з мінімальним набором (phone обов'язковий якщо немає client_id)
    // product_id=18 — підставляємо той, що є у твоєму меню
    const create = await poster("incomingOrders.createIncomingOrder", {
      spot_id: 1,
      phone: "+380000000000",
      "products[0][product_id]": 18,
      "products[0][count]": 1
    });

    res.status(200).json({
      env: {
        ACCOUNT,
        hasAccess: !!ACCESS,
        accessPreview: ACCESS ? `len:${ACCESS.length}` : "none",
        base: BASE
      },
      spots,
      create
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}