// api/telegram-test.js
export const config = { runtime: "nodejs" };

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  try {
    // Простий ping, щоб бачити, що функція жива
    if (req.method === "GET" && req.query?.ping === "1") {
      return res.status(200).json({
        ok: true,
        note: "telegram-test alive",
      });
    }

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(200).json({
        ok: false,
        error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env",
      });
    }

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const payload = {
      chat_id: CHAT_ID,
      text: "Тестове повідомлення від its-a-date 🚀",
      parse_mode: "HTML",
    };

    const tgResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const tgText = await tgResp.text();
    let tgJson = null;
    try {
      tgJson = JSON.parse(tgText);
    } catch {
      // якщо це не JSON – просто лишимо текст
    }

    return res.status(200).json({
      ok: true,
      sentTo: CHAT_ID,
      telegramOk: tgResp.ok,
      telegramStatus: tgResp.status,
      telegramRaw: tgJson || tgText,
    });
  } catch (err) {
    console.error("TELEGRAM TEST ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}