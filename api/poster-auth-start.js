export default async function handler(req, res) {
  const appId = process.env.POSTER_APP_ID;
  const redirect = process.env.POSTER_REDIRECT;
  const account = (req.query.account || process.env.POSTER_ACCOUNT || "").trim();
  if (!appId || !redirect) return res.status(500).json({ ok:false, error:"Missing env" });

  if (!account) {
    // якщо явно не передали ?account=its-a-date — редіректим на універсальний /api/auth
    return res.redirect(
      `https://joinposter.com/api/auth?application_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`
    );
  }
  return res.redirect(
    `https://${account}.joinposter.com/api/auth?application_id=${appId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`
  );
}