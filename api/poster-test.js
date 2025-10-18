import { getMenuProducts } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    const products = await getMenuProducts();
    return res.status(200).json({
      ok: true,
      check: "menu.getProducts",
      items: products.length,
      sample: products.slice(0, 2).map(p => ({ id: String(p.product_id), name: p.product_name })),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}