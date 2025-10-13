// src/cart.jsx (повна, правильна версія)
import { createContext, useContext, useMemo, useState } from "react";

const CartCtx = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isOpen, setOpen] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const open  = () => setOpen(true);
  const close = () => { setOpen(false); setShowCheckout(false); };

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
    setOpen(true);
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
  const removeItem = (id) => setCart((prev) => prev.filter((it) => it.id !== id));
  const clear = () => setCart([]);

  const total = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart]);
  const count = useMemo(() => cart.reduce((s, it) => s + it.qty, 0), [cart]);

  return (
    <CartCtx.Provider
      value={{
        cart, addItem, changeQty, removeItem, clear,
        total, count, isOpen, open, close,
        showCheckout, setShowCheckout
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
const fix = (p) => (!p ? "" : p.startsWith("/img/") ? p : p.replace(/^public\//, "/"));

function CartModal() {
  const {
    cart, total, changeQty, removeItem, clear,
    isOpen, close, showCheckout, setShowCheckout
  } = useCart();

  if (!isOpen) return null;

  const fmt = (n) => `${n} грн`;
  const fix = (p) => (!p ? "" : p.startsWith("/img/") ? p : p.replace(/^public\//, "/"));

  function submit(e) {
    e.preventDefault();
    if (!cart.length) return;
    alert("Тут буде перехід на MonoPay (інвойс).");
    clear();
    close();
  }

  return (
    <div className="modalOverlay" onClick={close}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modalHead">
          {/* ✅ міняємо заголовок залежно від режиму */}
          <h3>{showCheckout ? "Оформлення" : "Кошик"}</h3>
          <button className="iconBtn" onClick={close} aria-label="Закрити">×</button>
        </div>

        {!showCheckout ? (
          /* ---------- РЕЖИМ КОШИКА ---------- */
          cart.length === 0 ? (
            <div className="cartEmpty">
              <p>Порожньо. Додайте щось смачне 🙂</p>
              <button className="btnGhost" onClick={close}>Повернутись до каталогу</button>
            </div>
          ) : (
            <>
              <ul className="cartList">
                {cart.map((it) => (
                  <li className="cartRow" key={it.id}>
                    <img className="thumb" src={fix(it.img)} alt={it.title} />

                    {/* Ліворуч — назва (одним рядком, з обрізанням, щоб усе рівно) */}
                    <div className="cTitle">{it.title}</div>

                    {/* Посередині — кількість */}
                    <div className="qtyRow">
                      <button className="qtyBtn" onClick={() => changeQty(it.id, -1)}>-</button>
                      <span className="qty">{it.qty}</span>
                      <button className="qtyBtn" onClick={() => changeQty(it.id, +1)}>+</button>
                    </div>

                    {/* Праворуч — сума по позиції */}
                    <div className="cPrice">{fmt(it.price * it.qty)}</div>

                    {/* Видалити */}
                    <button className="iconBtn rowX" onClick={() => removeItem(it.id)} aria-label="Видалити">×</button>
                  </li>
                ))}
              </ul>

              <div className="modalFoot">
                <div className="sum">Всього: <b>{fmt(total)}</b></div>
                <div className="actions">
                  <button className="btn ghost" onClick={close}>Продовжити покупки</button>
                  <button className="btn primary" onClick={() => setShowCheckout(true)}>Оформити</button>
                </div>
              </div>
            </>
          )
        ) : (
          /* ---------- РЕЖИМ ОФОРМЛЕННЯ ---------- */
          <>
            {/* Список позицій так само в одну лінію */}
            <div className="summaryInModal">
              {cart.map((it) => (
                <div className="summaryRow" key={it.id}>
                  <img className="thumb" src={fix(it.img)} alt={it.title} />
                  <div className="cTitle">{it.title}</div>
                  <div className="qtyRow">
                    <button className="qtyBtn" onClick={() => changeQty(it.id, -1)}>-</button>
                    <span className="qty">{it.qty}</span>
                    <button className="qtyBtn" onClick={() => changeQty(it.id, +1)}>+</button>
                  </div>
                  <div className="cPrice">{fmt(it.price * it.qty)}</div>
                </div>
              ))}
              <div className="summaryFoot">Всього: <b>{fmt(total)}</b></div>
            </div>

            {/* Форма оформлення з нормальними відступами */}
            <form className="formInModal" onSubmit={submit}>
              <div className="grid2">
                <div>
                  <label>Ім’я</label>
                  <input required placeholder="Ім’я отримувача" />
                </div>
                <div>
                  <label>Прізвище</label>
                  <input required placeholder="Прізвище" />
                </div>
              </div>

              <div>
                <label>Телефон</label>
                <input required placeholder="+380XXXXXXXXX" />
              </div>

              <div>
                <label>Місто / Відділення Нової Пошти</label>
                <input required placeholder="Київ, відділення №..." />
              </div>

              <div className="modalFoot">
                <div className="sum">Всього: <b>{fmt(total)}</b></div>
                <div className="actions">
                  <button type="button" className="btn ghost" onClick={() => setShowCheckout(false)}>
                    Назад до кошика
                  </button>
                  <button type="submit" className="btn primary">Підтвердити та оплатити</button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}