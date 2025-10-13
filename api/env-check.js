import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default function handler(req, res) {
  res.status(200).json({
    hasToken: !!process.env.MONOPAY_TOKEN,
    MONOPAY_BASE: process.env.MONOPAY_BASE,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL
  });
}