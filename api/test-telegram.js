// api/test-telegram.js
import { sendTelegramMessage } from "./lib/telegram.js";

export default async function handler(req, res) {
  try {
    const result = await sendTelegramMessage(
      "Тестове повідомлення з сайту *It's a Date*"
    );

    return res.status(200).json({
      ok: true,
      telegramResult: result,
    });
  } catch (e) {
    console.error("TEST TELEGRAM ERROR:", e);
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
}