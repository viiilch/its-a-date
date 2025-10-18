// api/poster-auth-start.js
export default async function handler(req, res) {
  const { account, code } = req.query || {};
  // Просто віддай, що отримали з Poster, щоб бачити, що редірект працює
  return res.status(200).json({ ok: true, received: { code, account } });
}
export default async function handler(req, res) {
  const APP_ID   = process.env.POSTER_APP_ID;             // число з Poster Dev
  const REDIRECT = process.env.POSTER_REDIRECT;           // https://kyivdinnerclub.com.ua/api/poster-auth-callback
  const ACCOUNT  = process.env.POSTER_ACCOUNT || "its-a-date"; // твій піддомен у Poster

  if (!APP_ID || !REDIRECT) {
    return res.status(500).json({ ok:false, error:"Missing POSTER_APP_ID or POSTER_REDIRECT" });
  }

  const authUrl =
    `https://${ACCOUNT}.joinposter.com/api/auth` +
    `?application_id=${encodeURIComponent(APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
    `&response_type=code`;

  res.writeHead(302, { Location: authUrl });
  res.end();
}