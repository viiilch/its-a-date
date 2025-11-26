// api/telegram-test.js
export default async function handler(req, res) {
  try {
    // читаємо твої змінні середовища
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    if (!token || !chatId) {
      return res.status(200).json({
        ok: false,
        error: "Missing TG_BOT_TOKEN or TG_CHAT_ID in env",
        hasToken: !!token,
        hasChatId: !!chatId,
      });
    }

    const text = "Test message from kyivdinnerclub.com.ua /api/telegram-test";

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const tgResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const data = await tgResp.json();

    return res.status(200).json({
      ok: true,
      sent: true,
      telegramOk: data.ok,
      telegramResponse: data,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: String(e?.message || e),
    });
  }
}