// api/monopay-webhook.js  (ESM, Node runtime)
export const config = { runtime: "nodejs" };

import { createIncomingOrder, mapLinesByName, POSTER_SPOT_ID } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, ping: "webhook-alive" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    // читаємо тіло
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    // приймаємо тільки успішні платежі
    if (String(body?.status).toLowerCase() !== "success") {
      return res.status(200).json({ ok: true, note: "Ignoring non-success status." });
    }

    const reference =
      body?.merchantPaymInfo?.reference ||
      body?.salePaymentData?.orderId ||
      body?.invoiceId ||
      `ID-${Date.now()}`;

    const customer = {
      firstName: (body?.salePaymentData?.customer?.firstName || "").trim(),
      lastName:  (body?.salePaymentData?.customer?.lastName  || "").trim(),
      phone:     (body?.salePaymentData?.customer?.phone     || "").trim(),
      np:        (body?.salePaymentData?.customer?.np        || "").trim(),
    };

    const cart = Array.isArray(body?.salePaymentData?.cart) ? body.salePaymentData.cart : [];
    const total = cart.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);

    // мапимо назви з сайту -> product_id Poster
    const { lines, notFound } = await mapLinesByName(cart);

    console.info("=== POSTER INCOMING ORDER DRAFT ===");
    console.info(JSON.stringify({
      reference,
      spotId: String(POSTER_SPOT_ID || "1"),
      customer, lines, total, notFound
    }, null, 2));

    if (!lines.length) {
      return res.status(200).json({ ok: true, note: "Nothing mapped; skipping Poster.", notFound });
    }

    // ✅ створюємо онлайн-замовлення в Poster
    try {
      const incoming = await createIncomingOrder({
        reference,
        spotId: String(POSTER_SPOT_ID || "1"),
        customer, lines, total,
      });
      return res.status(200).json({ ok: true, incoming, notFound });
    } catch (e) {
      console.error("POSTER incomingOrders.createIncomingOrder ERROR:", e?.message || e);
      return res.status(200).json({ ok: false, error: String(e?.message || e), notFound });
    }

  } catch (err) {
    console.error("WEBHOOK FATAL:", err);
    return res.status(500).json({ ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}