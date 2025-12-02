// api/monopay-webhook.js
export const config = { runtime: "nodejs" };

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import nodemailer from "nodemailer";
import { sendTelegramMessage } from "./lib/telegram.js";
import { query } from "./lib/db.js";

const ORDER_EMAIL_TO =
  process.env.ORDER_EMAIL_TO || "itsadate.orderss@gmail.com";

const ORDER_EMAIL_FROM =
  process.env.ORDER_EMAIL_FROM || ORDER_EMAIL_TO;

const ORDER_EMAIL_PASSWORD =
  process.env.ORDER_EMAIL_PASSWORD ||
  process.env.orderEmailPassword ||
  "";

// --- Створюємо транспорт для Gmail ---
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

// --- дістаємо reference з тіла вебхука ---
function getReferenceFromBody(body = {}) {
  return (
    body?.reference || // такий варіант у тебе вже був у листі
    body?.merchantPaymInfo?.reference ||
    body?.salePaymentData?.orderId ||
    body?.invoiceId ||
    null
  );
}

// --- формуємо текст листа для ОПЛАЧЕНОГО замовлення ---
function buildEmailText({ reference, customer, cart, totalUAH }) {
  const lineStrings = cart.map((item, idx) => {
    const title = item.title || `Товар ${idx + 1}`;
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 0);
    const sum = price * qty;
    return `• ${title} — ${qty} x ${price} = ${sum} UAH`;
  });

  return [
    `Нове ОПЛАЧЕНЕ замовлення з сайту It's a Date`,
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
    `Сума: ${totalUAH} UAH`,
    ``,
    `Статус оплати: ОПЛАЧЕНО ✅`,
  ]
    .filter(Boolean)
    .join("\n");
}

// --- HTML для Telegram (parse_mode: HTML) ---
function buildTelegramHtml({ reference, customer, cart, totalUAH }) {
  const lines = cart.map((item, idx) => {
    const title = escapeHtml(item.title || `Товар ${idx + 1}`);
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 0);
    const sum = price * qty;
    return `• ${title} — ${qty} x ${price} = ${sum} UAH`;
  });

  return [
    `<b>🧾 ОПЛАЧЕНЕ замовлення з сайту It's a Date</b>`,
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
    `<b>💰 Сума: ${totalUAH} UAH</b>`,
    ``,
    `<b>Статус оплати: ОПЛАЧЕНО ✅</b>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default async function handler(req, res) {
  try {
    // health-check
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, ping: "monopay-webhook-alive" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
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

    const status = String(body?.status || "").toLowerCase();
    const reference = getReferenceFromBody(body);

    console.log("WEBHOOK BODY:", body);
    console.log("WEBHOOK status:", status, "reference:", reference);

    // цікавить лише успішна оплата
    if (status !== "success") {
      return res.status(200).json({
        ok: true,
        note: "Ignoring non-success status.",
        status,
      });
    }

    if (!reference) {
      console.error("No reference in webhook body, cannot match order");
      return res.status(200).json({
        ok: false,
        note: "No reference in webhook body",
      });
    }

    // --- шукаємо замовлення в БД ---
    let order = null;
    try {
      const dbRes = await query(
        "SELECT * FROM orders WHERE reference = $1 LIMIT 1",
        [reference]
      );
      order = dbRes.rows[0] || null;
    } catch (dbErr) {
      console.error("DB ERROR (webhook select):", dbErr);
    }

    if (!order) {
      console.error("Order not found in DB for reference:", reference);
      // fallback: нічого не шлемо, щоб не було кривого листа
      return res.status(200).json({
        ok: false,
        note: "Order not found in DB",
        reference,
      });
    }

    // якщо вже paid — не дублюємо листи
    if (order.status === "paid") {
      return res.status(200).json({
        ok: true,
        note: "Order already marked as paid",
        reference,
      });
    }

    // --- оновлюємо статус на paid ---
    try {
      await query(
        "UPDATE orders SET status = $2 WHERE reference = $1",
        [reference, "paid"]
      );
    } catch (dbErr) {
      console.error("DB ERROR (webhook update):", dbErr);
      // все одно спробуємо відправити лист/телеграм
    }

    // --- дані з БД ---
    const customer = {
      firstName: order.customer_first_name || "",
      lastName: order.customer_last_name || "",
      phone: order.phone || "",
      np: order.np || "",
    };

    let cart = order.cart_json || [];
    if (typeof cart === "string") {
      try {
        cart = JSON.parse(cart);
      } catch {
        cart = [];
      }
    }

    const totalUAH = (order.total_cents || 0) / 100;

    const emailText = buildEmailText({
      reference,
      customer,
      cart,
      totalUAH,
    });

    const telegramHtml = buildTelegramHtml({
      reference,
      customer,
      cart,
      totalUAH,
    });

    let emailSent = false;
    let telegramSent = false;
    let emailError = null;
    let telegramError = null;

    // --- E-MAIL ---
    try {
      const transport = createTransport();
      const info = await transport.sendMail({
        from: ORDER_EMAIL_FROM,
        to: ORDER_EMAIL_TO,
        subject: `ОПЛАЧЕНЕ замовлення: ${reference}`,
        text: emailText,
      });
      emailSent = true;
      console.log("Email sent, id:", info.messageId);
    } catch (e) {
      emailError = String(e?.message || e);
      console.error("EMAIL ERROR (webhook):", emailError);
    }

    // --- Telegram ---
    try {
      await sendTelegramMessage(telegramHtml);
      telegramSent = true;
    } catch (e) {
      telegramError = String(e?.message || e);
      console.error("TELEGRAM ERROR (webhook):", telegramError);
    }

    return res.status(200).json({
      ok: true,
      emailSent,
      telegramSent,
      emailError,
      telegramError,
      reference,
    });
  } catch (err) {
    console.error("MONOPAY WEBHOOK FATAL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}