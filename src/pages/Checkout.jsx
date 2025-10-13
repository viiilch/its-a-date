import { useCart, fmt, fixPublicPath } from "../cart.jsx";
import { useState } from "react";

export default function Checkout() {
  const { cart, changeQty, removeItem, total, clear } = useCart();
  const [form, setForm] = useState({ firstName:"", lastName:"", phone:"", shipping:"" });

  function submit(e) {
    e.preventDefault();
    if (!cart.length) return;
    // TODO: тут вставиш Monobank посилання / монопей
    alert("Тут має бути перехід на оплату Monobank. Дані збережено у пам’яті (симуляція).");
    clear();
  }

  return (
    <>
      <section className="checkout">
        <h2 className="h2 center">Оформлення замовлення</h2>

        <div className="summary">
          {cart.map(it => (
            <div className="summaryRow" key={it.id}>
              <img className="thumb" src={fixPublicPath(it.img)} alt={it.title} />
              <div className="cMeta">
                <div className="cTitle">{it.title}</div>
                <div className="qtyRow">
                  <button className="qtyBtn" onClick={()=>changeQty(it.id,-1)}>-</button>
                  <span className="qty">{it.qty}</span>
                  <button className="qtyBtn" onClick={()=>changeQty(it.id,1)}>+</button>
                </div>
              </div>
              <div className="cPrice">{fmt(it.price * it.qty)}</div>
              <button className="iconBtn" onClick={()=>removeItem(it.id)} aria-label="Видалити">×</button>
            </div>
          ))}
          <div className="summaryFoot">
            Всього: <b>{fmt(total)}</b>
          </div>
        </div>

        <form className="form" onSubmit={submit}>
          <div className="grid2">
            <div>
              <label>Ім’я</label>
              <input
                value={form.firstName}
                onChange={(e)=>setForm({...form, firstName:e.target.value})}
                placeholder="Ім’я отримувача"
                required
              />
            </div>
            <div>
              <label>Прізвище</label>
              <input
                value={form.lastName}
                onChange={(e)=>setForm({...form, lastName:e.target.value})}
                placeholder="Прізвище"
                required
              />
            </div>
          </div>

          <div>
            <label>Телефон</label>
            <input
              value={form.phone}
              onChange={(e)=>setForm({...form, phone:e.target.value})}
              placeholder="+380XXXXXXXXX"
              required
            />
          </div>

          <div>
            <label>Місто / Відділення Нової Пошти</label>
            <input
              value={form.shipping}
              onChange={(e)=>setForm({...form, shipping:e.target.value})}
              placeholder="Київ, відділення №..."
              required
            />
          </div>

          <div className="center">
            <button className="btn xl primary" type="submit">Підтвердити та оплатити</button>
          </div>
        </form>
      </section>
    </>
  );
}