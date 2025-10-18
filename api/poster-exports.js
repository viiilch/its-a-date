export const config = { runtime: "nodejs" };
import * as poster from "./lib/poster.js";

export default async function handler(req, res) {
  // покажемо імена експортів (без секретів)
  res.status(200).json({
    ok: true,
    exports: Object.keys(poster) // очікуємо: createSale / createIncomingOrder / mapLinesByName / POSTER_SPOT_ID / posterCall / getMenuProducts ...
  });
}