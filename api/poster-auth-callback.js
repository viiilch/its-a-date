export default async function handler(req, res) {
  try {
    const { url } = req;
    const u = new URL(url, "https://kyivdinnerclub.com.ua");
    const code = u.searchParams.get("code");
    const account = u.searchParams.get("account"); // має бути "its-a-date"

    if (!code || !account) {
      return res.status(400).json({ ok:false, error:"Missing code/account" });
    }

    const appId     = process.env.POSTER_APP_ID;
    const appSecret = process.env.POSTER_APP_SECRET;
    const redirect  = "https://kyivdinnerclub.com.ua/api/poster-auth-callback";

    const body = new URLSearchParams({
      application_id:     String(appId),
      application_secret: String(appSecret),
      grant_type:         "authorization_code",
      redirect_uri:       redirect,
      code
    });

    const tokenUrl = `https://${account}.joinposter.com/api/v2/auth/access_token`;
    const r = await fetch(tokenUrl, { method:"POST", body });
    const t = await r.text();

    if (!r.ok) return res.status(500).json({ ok:false, error:`HTTP ${r.status}: ${t}` });

    const json = JSON.parse(t);
    const access_token = json?.access_token;

    if (!access_token) {
      return res.status(500).json({ ok:false, error:"No access_token in response", raw:json });
    }

    // Показуємо токен (щоб ти могла вручну вставити у Vercel -> POSTER_TOKEN)
    return res.status(200).json({ ok:true, got:{ access_token, account } });
  } catch (e) {
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}