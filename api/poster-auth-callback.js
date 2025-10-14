// api/poster-auth-callback.js  (ESM, Node runtime)
export const config = { runtime: "nodejs" };

function json(res, code, data) {
  res.status(code).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  try {
    // забираємо code та account з query
    const url = new URL(req.url, "http://x");
    const code = url.searchParams.get("code");
    const account = url.searchParams.get("account");

    if (!code || !account) {
      return json(res, 400, { ok: false, error: "Missing code or account" });
    }

    const appId     = process.env.POSTER_APP_ID || "";
    const appSecret = process.env.POSTER_APP_SECRET || "";
    const redirect  = process.env.POSTER_REDIRECT || "";

    if (!appId || !appSecret || !redirect) {
      return json(res, 500, { ok: false, error: "Missing POSTER_APP_ID / POSTER_APP_SECRET / POSTER_REDIRECT env" });
    }

    // готуємо POST form-data (x-www-form-urlencoded)
    const body = new URLSearchParams();
    body.set("application_id",     String(appId));
    body.set("application_secret", String(appSecret));
    body.set("grant_type",         "authorization_code");
    body.set("redirect_uri",       String(redirect));
    body.set("code",               String(code));

    const tokenUrl = `https://${account}.joinposter.com/api/v2/auth/access_token`;
    const r = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      return json(res, 200, { ok: false, error: `Poster HTTP ${r.status}`, detail: data });
    }
    if (data?.error) {
      return json(res, 200, { ok: false, error: data.error });
    }

    // успішно отримали access_token
    const access = data?.access_token || "";
    if (!access) {
      return json(res, 200, { ok: false, error: "No access_token in response", detail: data });
    }

    // ПОВЕРТАЄМО ЙОГО, щоб ти могла вставити у Vercel як POSTER_TOKEN
    return json(res, 200, { ok: true, access_token: access, info: { account, user: data?.user || null } });
  } catch (err) {
    return json(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}