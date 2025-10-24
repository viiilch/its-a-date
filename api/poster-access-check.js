// api/poster-access-check.js
export default async function handler(req, res) {
  try {
    const access = process.env.POSTER_ACCESS_TOKEN || "";
    const hasAccess = Boolean(access && access.length > 10);
    // безпечно: сам токен не показуємо
    const account = "its-a-date";
    const url = `https://${account}.joinposter.com/api/access.getSpots?access_token=${encodeURIComponent(access)}`;

    let poster = null, err = null;
    if (hasAccess) {
      try {
        const r = await fetch(url);
        const t = await r.text();
        poster = t;
      } catch (e) {
        err = String(e?.message || e);
      }
    }

    return res.status(200).json({
      ok: true,
      hasAccessToken: hasAccess,
      tokenPreview: hasAccess ? `length:${access.length}` : null,
      triedAccessGetSpots: hasAccess,
      posterRaw: poster, // тут буде або {"response":[...]} або {"error":{...}}
      error: err,
      env: "production"
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}