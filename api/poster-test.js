// api/poster-test.js — простий тест Poster API
export const config = { runtime: "nodejs" };

const BASE  = process.env.POSTER_BASE  || "https://joinposter.com/api";
const TOKEN = process.env.POSTER_TOKEN || "";
const SPOT  = process.env.POSTER_SPOT_ID || "1";

function form(params = {}) {
  const body = new URLSearchParams();
  body.set("token", TOKEN);
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));
  return body;
}

async function posterCall(method, params = {}, preferPost = true) {
  const url = `${BASE}/${method}`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (preferPost) {
    const r = await fetch(url, { method: "POST", headers, body: form(params) });
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { http: r.status, text: t }; }
  }
  const u = new URL(url);
  u.search = form(params).toString();
  const r2 = await fetch(u);
  const t2 = await r2.text();
  try { return JSON.parse(t2); } catch { return { http: r2.status, text: t2 }; }
}

export default async function handler(req, res) {
  try {
    // GET → просто перевіримо, що дістаємо меню (має повернути масив продуктів)
    if (req.method === "GET") {
      const data = await posterCall("menu.getProducts", {}, false);
      const count = Array.isArray(data?.response) ? data.response.length : 0;
      return res.status(200).json({
        ok: true,
        check: "menu.getProducts",
        items: count,
        sample: count ? data.response.slice(0, 2).map(p => ({ id: p.product_id, name: p.product_name })) : []
      });
    }

    // POST → створимо online-order на 1 позицію (product_id: 19 — Milk Chocolate Dates)
    if (req.method === "POST") {
      const payload = {
        spot_id: String(SPOT),
        phone: "+380000000000",
        first_name: "Тест",
        last_name: "Тест",
        comment: "Київ №1",
        products: [{ product_id: "19", count: 1 }]
      };
      const resp = await posterCall("incomingOrders.createIncomingOrder", payload, true);

      if (resp?.error) {
        return res.status(200).json({ ok: false, step: "createIncomingOrder", error: resp.error });
      }
      return res.status(200).json({ ok: true, created: resp?.response || resp });
    }

    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}