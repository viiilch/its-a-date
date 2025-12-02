// api/monopay-webhook.js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      return res
        .status(200)
        .json({ ok: true, ping: "monopay-webhook-alive" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method Not Allowed" });
    }

    let raw = "";
    for await (const chunk of req) raw += chunk;

    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }

    console.log("MONOPAY WEBHOOK BODY:", body);

    // просто відповідаємо Mono, що все ок
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("MONOPAY WEBHOOK FATAL ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: String(err?.message || err),
    });
  }
}