// Редірект на сторінку згоди Poster
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const appId  = process.env.POSTER_APP_ID;
  const redirect = process.env.POSTER_REDIRECT; // напр. https://kyivdinnerclub.com.ua/api/poster-oauth-callback
  const account = process.env.POSTER_ACCOUNT || ""; // напр. its-a-date (можна залишити пустим)

  if (!appId || !redirect) {
    return res.status(500).json({ ok: false, error: "Set POSTER_APP_ID and POSTER_REDIRECT in Vercel env" });
  }

  const base = account
    ? `https://${account}.joinposter.com/api/auth`
    : `https://joinposter.com/api/auth`;

  const u = new URL(base);
  u.searchParams.set("application_id", appId);
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("response_type", "code");

  res.writeHead(302, { Location: u.toString() });
  res.end();
}