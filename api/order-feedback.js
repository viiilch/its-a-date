// api/order-feedback.js
import { sendTelegramMessage } from "./lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { createdAt, total, customerEmail, rating, source, comment } = req.body || {};

    const lines = [
      "*📝 Відгук (після оплати)*",
      createdAt ? `🕒 ${new Date(createdAt).toLocaleString("uk-UA")}` : null,
      total != null ? `💳 Сума: *${total} грн*` : null,
      customerEmail ? `📧 Email: ${customerEmail}` : null,
      rating ? `⭐ Оцінка: *${rating}/5*` : null,
      source ? `📍 Звідки: ${source}` : null,
      comment ? `💬 Коментар: ${comment}` : null,
    ].filter(Boolean);

    const tg = await sendTelegramMessage(lines.join("\n"));

    if (!tg?.ok) {
      return res.status(500).json({ ok: false, error: "Telegram send failed", tg });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("order-feedback error:", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}