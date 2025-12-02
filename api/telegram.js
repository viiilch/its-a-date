// api/lib/telegram.js

export async function sendTelegramMessage(text) {
  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;

  // Лог, щоб побачити, чи підтягуються env
  console.log("TELEGRAM ENV:", {
    hasToken: !!token,
    hasChatId: !!chatId,
    // не палимо дані повністю:
    tokenSuffix: token ? token.slice(-5) : null,
    chatId,
  });

  if (!token || !chatId) {
    console.error("Missing TG_BOT_TOKEN or TG_CHAT_ID");
    return { ok: false, error: "Missing TG_BOT_TOKEN or TG_CHAT_ID" };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // можна взагалі прибрати parse_mode, щоб нічого не ламалось
        // або поставити "Markdown"
        parse_mode: "Markdown",
      }),
    });

    const raw = await resp.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { ok: false, parseError: true, raw };
    }

    // Логуємо відповідь від Telegram
    console.log("TELEGRAM RESP STATUS:", resp.status);
    console.log("TELEGRAM RESP BODY:", data);

    if (!resp.ok || data?.ok === false) {
      console.error("TELEGRAM SEND ERROR:", {
        status: resp.status,
        body: data,
      });
    }

    return data;
  } catch (e) {
    console.error("Telegram error (fetch failed):", e);
    return { ok: false, error: String(e?.message || e) };
  }
}