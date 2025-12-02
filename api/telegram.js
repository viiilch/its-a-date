// api/lib/telegram.js

export async function sendTelegramMessage(text) {
  try {
    const token = process.env.TG_BOT_TOKEN;
    const chatId = process.env.TG_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing TG_BOT_TOKEN or TG_CHAT_ID", {
        hasToken: !!token,
        hasChatId: !!chatId,
      });
      return { ok: false, error: "Missing TG_BOT_TOKEN or TG_CHAT_ID" };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // тепер ми кажемо Telegram, що це Markdown,
        // а не HTML — під *жирний* це підходить
        parse_mode: "Markdown",
      }),
    });

    const data = await resp.json();
    console.log("Telegram response:", data);
    return data;
  } catch (e) {
    console.error("Telegram error:", e);
    return { ok: false, error: String(e?.message || e) };
  }
}