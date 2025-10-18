// api/poster-sale-test.js (ESM)
export const config = { runtime: "nodejs" };
import { createSale, mapLinesByName, POSTER_SPOT_ID } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    // Тестовий кошик — 1 шт "Milk Chocolate Dates" по 300 грн
    const cart = [{ title: "Milk Chocolate Dates", qty: 1, price: 300 }];
    const { lines, notFound } = await mapLinesByName(cart);

    if (!lines.length) {
      return res.status(200).json({ ok: false, note: "Немає відповідників у Poster (перевір назви)", notFound });
    }

    const sale = await createSale({
      reference: `TEST-${Date.now()}`,
      spotId: String(POSTER_SPOT_ID || "1"),
      customer: {
        firstName: "Тест",
        lastName: "Тест",
        phone: "+380000000000",
        np: "Київ №1"
      },
      lines,
      total: lines.reduce((s,l)=> s + l.price * l.qty, 0),
    });

    return res.status(200).json({ ok: true, sale });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}