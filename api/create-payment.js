// api/create-payment.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // --- Надійно читаємо JSON-тіло (на випадок, якщо req.body порожній) ---
    let body = req.body;
    if (!body) {
      const raw = await new Promise((resolve) => {
        let d = "";
        req.on("data", (c) => (d += c));
        req.on("end", () => resolve(d));
      });
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        body = {};
      }
    }

    const { cart, customer } = body || {};
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const MONOPAY_TOKEN = process.env.MONOPAY_TOKEN;
    const MONOPAY_BASE =
      process.env.MONOPAY_BASE || "https://api.monobank.ua/api/merchant";
    const PUBLIC_BASE =
      process.env.PUBLIC_BASE_URL || "http://localhost:3000";

    console.log("ENV CHECK create-payment:", {
      hasToken: !!MONOPAY_TOKEN,
      MONOPAY_BASE,
      PUBLIC_BASE,
    });

    if (!MONOPAY_TOKEN) {
      return res.status(500).json({
        error: "Missing MONOPAY_TOKEN",
        hint: "Додай MONOPAY_TOKEN у .env.local (локально) і у Vercel → Settings → Environment Variables (Prod/Preview).",
      });
    }

    const totalUAH = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const amount = Math.round(totalUAH * 100); // копійки
    const orderId = `ID-${Date.now()}`;

    // ---------- ЗАШИФРОВАНИЙ PAYLOAD ДЛЯ ВЕБХУКА ----------
    let webHookUrl = `${PUBLIC_BASE}/api/monopay-webhook`;
    try {
      const extraPayload = {
        orderId,
        totalUAH,
        cart,
        customer,
      };
      const json = JSON.stringify(extraPayload);
      const b64 = Buffer.from(json, "utf8").toString("base64");
      const encoded = encodeURIComponent(b64);

      webHookUrl = `${PUBLIC_BASE}/api/monopay-webhook?payload=${encoded}`;
    } catch (e) {
      console.error("Failed to build webhook payload:", e);
    }
    // ------------------------------------------------------

    const payload = {
      amount,
      ccy: 980,
      redirectUrl: `${PUBLIC_BASE}/thanks`,
      webHookUrl, // <-- тут вже з payload-ом
      merchantPaymInfo: {
        reference: orderId,
        destination: `It's a Date — замовлення ${orderId}`,
        comment: `Товарів: ${cart.length}`,
      },
      validity: 3600,
    };

    console.log(
      "MONO REQUEST →",
      MONOPAY_BASE + "/invoice/create",
      JSON.stringify(payload, null, 2)
    );

    const resp = await fetch(`${MONOPAY_BASE}/invoice/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Token": MONOPAY_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    console.log("MONO RESP STATUS:", resp.status);
    console.log("MONO RESP BODY:", text);

    if (!resp.ok) {
      return res.status(500).json({
        error: "Mono API error",
        status: resp.status,
        details: text.slice(0, 500),
      });
    }

    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    const checkoutUrl = data.pageUrl || data.invoiceUrl;

    if (!checkoutUrl) {
      return res.status(500).json({
        error: "No checkoutUrl in Mono response",
        detailsSample: text.slice(0, 500),
      });
    }

    return res.status(200).json({ checkoutUrl, orderId });
  } catch (e) {
    console.error("SERVER ERROR create-payment:", e);
    return res
      .status(500)
      .json({ error: "Server error", message: String(e?.message || e) });
  }
}