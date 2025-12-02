// api/test-telegram.js
import { sendTelegramMessage } from "./lib/telegram.js";

export default async function handler(req, res) {
  const result = await sendTelegramMessage("Тестове повідомлення з сайту It's a Date ✅");
  return res.status(200).json({ result });
}