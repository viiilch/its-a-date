// Приймає code+account від Poster, міняє на access_token і показує його
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const appId = process.env.POSTER_APP_ID;
    const appSecret = process.env.POSTER_APP_SECRET;
    const redirect = process.env.POSTER_REDIRECT;

    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.searchParams.get("code");
    const account = url.searchParams.get("account"); // піддомен Poster

    if (!code || !account) {
      return res.status(400).send("Missing code or account in query");
    }
    if (!appId || !appSecret || !redirect) {
      return res.status(500).send("Set POSTER_APP_ID, POSTER_APP_SECRET, POSTER_REDIRECT in Vercel env");
    }

    const tokenUrl = `https://${account}.joinposter.com/api/v2/auth/access_token`;
    const body = new URLSearchParams();
    body.set("application_id", appId);
    body.set("application_secret", appSecret);
    body.set("grant_type", "authorization_code");
    body.set("redirect_uri", redirect);
    body.set("code", code);

    const r = await fetch(tokenUrl, { method: "POST", body });
    const text = await r.text();

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    // Показуємо зручну підказку
    const access = data?.access_token;
    const html = `
      <html><body style="font-family:system-ui;padding:24px">
        <h2>Poster OAuth: токен отримано</h2>
        <p><b>access_token:</b></p>
        <pre style="background:#f6f6f6;padding:12px;border-radius:8px">${access || "(немає)"}</pre>
        <ol>
          <li>Скопіюйте це значення.</li>
          <li>На Vercel → Project → Settings → Environment Variables:
            створіть/оновіть <code>POSTER_TOKEN</code> = це значення (Sensitive, Production+Preview), збережіть.</li>
          <li>Зробіть Redeploy.</li>
        </ol>
        <p>Сире тіло відповіді:</p>
        <pre style="background:#f6f6f6;padding:12px;border-radius:8px;white-space:pre-wrap">${text}</pre>
      </body></html>
    `;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send(String(e?.message || e));
  }
}