// Запускає редірект на Poster OAuth
export default async function handler(req, res) {
  try {
    const APP_ID = process.env.POSTER_APP_ID; // у Vercel -> Environment
    const REDIRECT = "https://kyivdinnerclub.com.ua/api/poster-auth-callback";
    const ACCOUNT = "its-a-date"; // твій піддомен у Poster

    const url = `https://${ACCOUNT}.joinposter.com/api/auth` +
      `?application_id=${encodeURIComponent(APP_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
      `&response_type=code`;

    res.writeHead(302, { Location: url });
    res.end();
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}