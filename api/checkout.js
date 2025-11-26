// api/checkout.js — приймає замовлення, шле email + Telegram

import nodemailer from "nodemailer";
import { sendTelegramMessage } from "./lib/telegram.js"; // 🟢 підключаємо наш модуль

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const {
      firstName,
      lastName,
      phone,
      delivery,
      np,
      cart,
      total,
      orderId,
    } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ ok: false, error: "Cart is empty" });
    }

    // -----------------------------------------------------
    // 🟣 1) Формуємо красивий Telegram текст
    // -----------------------------------------------------
    const tgText = `
🆕 <b>Нове замовлення!</b>

👤 <b>Клієнт:</b> ${firstName} ${lastName}
📞 <b>Телефон:</b> ${phone}

📦 <b>Доставка:</b> ${delivery}
🏤 <b>Відділення:</b> ${np || "—"}

🛍 <b>Товари:</b>
${cart.map(i => `• ${i.title} x${i.qty} — ${i.price} грн`).join("\n")}

💰 <b>Сума:</b> ${total} грн
🧾 <b>ID замовлення:</b> ${orderId}

⏰ <b>Час:</b> ${new Date().toLocaleString("uk-UA")}
`;

    await sendTelegramMessage(tgText);

    // -----------------------------------------------------
    // 🟡 2) Надсилаємо E-mail
    // -----------------------------------------------------
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ORDER_EMAIL,            // твій Gmail
        pass: process.env.ORDER_EMAIL_PASSWORD,   // твій пароль застосунку
      },
    });

    const emailHtml = `
      <h2>Нове замовлення!</h2>

      <p><b>Клієнт:</b> ${firstName} ${lastName}</p>
      <p><b>Телефон:</b> ${phone}</p>
      <p><b>Доставка:</b> ${delivery}</p>
      <p><b>Відділення:</b> ${np}</p>

      <h3>Товари:</h3>
      <ul>
        ${cart.map(i => `<li>${i.title} x${i.qty} — ${i.price} грн</li>`).join("")}
      </ul>

      <p><b>Сума:</b> ${total} грн</p>
      <p><b>ID замовлення:</b> ${orderId}</p>
      <p><b>Час:</b> ${new Date().toLocaleString("uk-UA")}</p>
    `;

    await transporter.sendMail({
      from: `"It's a Date" <${process.env.ORDER_EMAIL}>`,
      to: process.env.ORDER_EMAIL, // надсилаємо тобі
      subject: `Нове замовлення №${orderId}`,
      html: emailHtml,
    });

    // -----------------------------------------------------
    // 🟢 3) Відповідь клієнту
    // -----------------------------------------------------
    return res.json({ ok: true });

  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ ok: false, error: "Server error", details: err.message });
  }
}