// api/poster-webhook.js
export const config = { runtime: "nodejs" };

const CLIENT_SECRET = process.env.POSTER_APP_SECRET || "";

function ok(res, data = {}) { return res.status(200).json(data); }
function bad(res, msg) { return res.status(400).json({ ok: false, error: msg }); }

export default async function handler(req, res) {
  if (req.method !== "POST") return ok(res, { ok: true, note: "use POST" });

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  let body = {};
  try { body = JSON.parse(raw); } catch { return bad(res, "invalid json"); }

  try {
    const { account, object, object_id, action, time, verify, data } = body;
    const parts = [account, object, String(object_id), action];
    if (typeof data !== "undefined") parts.push(data);
    parts.push(String(time), CLIENT_SECRET);

    const crypto = await import("node:crypto");
    const expected = crypto.createHash("md5").update(parts.join(";")).digest("hex");
    if (verify !== expected) return bad(res, "bad signature");
  } catch {
    return bad(res, "verify failed");
  }

  return ok(res, { status: "accept" });
}