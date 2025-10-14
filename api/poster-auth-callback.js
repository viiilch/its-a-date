// api/poster-auth-callback.js
export default function handler(req, res) {
  // Після авторизації Poster редіректить сюди: ?code=...&account=...
  const { code, account } = req.query || {};
  if (!code || !account) {
    return res.status(400).json({ ok: false, error: "Missing code/account in query" });
  }
  // Поки що просто підтвердимо, що все працює:
  return res.status(200).json({ ok: true, received: { code, account } });
}