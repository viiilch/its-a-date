// Callback після згоди у Poster: обмінюємо code -> access_token
export default async function handler(req, res) {
  try {
    const code = req.query?.code;
    const account = req.query?.account || process.env.POSTER_ACCOUNT;
    const APP_ID = process.env.POSTER_APP_ID;
    const APP_SECRET = process.env.POSTER_APP_SECRET;
    const REDIRECT = process.env.POSTER_REDIRECT;

    if (!code || !account) {
      return res.status(400).json({ ok: false, error: "Missing code or account in query" });
    }
    if (!APP_ID || !APP_SECRET || !REDIRECT) {
      return res.status(500).json({ ok: false, error: "Missing Poster app env vars" });
    }

    const url = `https://${account}.joinposter.com/api/v2/auth/access_token`;
    const body = new URLSearchParams({
      application_id: String(APP_ID),
      application_secret: String(APP_SECRET),
      grant_type: "authorization_code",
      redirect_uri: String(REDIRECT),
      code: String(code),
    });

    const r = await fetch(url, { method: "POST", body });
    const text = await r.text();
    if (!r.ok) {
      return res.status(500).json({ ok: false, error: `HTTP ${r.status}: ${text}` });
    }

    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    // У відповідь прийде access_token типу "861052:xxxxxxxx..."
    // Збережи його вручну у Vercel → Settings → Environment Variables як POSTER_TOKEN (Sensitive, Prod & Preview), потім Redeploy.
    return res.status(200).json({ ok: true, got: { access_token: data?.access_token || null, account }, note: "Скопіюй access_token у Vercel env як POSTER_TOKEN та зроби Redeploy" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}