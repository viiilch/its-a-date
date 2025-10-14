// api/poster-auth.js  (ESM, Node runtime)
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    // Poster редіректить сюди як:
    // /api/poster-auth?code=...&account=...
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get("code");
    const accountFromQuery = url.searchParams.get("account");

    const APP_ID     = process.env.POSTER_APP_ID || "";
    const APP_SECRET = process.env.POSTER_APP_SECRET || "";
    const REDIRECT   = process.env.POSTER_REDIRECT || "";
    const ACCOUNT    = accountFromQuery || process.env.POSTER_ACCOUNT || "";

    if (!code || !ACCOUNT) {
      return res
        .status(400)
        .send(`Missing params. Got code="${code}", account="${ACCOUNT}".`);
    }
    if (!APP_ID || !APP_SECRET || !REDIRECT) {
      return res
        .status(500)
        .send("Server misconfigured: POSTER_APP_ID/POSTER_APP_SECRET/POSTER_REDIRECT are required.");
    }

    const tokenUrl = `https://${ACCOUNT}.joinposter.com/api/v2/auth/access_token`;
    const body = new URLSearchParams({
      application_id:     String(APP_ID),
      application_secret: String(APP_SECRET),
      grant_type:         "authorization_code",
      redirect_uri:       String(REDIRECT),
      code:               String(code),
    });

    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!r.ok || json.error) {
      return res
        .status(500)
        .send(`Poster auth error.\nHTTP ${r.status}\n${text}`);
    }

    // Очікуємо: { access_token: "123456:abcdef...", account_number: "...", ... }
    const access = json?.access_token;
    if (!access) {
      return res
        .status(500)
        .send(`No access_token in response:\n${text}`);
    }

    // Показуємо інструкцію як додати токен у Vercel
    res
      .status(200)
      .send(
`✅ Успіх! Ось ваш Poster access_token (дійсний ~2 роки):

${access}

Що робити далі:
1) Скопіюйте цей токен.
2) На Vercel → Project → Settings → Environment Variables:
   - створіть/оновіть ключ: POSTER_TOKEN = ${access}
   - Sensitive, Enabled (Production + Preview).
3) Збережіть і виконайте Redeploy.
4) Потім зробіть тестовий вебхук або реальну оплату — замовлення з’явиться як online-order у Poster.`
      );
  } catch (err) {
    res.status(500).send("Fatal error: " + (err?.message || err));
  }
}