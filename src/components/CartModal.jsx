// src/components/CartModal.jsx
import { useCart } from "../cart.jsx";
import { useNavigate } from "react-router-dom";

function qtySrc(imgPath = "") {
  // Показуємо фото навіть якщо шлях без початкового слеша або з "public/"
  if (!imgPath) return "";
  if (imgPath.startsWith("http")) return imgPath;
  const p = imgPath.replace(/^public\//, ""); // public/ -> /
  return p.startsWith("/") ? p : `/${p}`;
}

export default function CartModal() {
  const { cart, changeQty, removeItem, total, isOpen, closeCart } = useCart();
  const nav = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="cartOverlay" onClick={closeCart}>
      <div className="cartModal" onClick={(e) => e.stopPropagation()}>
        {/* Шапка */}
        <div className="cartHead">
          <h3>Кошик</h3>
          <button className="cartX" onClick={closeCart} aria-label="Закрити">×</button>
        </div>

        {/* Список */}
        <div className="cartList">
          {cart.length === 0 ? (
  <div className="cartEmpty">
    <p>Порожньо. Додайте щось смачне 🙂</p>
    <button className="btnGhost" onClick={close}>Повернутись до каталогу</button>
  </div>
) : (
  <>
    {/* решта коду залишається */}
  </>
)}

          {cart.map((it) => (
            <div className="cartRow" key={it.id}>
              <div className="cartThumbWrap">
                <img
                  className="cartThumb"
                  src={qtySrc(it.img)}
                  alt={it.title}
                  onError={(e)=>{e.currentTarget.style.opacity=".2"}}
                />
              </div>

              <div className="cartTitle">
                <div className="cartName">{it.title}</div>
                {it.desc ? <div className="cartDesc">{it.desc}</div> : null}
              </div>

              <div className="cartQty">
                <button aria-label="Менше" onClick={() => changeQty(it.id, -1)}>-</button>
                <span>{it.qty}</span>
                <button aria-label="Більше" onClick={() => changeQty(it.id, +1)}>+</button>
              </div>

              <div className="cartPrice">{it.price * it.qty} грн</div>

              <button
                className="cartRemove"
                aria-label="Прибрати позицію"
                onClick={() => removeItem(it.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Футер */}
        <div className="cartFoot">
          <div className="cartSum">
            Всього:&nbsp;<strong>{total} грн</strong>
          </div>
          <div className="cartActions">
            <button className="btn ghost" onClick={closeCart}>Продовжити покупки</button>
            <button
              className="btn"
              onClick={() => {
                closeCart();
                nav("/checkout");
              }}
            >
              Оформити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}