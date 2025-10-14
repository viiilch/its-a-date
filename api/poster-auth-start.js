// Крок 1: віддаємо code+account назад клієнту (для дебагу), або редіректимо
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const code = req.query?.code || req.query?.CODE || req.body?.code;
  const account = req.query?.account || req.body?.account;
  return res.status(200).json({ ok: true, received: { code, account } });
}