export async function sendTelegramMessage(text) {
  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing TG_BOT_TOKEN or TG_CHAT_ID");
      return { ok: false };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      }),
    });

    const data = await resp.json();
    return data;
  } catch (e) {
    console.error("Telegram error:", e);
    return { ok: false, error: e };
  }
}