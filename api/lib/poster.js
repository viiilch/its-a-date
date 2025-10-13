// api/lib/poster.js
// ❌ НЕ імпортуємо "node-fetch" — в Edge є глобальний fetch

const BASE = process.env.POSTER_BASE || "https://joinposter.com/api";
const TOKEN = process.env.POSTER_TOKEN || "";
const SPOT_ID = process.env.POSTER_SPOT_ID || "1";

// універсальний виклик Poster (працює і в Edge, і локально)
async function callPoster(method, params = {}, httpMethod = "GET") {
  if (!TOKEN) throw new Error("POSTER_TOKEN is not set");

  const url = new URL(`${BASE}/${method}`);
  url.searchParams.set("token", TOKEN);

  // У Poster майже все можна передавати через query
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }

  const res = await fetch(url.toString(), { method: httpMethod });
  const text = await res.text();

  if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);

  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(text); }

  if (data?.error) {
    throw new Error(`Poster API error: code=${data.error.code} msg=${data.error.message}`);
  }
  return data;
}

// Меню (map за назвою)
export async function getMenuProducts() {
  const data = await callPoster("menu.getProducts", {}, "GET");
  const items = data?.response || [];
  const byName = new Map();
  for (const it of items) {
    byName.set((it.product_name || "").trim().toLowerCase(), it);
  }
  return { list: items, byName, spotId: SPOT_ID };
}

// Поки що формуємо «чернетку» замовлення без відправки в Poster
export async function createPosterOrderDraft({ customer, lines, total }) {
  return {
    spot_id: SPOT_ID,
    client: {
      name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim(),
      phone: customer.phone ?? "",
      comment: customer.np ?? "", // місто/відділення НП
    },
    items: lines.map(l => ({
      product_id: l.product_id,
      count: l.qty,
      price: l.price,  // у грн (коли Poster відповість — за потреби помножимо на 100)
      title: l.title,
    })),
    total,
  };

  // Коли підтримка Poster дасть точний метод:
  // return await callPoster("transactions.create", { ...payload }, "POST");
}