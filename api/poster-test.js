// api/poster-test.js
import { posterCreateIncomingOrder } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    const demo = {
      customer: { firstName: "Тест", lastName: "Тест", phone: "+380000000000", np: "Київ №1" },
      cart: [{ id: "dark", title: "Dark Chocolate Dates", price: 300, qty: 1 }],
      reference: "TEST-" + Date.now(),
      amount: 30000
    };
    const r = await posterCreateIncomingOrder(demo);
    res.status(200).json({ ok: true, via: r.endpoint, notFound: r.notFound || [] });
  } catch (e) {
    // Повертаємо ТЕ, що каже Poster (щоб бачити точний код/повідомлення)
    res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}