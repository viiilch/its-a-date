export default async function handler(req, res) {
  try {
    const { code, account } = req.query;
    const appId = process.env.POSTER_APP_ID;
    const appSecret = process.env.POSTER_APP_SECRET;
    const redirect = process.env.POSTER_REDIRECT;

    if (!code || !account) return res.status(400).json({ ok:false, error:"Missing code/account" });

    const url = `https://${account}.joinposter.com/api/v2/auth/access_token`;
    const body = new URLSearchParams({
      application_id: String(appId),
      application_secret: String(appSecret),
      grant_type: "authorization_code",
      redirect_uri: String(redirect),
      code: String(code),
    });

    const r = await fetch(url, { method:"POST", body });
    const t = await r.text();
    if (!r.ok) return res.status(200).json({ ok:false, step:"access_token", http:r.status, body:t });

    const data = JSON.parse(t);
    // ⚠️ збережи токен у Vercel вручну (через Settings → Env Vars) як POSTER_TOKEN
    // тут просто показуємо що отримали:
    return res.status(200).json({ ok:true, got: { access_token: data.access_token, account: data.account_number }});
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}