// api/create-order.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res
        .status(405)
        .json({ ok: false, error: "Method Not Allowed. Use POST." });
    }

    // читаємо JSON-тіло (як у monopay-webhook)
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");

    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).json({ ok: false, error: "Bad JSON" });
    }

    const { name, phone, address, cart, comment } = body;

    if (!name || !phone || !cart) {
      return res.status(400).json({
        ok: false,
        error: "Вкажіть ім'я, телефон і замовлення (cart)",
      });
    }

    // Транспорт для Gmail (через пароль застосунку)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ORDER_EMAIL,
        pass: process.env.ORDER_EMAIL_PASSWORD,
      },
    });

    const toEmail = process.env.NOTIFY_EMAIL || process.env.ORDER_EMAIL;

    const text = `
Нове замовлення з сайту ITS A DATE! 💛

Ім'я: ${name}
Телефон: ${phone}
Адреса/Нова Пошта: ${address || "-"}

Коментар:
${comment || "-"}

Замовлення:
${cart}
    `.trim();

    await transporter.sendMail({
      from: `"ITS A DATE! – замовлення" <${process.env.ORDER_EMAIL}>`,
      to: toEmail,
      subject: "🛍️ Нове замовлення з сайту",
      text,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("EMAIL ORDER ERROR:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}