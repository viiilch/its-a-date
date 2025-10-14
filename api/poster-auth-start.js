// api/poster-auth-start.js
export default function handler(req, res) {
  const APP_ID = process.env.POSTER_APP_ID || "";
  const REDIRECT = process.env.POSTER_REDIRECT || ""; // має бути https://kyivdinnerclub.com.ua/api/poster-auth-callback
  const ACCOUNT = process.env.POSTER_ACCOUNT || "";   // ваш піддомен без https (наприклад: its-a-date)

  if (!APP_ID || !REDIRECT || !ACCOUNT) {
    return res.status(500).json({ ok: false, error: "Missing env: POSTER_APP_ID/POSTER_REDIRECT/POSTER_ACCOUNT" });
  }

  const authUrl =
    `https://${ACCOUNT}.joinposter.com/api/auth` +
    `?application_id=${encodeURIComponent(APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
    `&response_type=code`;

  res.writeHead(302, { Location: authUrl });
  res.end();
}