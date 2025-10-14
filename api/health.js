// Простий пінг, щоб перевірити, що функції збираються і працюють
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  return res.status(200).json({ ok: true });
}