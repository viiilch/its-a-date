// api/poster-access-ping.js
import { posterCall } from "./lib/poster.js";

export default async function handler(req, res) {
  try {
    // простий OAuth-метод: access.getSpots або access.getRegisters
    const raw = await posterCall("access.getSpots", {}, false);
    return res.status(200).json({ ok: true, raw });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e?.message || e) });
  }
}