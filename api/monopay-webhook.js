// api/monopay-webhook.js
import { getMenuProducts, createPosterOrderDraft } from "./lib/poster.js";

export const config = {
  runtime: "edge",
};

function json(res, code, data) {
  return new Response(JSON.stringify(data), {
    status: code,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export default async function handler(req) {
  try {
    const bodyText = await req.text();
    const body = bodyText ? JSON.parse(bodyText) : {};

    // Проста перевірка «живий/неживий»
    if (body?.status === "success" && !body?.salePaymentData) {
      return json(null, 200, {
        ok: true,
        received: { status: "success", invoiceId: body.invoiceId ?? null, reference: body.merchantPaymInfo?.reference ?? null, items: 0, total: 0, customer: {} },
        env: {
          hasMono: !!(process.env.MONOPAY_TOKEN),
          hasPoster: !!(process.env.POSTER_TOKEN),
          spotId: process.env.POSTER_SPOT_ID || null,
        },
        note: "Сервер працює стабільно. Інтеграцію з Poster додамо наступним кроком.",
      });
    }

    // Реальний кейс від MonoPay (спрощено)
    const sale = body?.salePaymentData || {};
    const customer = sale?.customer || {};
    const cart = sale?.cart || [];
    const reference = (body?.merchantPaymInfo?.reference || sale?.orderId || "").toString();

    // 1) Підтягнемо меню Poster і побудуємо мапінг за назвою
    const { byName, spotId } = await getMenuProducts();

    // 2) Зіставимо позиції за НАЗВОЮ
    const lines = [];
    const notFound = [];
    for (const it of cart) {
      const key = (it.title || "").trim().toLowerCase();
      const posterItem = byName.get(key);
      if (!posterItem) {
        notFound.push(it.title);
        continue;
      }
      // Poster ціни зазвичай у копійках (price["1"] = "30000"). Ми тримаємо у грн.
      const unitPriceGrn = Number(it.price); // ти вже передаєш у грн
      lines.push({
        product_id: posterItem.product_id,
        title: it.title,
        qty: Number(it.qty) || 1,
        price: unitPriceGrn,
      });
    }

    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

    // 3) Підготувати payload для Poster (поки що — БЕЗ відправки)
    const draft = await createPosterOrderDraft({ customer, lines, total });

    // 4) Повертаємо у відповідь, що б ми надіслали в Poster
    //    і в консоль лог — щоб ти побачила мапінг.
    console.log("=== POSTER ORDER DRAFT ===");
    console.log(JSON.stringify({ reference, spotId, customer, lines, total, draft, notFound }, null, 2));

    return json(null, 200, {
      ok: true,
      poster: {
        willSend: draft,
        notFound,           // якщо назва у кошику не співпала з назвою в Poster
        note: "Чекаємо відповідь Poster щодо точного методу створення замовлення. Як тільки підтвердять — ввімкнемо реальний виклик.",
      },
    });
  } catch (err) {
    return json(null, 500, { ok: false, error: String(err?.message || err) });
  }
}