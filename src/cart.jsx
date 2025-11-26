// src/cart.jsx
import { createContext, useContext, useMemo, useState } from "react";

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const open = () => {
    setOpen(true);
    document.body.classList.add("modal-open");
  };

  const close = () => {
    setOpen(false);
    setShowCheckout(false);
    document.body.classList.remove("modal-open");
  };

  function addItem(product, qty = 1) {
    setCart((prev) => {
      const found = prev.find((it) => it.id === product.id);
      if (found) {
        return prev.map((it) =>
          it.id === product.id
            ? { ...it, qty: Math.min(99, it.qty + qty) }
            : it
        );
      }
      return [...prev, { ...product, qty }];
    });
    open();
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((it) =>
          it.id === id
            ? { ...it, qty: Math.max(1, Math.min(99, it.qty + delta)) }
            : it
        )
        .filter((it) => it.qty > 0)
    );
  }

  const removeItem = (id) =>
    setCart((prev) => prev.filter((it) => it.id !== id));

  const clear = () => setCart([]);

  const total = useMemo(
    () => cart.reduce((s, it) => s + it.price * it.qty, 0),
    [cart]
  );

  const count = useMemo(
    () => cart.reduce((s, it) => s + it.qty, 0),
    [cart]
  );

  return (
    <CartCtx.Provider
      value={{
        cart,
        addItem,
        changeQty,
        removeItem,
        clear,
        total,
        count,
        isOpen,
        open,
        close,
        showCheckout,
        setShowCheckout,
      }}
    >
      {children}
      <CartModal />
    </CartCtx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

const fmt = (n) => `${n} грн`;
const fix = (p) =>
  !p ? "" : p.startsWith("/img/") ? p : p.replace(/^public\//, "/");

function CartModal() {
  const {
    cart,
    total,
    changeQty,
    removeItem,
    clear,
    isOpen,
    close,
    showCheckout,
    setShowCheckout,
  } = useCart();

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function submit(e) {
    e.preventDefault();
    if (!cart.length || submitting) return;

    const fd = new FormData(e.currentTarget);
    const customer = {
      firstName: (fd.get("firstName") || "").trim(),
      lastName: (fd.get("lastName") || "").trim(),
      phone: (fd.get("phone") || "").trim(),
      np: (fd.get("np") || "").trim(),
    };

    const safeCart = cart.map((it) => ({
      id: it.id,
      title: it.title,
      price: it.price,
      qty: it.qty,
      img: it.img || "",
    }));

    try {
      setSubmitting(true);
      const resp = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: safeCart, customer }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.checkoutUrl) {
        console.error("MonoPay error:", data);
        alert(
          "Помилка створення оплати. Спробуйте ще раз або напишіть нам в Instagram."
        );
        setSubmitting(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("Помилка мережі. Будь ласка, спробуйте ще раз.");
      setSubmitting(false);
    }
  }

  return (
    <div className="modalOverlay" onClick={close}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHead">
          <h3>{showCheckout ? "Оформлення" : "Кошик"}</h3>
          <button className="iconBtn" onClick={close} aria-label="Закрити">
            ×
          </button>
        </div>

        {!showCheckout ? (
          // ---------- РЕЖИМ КОШИКА ----------
          cart.length === 0 ? (
            <div className="cartEmpty">
              <p>Порожньо. Додайте щось смачне 🙂</p>
              <button className="btn ghost" onClick={close}>
                Повернутись до каталогу
              </button>
            </div>
          ) : (
            <>
              <ul className="cartList">
                {cart.map((it) => (
                  <li className="cartRow" key={it.id}>
                    <img className="thumb" src={fix(it.img)} alt={it.title} />

                    <div className="cTitle">{it.title}</div>

                    <div className="qtyRow">
                      <button
                        className="qtyBtn"
                        onClick={() => changeQty(it.id, -1)}
                      >
                        -
                      </button>
                      <span className="qty">{it.qty}</span>
                      <button
                        className="qtyBtn"
                        onClick={() => changeQty(it.id, +1)}
                      >
                        +
                      </button>
                    </div>

                    <div className="cPrice">{fmt(it.price * it.qty)}</div>

                    <button
                      className="iconBtn rowX"
                      onClick={() => removeItem(it.id)}
                      aria-label="Видалити"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div className="modalFoot">
                <div className="sum">
                  Всього: <b>{fmt(total)}</b>
                </div>
                <div className="actions">
                  <button className="btn ghost" onClick={close}>
                    Продовжити покупки
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => setShowCheckout(true)}
                  >
                    Оформити
                  </button>
                </div>
              </div>
            </>
          )
        ) : (
          // ---------- РЕЖИМ ОФОРМЛЕННЯ ----------
          <>
            <div className="summaryInModal">
              {cart.map((it) => (
                <div className="summaryRow" key={it.id}>
                  <img className="thumb" src={fix(it.img)} alt={it.title} />
                  <div className="cTitle">{it.title}</div>
                  <div className="qtyRow">
                    <button
                      className="qtyBtn"
                      onClick={() => changeQty(it.id, -1)}
                    >
                      -
                    </button>
                    <span className="qty">{it.qty}</span>
                    <button
                      className="qtyBtn"
                      onClick={() => changeQty(it.id, +1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="cPrice">{fmt(it.price * it.qty)}</div>
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
                  <input
                    id="firstName"
                    name="firstName"
                    required
                    placeholder="Ім’я отримувача"
                  />
                </div>
                <div>
                  <label htmlFor="lastName">Прізвище</label>
                  <input
                    id="lastName"
                    name="lastName"
                    required
                    placeholder="Прізвище"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone">Телефон</label>
                <input
                  id="phone"
                  name="phone"
                  required
                  placeholder="+380XXXXXXXXX"
                />
              </div>

              <div>
                <label htmlFor="np">Місто / Відділення Нової Пошти</label>
                <input
                  id="np"
                  name="np"
                  required
                  placeholder="Київ, відділення №..."
                />
              </div>

              <div className="modalFoot">
                <div className="sum">
                  Всього: <b>{fmt(total)}</b>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setShowCheckout(false)}
                  >
                    Назад до кошика
                  </button>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Переходимо до оплати..."
                      : "Підтвердити та оплатити"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}