// Крок 3: обмінюємо code на access_token (через Poster v2)
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const code = req.query?.code;
    const account = req.query?.account;
    const appId = process.env.POSTER_APP_ID;
    const appSecret = process.env.POSTER_APP_SECRET;
    const redirect = process.env.POSTER_REDIRECT; // має дорівнювати цьому самому маршруту

    if (!code || !account) {
      return res.status(400).json({ ok: false, error: "Missing code/account" });
    }
    if (!appId || !appSecret || !redirect) {
      return res.status(500).json({ ok: false, error: "APP_ID/SECRET/REDIRECT not configured" });
    }

    const url = `https://${account}.joinposter.com/api/v2/auth/access_token`;
    const body = new URLSearchParams({
      application_id: String(appId),
      application_secret: String(appSecret),
      grant_type: "authorization_code",
      redirect_uri: String(redirect),
      code: String(code),
    });

    const r = await fetch(url, { method: "POST", body });
    const txt = await r.text();
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: `HTTP ${r.status}: ${txt}` });
    }
    let data = {};
    try { data = JSON.parse(txt); } catch { /* ignore */ }

    return res.status(200).json({ ok: true, got: { access_token: data?.access_token, account: data?.account_number || account } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}