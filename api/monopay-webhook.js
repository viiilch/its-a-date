// api/monopay-webhook.js
export const config = { runtime: "nodejs" };

import nodemailer from "nodemailer";

const ORDER_EMAIL_TO =
  process.env.ORDER_EMAIL_TO || "itsadate.orderss@gmail.com";

const ORDER_EMAIL_FROM =
  process.env.ORDER_EMAIL_FROM || ORDER_EMAIL_TO;

const ORDER_EMAIL_PASSWORD =
  process.env.ORDER_EMAIL_PASSWORD ||
  process.env.orderEmailPassword || "";

// --- Створюємо транспорт для Gmail ---
function createTransport() {
  if (!ORDER_EMAIL_TO || !ORDER_EMAIL_PASSWORD) {
    throw new Error("Email credentials are not configured");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS через STARTTLS
    auth: {
      user: ORDER_EMAIL_TO,
      pass: ORDER_EMAIL_PASSWORD,
    },
  });
}

// --- Допоміжна: красиво розібрати тіло MonoPay ---
function parseMonoBody(body = {}) {
  const status = String(body?.status || "").toLowerCase();

  const reference =
    body?.merchantPaymInfo?.reference ||
    body?.salePaymentData?.orderId ||
    body?.invoiceId ||
    `ID-${Date.now()}`;

  const customer = {
    firstName: (body?.salePaymentData?.customer?.firstName || "").trim(),
    lastName: (body?.salePaymentData?.customer?.lastName || "").trim(),
    phone: (body?.salePaymentData?.customer?.phone || "").trim(),
    np: (body?.salePaymentData?.customer?.np || "").trim(),
  };

  const cart = Array.isArray(body?.salePaymentData?.cart)
    ? body.salePaymentData.cart
    : [];

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.qty || 0),
    0
  );

  return { status, reference, customer, cart, total };
}

// --- Основний handler ---
export default async function handler(req, res) {
  try {
    // Простий health-чек через GET
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, ping: "monopay-webhook-alive" });
    }

    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ ok: false, error: "Method Not Allowed" });
    }

    // читаємо raw тіло
    let raw = "";
    for await (const chunk of req) raw += chunk;
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    const { status, reference, customer, cart, total } = parseMonoBody(body);

    // Приймаємо тільки успішні платежі
    if (status !== "success") {
      return res.status(200).json({
        ok: true,
        note: "Ignoring non-success status.",
        status,
      });
    }

    // Формуємо текст листа
    const lines = cart.map((item, idx) => {
      const title = item.title || `Товар ${idx + 1}`;
      const price = Number(item.price || 0);
      const qty = Number(item.qty || 0);
      const sum = price * qty;
      return `• ${title} — ${qty} x ${price} = ${sum} UAH`;
    });

    const text = [
      `Нове замовлення з сайту It's a Date`,
      ``,
      `Reference / Order ID: ${reference}`,
      ``,
      `Клієнт:`,
      `Ім'я: ${customer.firstName || ""} ${customer.lastName || ""}`,
      `Телефон: ${customer.phone || ""}`,
      customer.np ? `Нова Пошта: ${customer.np}` : "",
      ``,
      `Товари:`,
      ...(lines.length ? lines : ["(порожній кошик)"]),
      ``,
      `Сума: ${total} UAH`,
      ``,
      `Сире тіло вебхука (JSON):`,
      JSON.stringify(body, null, 2),
    ]
      .filter(Boolean)
      .join("\n");

    const transport = createTransport();

    const mailOptions = {
      from: ORDER_EMAIL_FROM,
      to: ORDER_EMAIL_TO,
      subject: `Нове замовлення: ${reference}`,
      text,
    };

    const info = await transport.sendMail(mailOptions);

    return res.status(200).json({
      ok: true,
      emailSent: true,
      messageId: info.messageId || null,
    });
  } catch (err) {
    console.error("MONOPAY WEBHOOK ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}