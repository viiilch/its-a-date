export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  return res.status(200).json({
    ok: true,
    poster: {
      base: process.env.POSTER_BASE,
      hasToken: !!process.env.POSTER_TOKEN,
      token: process.env.POSTER_TOKEN ? "✅ Exists (hidden)" : "❌ Missing",
      spot: process.env.POSTER_SPOT_ID,
    },
  });
}