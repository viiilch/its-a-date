// api/poster-auth-start.js
export default async function handler(req, res) {
  const { account, code } = req.query || {};
  return res.status(200).json({ ok: true, received: { code, account } });
}