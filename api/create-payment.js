// api/create-payment.js
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import nodemailer from "nodemailer";
import { sendTelegramMessage } from "./lib/telegram.js";

const ORDER_EMAIL_TO =
  process.env.ORDER_EMAIL_TO || "itsadate.orderss@gmail.com";

const ORDER_EMAIL_FROM =
  process.env.ORDER_EMAIL_FROM || ORDER_EMAIL_TO;

const ORDER_EMAIL_PASSWORD =
  process.env.ORDER_EMAIL_PASSWORD ||
  process.env.orderEmailPassword ||
  "";

// --- transport для Gmail ---
function createTransport() {
  if (!ORDER_EMAIL_TO || !ORDER_EMAIL_PASSWORD) {
    throw new Error("Email credentials are not configured");
  }

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: ORDER_EMAIL_TO,
      pass: ORDER_EMAIL_PASSWORD,
    },
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- формуємо текст листа ---
function buildEmailText({ reference, customer, cart, total }) {
  const lineStrings = cart.map((item, idx) => {
    const title = item.title || `Товар ${idx + 1}`;
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 0);
    const sum = price * qty;
    return `• ${title} — ${qty} x ${price} = ${sum} UAH`;
  });

  return [
    `Нове замовлення з сайту It's a Date (рахунок створено в MonoPay)`,
    ``,
    `Reference / Order ID: ${reference}`,
    ``,
    `Клієнт:`,
    `Ім'я: ${customer.firstName || ""} ${customer.lastName || ""}`,
    `Телефон: ${customer.phone || ""}`,
    customer.np ? `Нова Пошта: ${customer.np}` : "",
    ``,
    `Товари:`,
    ...(lineStrings.length ? lineStrings : ["(порожній кошик)"]),
    ``,
    `Сума: ${total} UAH`,
    ``,
    `Статус оплати: рахунок створено, оплата ще НЕ підтверджена автоматично.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- формуємо HTML-текст для Telegram (parse_mode: HTML) ---
function buildTelegramHtml({ reference, customer, cart, total }) {
  const lines = cart.map((item, idx) => {
    const title = escapeHtml(item.title || `Товар ${idx + 1}`);
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 0);
    const sum = price * qty;
    return `• ${title} — ${qty} x ${price} = ${sum} UAH`;
  });

  return [
    `<b>🧾 Нове замовлення з сайту It's a Date</b>`,
    ``,
    `<b>ID:</b> ${escapeHtml(reference)}`,
    ``,
    `<b>👤 Клієнт</b>`,
    `Ім'я: ${escapeHtml(customer.firstName || "")} ${escapeHtml(
      customer.lastName || ""
    )}`,
    `Телефон: ${escapeHtml(customer.phone || "")}`,
    customer.np ? `Нова Пошта: ${escapeHtml(customer.np)}` : "",
    ``,
    `<b>📦 Товари</b>`,
    ...(lines.length ? lines : ["(порожній кошик)"]),
    ``,
    `<b>💰 Сума: ${total} UAH</b>`,
    ``,
    `Статус оплати: рахунок створено, оплата ще <b>не підтверджена</b>.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // --- Надійно читаємо JSON-тіло ---
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
        hint: "Додай MONOPAY_TOKEN у .env.local і у Vercel → Settings → Environment Variables.",
      });
    }

    const totalUAH = cart.reduce((s, it) => s + it.price * it.qty, 0);
    const amount = Math.round(totalUAH * 100); // копійки
    const orderId = `ID-${Date.now()}`;

    const payload = {
      amount,
      ccy: 980,
      redirectUrl: `${PUBLIC_BASE}/thanks`,
      webHookUrl: `${PUBLIC_BASE}/api/monopay-webhook`,
      merchantPaymInfo: {
        reference: orderId,
        destination: `It's a Date — замовлення ${orderId}`,
        comment: `Товарів: ${cart.length}`,
      },
      // ці дані нам потрібні тут, а не у вебхуці
      salePaymentData: { cart, customer, orderId },
      validity: 3600,
    };

    console.log("MONO REQUEST →", MONOPAY_BASE + "/invoice/create", payload);

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

    // --- тут відправляємо e-mail + Telegram з повним замовленням ---
    const emailText = buildEmailText({
      reference: orderId,
      customer,
      cart,
      total: totalUAH,
    });

    const telegramHtml = buildTelegramHtml({
      reference: orderId,
      customer,
      cart,
      total: totalUAH,
    });

    let emailSent = false;
    let telegramSent = false;
    let emailError = null;
    let telegramError = null;

    // E-MAIL
    try {
      const transport = createTransport();
      const info = await transport.sendMail({
        from: ORDER_EMAIL_FROM,
        to: ORDER_EMAIL_TO,
        subject: `Нове замовлення: ${orderId}`,
        text: emailText,
      });
      emailSent = true;
      console.log("Email sent, id:", info.messageId);
    } catch (e) {
      emailError = String(e?.message || e);
      console.error("EMAIL ERROR (create-payment):", emailError);
    }

    // TELEGRAM
    try {
      await sendTelegramMessage(telegramHtml);
      telegramSent = true;
    } catch (e) {
      telegramError = String(e?.message || e);
      console.error("TELEGRAM ERROR (create-payment):", telegramError);
    }

    return res.status(200).json({
      checkoutUrl,
      orderId,
      emailSent,
      telegramSent,
      emailError,
      telegramError,
    });
  } catch (e) {
    console.error("SERVER ERROR create-payment:", e);
    return res
      .status(500)
      .json({ error: "Server error", message: String(e?.message || e) });
  }
}