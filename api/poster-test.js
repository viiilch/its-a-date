// api/poster-test.js
export const config = { runtime: "nodejs" };

import { mapLinesByName, createIncomingOrder, POSTER_SPOT_ID } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    // тестове замовлення: одна позиція з назвою як у Poster (щоб змепилося в product_id)
    const sampleCart = [{ title: "Milk Chocolate Dates", qty: 1, price: 300 }];

    const { lines, notFound } = await mapLinesByName(sampleCart);
    if (!lines.length) {
      return res.status(200).json({ ok: false, reason: "map-empty", notFound });
    }

    const customer = {
      firstName: "Тест",
      lastName: "Тест",
      phone: "+380000000000",
      np: "Київ №1",
    };

    const incoming = await createIncomingOrder({
      spotId: String(POSTER_SPOT_ID || "1"),
      customer,
      lines,
    });

    return res.status(200).json({ ok: true, incoming, notFound });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}