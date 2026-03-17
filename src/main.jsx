// src/main.jsx
import React, { StrictMode, useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/* ===== НАЛАШТУВАННЯ ===== */
const INSTAGRAM_URL = "https://www.instagram.com/kyivdinnerclub/";
const MIN_ORDER = 300;

/* ===== ТОВАРИ (BIG + TO GO) ===== */
const PRODUCTS = [
  {
    id: "stickerpack",
    title: "СТІКЕРПАК ВІД KYIV DINNER CLUB",
    price: 350,
    img: "/img/stikerpak.jpg",
    desc: "Колекція наліпок про ваше і наше життя",
    descEmojis: "🙂👋🪷",
    desc2: "6 випуклих і 8 звичайних стікерів",
    badge: "A6",
    formats: { big: { label: "BIG", price: 350 } },
  },
  {
    id: "dark",
    title: "Dark Chocolate Dates",
    price: 300,
    img: "/img/dark.png",
    desc: "Фініки без кісточки, темний шоколад, арахісова паста, мальдонська сіль",
    formats: { big: { label: "BIG", price: 300 }, togo: { label: "TO GO", price: 110 } },
  },
  {
    id: "milk",
    title: "Milk Chocolate Dates",
    price: 300,
    img: "/img/milk.png",
    desc: "Фініки без кісточки, молочний шоколад, арахісова паста, мальдонська сіль",
    formats: { big: { label: "BIG", price: 300 }, togo: { label: "TO GO", price: 110 } },
  },
  {
    id: "white-pistachio",
    title: "White Chocolate & Pistachio Dates",
    price: 375,
    img: "/img/white-pistachio.png",
    desc: "Фініки без кісточки, білий шоколад, фісташкова паста, вершки",
    formats: { big: { label: "BIG", price: 375 }, togo: { label: "TO GO", price: 140 } },
  },
  {
    id: "caramel",
    title: "Caramel Chocolate & Walnut Dates",
    price: 350,
    img: "/img/caramel.png",
    desc: "Карамельний шоколад, праліне з грецького горіха, волоський горіх",
    formats: { big: { label: "BIG", price: 350 }, togo: { label: "TO GO", price: 125 } },
  },
  {
    id: "matcha-raspberry",
    title: "Matcha & Raspberry Dates",
    price: 375,
    img: "/img/matcha-raspberry.png",
    desc: "Фініки без кісточки, ганаш з малиновим пюре, білий шоколад з матча",
    formats: { big: { label: "BIG", price: 375 }, togo: { label: "TO GO", price: 140 } },
  },
  {
    id: "mixed",
    title: "Mixed (Milk & Dark) Chocolate Dates",
    price: 300,
    img: "/img/mixed.png",
    desc: "Мікс молочного й темного шоколаду, арахісова паста, мальдонська сіль",
    formats: { big: { label: "BIG", price: 300 }, togo: { label: "TO GO", price: 110 } },
  },
];

const GIFT_TOGO_MIXED = {
  id: "gift-mixed-togo",
  title: "Mixed Chocolate Dates TO GO (ПОДАРУНОК)",
  price: 0,
  img: "/img/mixed.png",
};

const POSTCARD = {
  id: "postcard",
  title: "Листівка (вкладання в посилку)",
  price: 30,
  img: "",
};

const fmt = (n) => `${n} грн`;

/* ================= APP ================= */
function App() {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [stage, setStage] = useState("cart"); // cart | checkout
  const [submitting, setSubmitting] = useState(false);

  const isSuccessPage = window.location.pathname === "/order-success";

  useEffect(() => {
    if (cartOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [cartOpen]);

  function addItem(p, qty = 1) {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i === -1) return [...prev, { ...p, qty }];
      const copy = [...prev];
      copy[i] = { ...copy[i], qty: Math.min(99, copy[i].qty + qty) };
      return copy;
    });
    setCartOpen(true);
    setStage("cart");
  }

  function removeItem(id) {
    setCart((prev) => prev.filter((it) => it.id !== id));
  }

  function changeQty(id, d) {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id !== id) return it;
          const q = Math.max(0, Math.min(99, (it.qty || 0) + d));
          return { ...it, qty: q };
        })
        .filter((it) => (it.qty || 0) > 0)
    );
  }

  function setPostcardText(text) {
    const t = String(text || "").slice(0, 200);
    setCart((prev) =>
      prev.map((it) => (it.id === "postcard" ? { ...it, postcardText: t } : it))
    );
  }

  // ✅ ПОДАРУНОК: стікерпак + будь-яка BIG -> додаємо gift-mixed-togo
  useEffect(() => {
    const hasSticker = cart.some((x) => x.id === "stickerpack");
    const hasAnyBig = cart.some((x) => String(x.id || "").endsWith("-big"));
    const hasGift = cart.some((x) => x.id === "gift-mixed-togo");

    const shouldHaveGift = hasSticker && hasAnyBig;

    if (shouldHaveGift && !hasGift) {
      // додаємо тихо (без open cart)
      setCart((prev) => [...prev, { ...GIFT_TOGO_MIXED, qty: 1 }]);
    }

    if (!shouldHaveGift && hasGift) {
      setCart((prev) => prev.filter((x) => x.id !== "gift-mixed-togo"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const total = useMemo(
    () => cart.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0),
    [cart]
  );
  const count = useMemo(() => cart.reduce((s, it) => s + (it.qty || 0), 0), [cart]);

  async function submit(e) {
    e.preventDefault();
    if (!cart.length || submitting) return;

    if (total < MIN_ORDER) {
      alert(`Мінімальне замовлення — ${MIN_ORDER} грн.`);
      return;
    }

    const fd = new FormData(e.currentTarget);
    const customer = {
      firstName: (fd.get("firstName") || "").trim(),
      lastName: (fd.get("lastName") || "").trim(),
      phone: (fd.get("phone") || "").trim(),
      email: (fd.get("email") || "").trim(),
      np: (fd.get("np") || "").trim(),
      comment: (fd.get("comment") || "").trim(),
    };

    const safeCart = cart.map((it) => ({
      id: it.id,
      title: it.title,
      price: it.price,
      qty: it.qty,
      img: it.img || "",
      postcardText: it.postcardText || "",
    }));

    try {
      const payloadForClient = {
        cart: safeCart,
        customer,
        total,
        createdAt: Date.now(),
        smsSent: false,
      };
      localStorage.setItem("itsadate:lastOrder", JSON.stringify(payloadForClient));
    } catch {}

    try {
      setSubmitting(true);
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: safeCart, customer }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.checkoutUrl) {
        alert("Помилка створення оплати. Спробуйте ще раз або напишіть нам в Instagram.");
        setSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      alert("Помилка мережі. Будь ласка, спробуйте ще раз.");
      setSubmitting(false);
    }
  }

  const belowMin = total < MIN_ORDER;
  const hasStickerInCart = cart.some((x) => x.id === "stickerpack");
  const hasPostcard = cart.some((x) => x.id === "postcard");
  const postcardItem = cart.find((x) => x.id === "postcard");

  return (
    <>
      <Header count={count} onOpen={() => setCartOpen(true)} />

      <main className="container">
        {isSuccessPage ? <SuccessPage /> : <Catalog products={PRODUCTS} onBuy={addItem} />}
      </main>

      {!isSuccessPage && cartOpen && (
        <Modal
          onClose={() => {
            setCartOpen(false);
            setStage("cart");
          }}
        >
          <div className="modalHead">
            <h3>{stage === "cart" ? "Кошик" : "Оформлення"}</h3>
            <button
              className="iconBtn"
              onClick={() => {
                setCartOpen(false);
                setStage("cart");
              }}
              aria-label="Закрити"
            >
              ×
            </button>
          </div>

          {stage === "cart" ? (
            cart.length === 0 ? (
              <div className="cartEmpty">
                <p>Порожньо. Додайте щось смачне 🙂</p>
                <button className="btn ghost" onClick={() => setCartOpen(false)}>
                  Повернутись до каталогу
                </button>
              </div>
            ) : (
              <>
                <ul className="cartList">
                  {cart.map((it) => {
                    const isGift = it.id === "gift-mixed-togo";
                    return (
                      <li className="cartRow" key={it.id}>
                        {it.img ? <img className="thumb" src={it.img} alt={it.title} /> : <div className="thumb" />}
                        <div className="cTitle">{it.title}</div>

                        <div className="qtyRow">
                          {isGift ? (
                            <span className="qty">1 шт</span>
                          ) : (
                            <>
                              <button
                                className="qtyBtn"
                                onClick={() => changeQty(it.id, -1)}
                                aria-label="Менше"
                              >
                                –
                              </button>
                              <span className="qty">{it.qty}</span>
                              <button
                                className="qtyBtn"
                                onClick={() => changeQty(it.id, 1)}
                                aria-label="Більше"
                              >
                                +
                              </button>
                            </>
                          )}
                        </div>

                        <div className="cPrice">{fmt((it.price || 0) * (it.qty || 0))}</div>

                        {!isGift ? (
                          <button className="iconBtn rowX" onClick={() => removeItem(it.id)} aria-label="Видалити">
                            ×
                          </button>
                        ) : (
                          <div />
                        )}
                      </li>
                    );
                  })}
                </ul>

                {/* ✅ Апсел стікерпаку */}
                {!hasStickerInCart && (
                  <div className="cartExtras">
                    <div className="addonRowLine">
                      <div>
                        <b>Додати стікерпак</b> — {fmt(350)}
                      </div>
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => addItem({ ...PRODUCTS[0] }, 1)}
                      >
                        Додати
                      </button>
                    </div>
                  </div>
                )}

                {/* ✅ Листівка */}
                <div className="cartExtras">
                  <label className="addonRow">
                    <input
                      type="checkbox"
                      checked={hasPostcard}
                      onChange={(e) => {
                        if (e.target.checked) addItem({ ...POSTCARD }, 1);
                        else removeItem("postcard");
                      }}
                    />
                    <span>
                      Додати листівку за <b>{fmt(POSTCARD.price)}</b>
                    </span>
                  </label>

                  {hasPostcard && (
                    <div className="addonField">
                      <label htmlFor="postcardText">Текст для листівки (до 200 символів)</label>
                      <textarea
                        id="postcardText"
                        rows={3}
                        maxLength={200}
                        placeholder="Наприклад: Для тебе 🤍"
                        value={postcardItem?.postcardText || ""}
                        onChange={(e) => setPostcardText(e.target.value)}
                      />
                      <div className="addonHint">
                        {(postcardItem?.postcardText || "").length}/200
                      </div>
                    </div>
                  )}
                </div>

                <p className="cartNote">
                  * Замовлення відправляємо протягом 4–5 робочих днів з моменту оплати.
                  Десерт готується вручну та крафтово саме під вашу відправку.
                </p>

                <div className="modalFoot">
                  <div className="sum">
                    Всього: <b>{fmt(total)}</b>
                    {belowMin && <div className="sumHint">Мінімальне замовлення — {fmt(MIN_ORDER)}.</div>}
                  </div>
                  <div className="actions">
                    <button className="btn ghost" onClick={() => setCartOpen(false)}>
                      Продовжити покупки
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => {
                        if (!belowMin) setStage("checkout");
                      }}
                      disabled={belowMin}
                    >
                      {belowMin ? `Мінімальне замовлення — ${MIN_ORDER} грн` : "Оформити"}
                    </button>
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              <div className="summaryInModal">
                {cart.map((it) => (
                  <div className="summaryRow" key={it.id}>
                    {it.img ? <img className="thumb" src={it.img} alt={it.title} /> : <div className="thumb" />}
                    <div className="cTitle">{it.title}</div>
                    <div className="qtyRow">
                      <span className="qty">{it.qty} шт</span>
                    </div>
                    <div className="cPrice">{fmt((it.price || 0) * (it.qty || 0))}</div>
                  </div>
                ))}
                <div className="summaryFoot">
                  Всього: <b>{fmt(total)}</b>
                </div>
              </div>

              <form className="formInModal" onSubmit={submit}>
                <div className="grid2">
                  <div>
                    <label htmlFor="firstName">Ім’я</label>
                    <input id="firstName" name="firstName" required placeholder="Ім’я отримувача" />
                  </div>
                  <div>
                    <label htmlFor="lastName">Прізвище</label>
                    <input id="lastName" name="lastName" required placeholder="Прізвище" />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone">Телефон</label>
                  <input id="phone" name="phone" required placeholder="+380XXXXXXXXX" />
                </div>

                <div>
                  <label htmlFor="email">Email (для підтвердження)</label>
                  <input id="email" name="email" type="email" required placeholder="name@email.com" />
                </div>

                <div>
                  <label htmlFor="np">Місто / Відділення Нової Пошти</label>
                  <input id="np" name="np" required placeholder="Київ, відділення №..." />
                </div>

                <div>
                  <label htmlFor="comment">Коментар до замовлення (необовʼязково)</label>
                  <textarea id="comment" name="comment" rows={3} placeholder="Побажання до замовлення, упаковки тощо" />
                </div>

                <div className="modalFoot">
                  <div className="sum">
                    Всього: <b>{fmt(total)}</b>
                  </div>
                  <div className="actions">
                    <button type="button" className="btn ghost" onClick={() => setStage("cart")}>
                      Назад до кошика
                    </button>
                    <button type="submit" className="btn primary" disabled={submitting}>
                      {submitting ? "Переходимо до оплати..." : "Підтвердити та оплатити"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      <footer className="footer">
        <div className="payRow">
          <img className="payIcon" src="/pay/apple-pay.svg" alt="Apple Pay" />
          <img className="payIcon" src="/pay/google-pay.svg" alt="Google Pay" />
          <img className="payIcon" src="/pay/visa.svg" alt="Visa" />
          <img className="payIcon" src="/pay/mastercard.svg" alt="Mastercard" />
        </div>
        <div className="copy">© 2025 IT’S A DATE by Kyiv Dinner Club</div>
      </footer>
    </>
  );
}

/* ================= СТОРІНКА ПІСЛЯ ОПЛАТИ ================= */
function SuccessPage() {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("itsadate:lastOrder");
      if (!raw) return;
      setOrder(JSON.parse(raw));
    } catch {}
  }, []);

  if (!order) {
    return (
      <section className="orderSuccess">
        <h2>Дякуємо за оплату!</h2>
        <p>Ваше замовлення прийнято в обробку. Якщо є питання — напишіть нам в Instagram @kyivdinnerclub.</p>
      </section>
    );
  }

  const { cart, customer, total } = order;

  return (
    <section className="orderSuccess">
      <h2>Дякуємо за оплату! Замовлення прийнято 🤍</h2>
      <p>Ми вже готуємо ваш десерт. Деталі замовлення нижче.</p>

      <h3>Що ви замовили:</h3>
      <ul className="cartList">
        {cart.map((it) => (
          <li className="cartRow" key={it.id}>
            {it.img ? <img className="thumb" src={it.img} alt={it.title} /> : <div className="thumb" />}
            <div className="cTitle">{it.title}</div>
            <div className="qtyRow">
              <span className="qty">{it.qty} шт</span>
            </div>
            <div className="cPrice">{fmt((it.price || 0) * (it.qty || 0))}</div>
          </li>
        ))}
      </ul>

      <div className="summaryFoot">
        Всього: <b>{fmt(total)}</b>
      </div>

      <h3>Дані для відправки:</h3>
      <p>
        {customer.firstName} {customer.lastName}
      </p>
      <p>Телефон: {customer.phone}</p>
      <p>Нова Пошта: {customer.np}</p>
      {customer.comment && <p>Коментар: {customer.comment}</p>}

      <button className="btn primary" style={{ marginTop: "16px" }} onClick={() => (window.location.href = "/")}>
        Повернутись до каталогу
      </button>
    </section>
  );
}

/* ================= ХЕДЕР ================= */
function Header({ count, onOpen }) {
  return (
    <header className="siteHeader">
      <div className="siteHeader__inner">
        <div className="brandWrap">
          <h1 className="brand">
            <img src="/img/its-a-date-logo.svg" alt="IT’S A DATE!" className="brandLogo" />
          </h1>
          <div className="subBrand">Kyiv Dinner Club</div>
        </div>
      </div>

      <a className="igFixed" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <InstagramSvg />
      </a>

      <button className="cartFixed" onClick={onOpen} aria-label="Кошик">
        <CartSvg />
        {!!count && <span className="cartBadge">{count}</span>}
      </button>
    </header>
  );
}

/* ================= ІКОНКИ ================= */
const CartSvg = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Кошик">
    <path
      d="M6 6h14l-1.6 7.2a2 2 0 0 1-2 1.6H9.1a2 2 0 0 1-2-1.5L5.2 3.8H3"
      stroke="#111"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9.5" cy="19.5" r="1.5" fill="#111" />
    <circle cx="16.5" cy="19.5" r="1.5" fill="#111" />
  </svg>
);

const InstagramSvg = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Instagram">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="#111" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="3.8" stroke="#111" strokeWidth="1.8" />
    <circle cx="17.3" cy="6.7" r="1.2" fill="#111" />
  </svg>
);

/* ================= КАТАЛОГ ================= */
function Catalog({ products, onBuy }) {
  const [qtyMap, setQtyMap] = useState({});
  const [formatMap, setFormatMap] = useState({});

  const setQty = (id, f) =>
    setQtyMap((m) => ({
      ...m,
      [id]: Math.max(1, Math.min(99, f(m[id] || 1))),
    }));

  const setFormat = (id, fmtId) => setFormatMap((m) => ({ ...m, [id]: fmtId }));

  return (
    <section className="grid">
      {products.map((p) => {
        const selectedFormat = formatMap[p.id] || "big";
        const price =
          selectedFormat === "togo"
            ? p.formats?.togo?.price ?? p.price
            : p.formats?.big?.price ?? p.price;
        const qty = qtyMap[p.id] || 1;

        const handleBuy = () => {
          const fmtId = selectedFormat;
          const cartId = fmtId === "togo" ? `${p.id}-togo` : p.badge ? p.id : `${p.id}-big`;
          const title = fmtId === "togo" ? `${p.title} TO GO` : p.title;

          onBuy({ ...p, id: cartId, baseId: p.id, variant: fmtId, title, price }, qty);
        };

        return (
          <article className="card" key={p.id}>
            <div className="imgWrap">
              <img src={p.img} alt={p.title} />
            </div>

            <h3 className="cardTitle">{p.title.toUpperCase()}</h3>

            {p.id === "stickerpack" ? (
              <p className="cardDesc cardDesc--sticker">
                {p.desc}
                {p.descEmojis && <span className="noBreak"> {p.descEmojis}</span>}
                {p.desc2 && <span className="descLine2">{p.desc2}</span>}
              </p>
            ) : (
              p.desc && <p className="cardDesc">{p.desc}</p>
            )}

            {p.badge ? (
              <div className="sizeRow">{p.badge}</div>
            ) : (
              <div className="formatRow">
                <button
                  type="button"
                  className={selectedFormat === "big" ? "fmtChoice fmtChoice--active" : "fmtChoice"}
                  onClick={() => setFormat(p.id, "big")}
                >
                  BIG
                </button>

                {!!p.formats?.togo && (
                  <button
                    type="button"
                    className={selectedFormat === "togo" ? "fmtChoice fmtChoice--active" : "fmtChoice"}
                    onClick={() => setFormat(p.id, "togo")}
                  >
                    TO GO
                  </button>
                )}
              </div>
            )}

            <div className="cardFooter">
              <div className="price">{fmt(price)}</div>

              <div className="qtyGroup">
                <button className="qtyBtn" onClick={() => setQty(p.id, (n) => n - 1)} aria-label="Менше">
                  –
                </button>
                <span className="qtyVal">{qty}</span>
                <button className="qtyBtn" onClick={() => setQty(p.id, (n) => n + 1)} aria-label="Більше">
                  +
                </button>
              </div>

              <button className="buyBtn" onClick={handleBuy}>
                Додати в кошик
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

/* ================= МОДАЛКА ================= */
function Modal({ children, onClose }) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);