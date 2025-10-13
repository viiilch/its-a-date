// api/monopay-webhook.js (ESM-версія)
// Обробка вебхука MonoPay → створення ПРОДАЖУ в Poster (transactions.create)
export const config = { runtime: "nodejs18.x" };
import { createSale, mapLinesByName, POSTER_SPOT_ID } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, ping: "webhook-alive" });
    }
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    // зчитуємо тіло безпечно
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
   let body = {};
try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }

    console.info("WEBHOOK RECEIVED:", {
      status: body?.status,
      invoiceId: body?.invoiceId || null,
      reference:
        body?.merchantPaymInfo?.reference ||
        body?.salePaymentData?.orderId ||
        null,
      amount: body?.amount || null,
      cartLen: Array.isArray(body?.salePaymentData?.cart)
        ? body.salePaymentData.cart.length
        : 0,
    });

    // 1) приймаємо тільки успішні платежі
    if (String(body?.status).toLowerCase() !== "success") {
      return res.status(200).json({ ok: true, note: "Ignoring non-success status." });
    }

    // 2) дістаємо дані
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

    const cart = Array.isArray(body?.salePaymentData?.cart)
      ? body.salePaymentData.cart
      : [];
    const total = cart.reduce(
      (s, it) => s + Number(it.price || 0) * Number(it.qty || 0),
      0
    );

    // 3) мапимо позиції за НАЗВОЮ на product_id у Poster
    const { lines, notFound } = await mapLinesByName(cart);

    console.info("=== POSTER SALE DRAFT ===");
    console.info(
      JSON.stringify(
        {
          reference,
          spotId: String(POSTER_SPOT_ID || "1"),
          customer,
          lines,
          total,
          notFound,
        },
        null,
        2
      )
    );

    if (!lines.length) {
      return res
        .status(200)
        .json({ ok: true, note: "Nothing mapped to product_id; skip Poster sale.", notFound });
    }

    // 4) створюємо ПРОДАЖ у Poster (чек)
    try {
      const posterResp = await createSale({
        reference,
        spotId: String(POSTER_SPOT_ID || "1"),
        customer,
        lines,
        total,
      });
      return res.status(200).json({ ok: true, poster: posterResp, notFound });
    } catch (e) {
      console.error("POSTER SALE ERROR:", e?.message || e);
      return res
        .status(200)
        .json({ ok: false, error: String(e?.message || e), notFound });
    }
  } catch (err) {
    console.error("WEBHOOK FATAL:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}