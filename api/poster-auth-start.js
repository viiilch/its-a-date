// Старт OAuth у Poster: редірект на сторінку згоди
export default async function handler(req, res) {
  try {
    const APP_ID = process.env.POSTER_APP_ID;
    const REDIRECT = process.env.POSTER_REDIRECT; // наприклад: https://kyivdinnerclub.com.ua/api/poster-auth-callback
    const account = (req.query?.account || process.env.POSTER_ACCOUNT || "").trim();

    if (!APP_ID || !REDIRECT) {
      return res.status(500).json({ ok: false, error: "Missing POSTER_APP_ID or POSTER_REDIRECT" });
    }

    const base = account
      ? `https://${account}.joinposter.com/api/auth`
      : `https://joinposter.com/api/auth`;

    const url = `${base}?application_id=${encodeURIComponent(APP_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code`;

    // 302 редірект на Poster
    res.status(302).setHeader("Location", url).end();
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}