// api/telegram-test.js  (ESM, Node on Vercel)
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({
        ok: false,
        error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in env",
      });
    }

    const text = "Тестове повідомлення від its-a-date 🚀";

    const tgResp = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      }
    );

    const tgJson = await tgResp.json();

    return res.status(200).json({
      ok: true,
      sentTo: chatId,
      telegramOk: tgJson.ok,
      telegramRaw: tgJson,
    });
  } catch (e) {
    return res
      .status(500)
      .json({ ok: false, error: String(e?.message || e) });
  }
}