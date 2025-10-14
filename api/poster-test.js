// api/poster-test.js
export default function handler(req, res) {
  return res.status(200).json({ ok: true, ping: "poster-test" });
}