import { useState } from "react";

/* IT'S A DATE! by Kyiv Dinner Club — мінімальний чистий лендінг без Tailwind */

const PRODUCTS = [
  { id: "dark",  name: "Dark Chocolate Dates",
    description: "Фініки без кісточки, темний шоколад, арахісова паста, мальдонська сіль.",
    price: 300, image: "/img/dark.png" },
  { id: "milk",  name: "Milk Chocolate Dates",
    description: "Фініки без кісточки, молочний шоколад, арахісова паста, мальдонська сіль.",
    price: 300, image: "/img/milk.png" },
  { id: "white-pistachio", name: "White Chocolate & Pistachio Dates",
    description: "Фініки без кісточки, білий шоколад, фісташкова паста, вершки.",
    price: 375, image: "/img/white-pistachio.png" },
  { id: "caramel", name: "Caramel Chocolate & Walnut Dates",
    description: "Фініки без кісточки, карамельний шоколад, праліне з волоського горіха (кориця, волоський горіх, цукор).",
    price: 350, image: "/img/caramel.png" },
  { id: "mixed", name: "Mixed (Milk & Dark) Chocolate Dates",
    description: "Фініки без кісточки, темний і молочний шоколад, арахісова паста, мальдонська сіль.",
    price: 300, image: "/img/mixed.png" },
];

export default function DatesLanding() {
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState({ name: "", phone: "", shipping: "" });

  const total = () => (selected ? selected.price * Math.max(1, qty) : 0);

  const submit = (e) => {
    e.preventDefault();
    if (!selected) return alert("Оберіть продукт.");
    if (!form.name || !form.phone || !form.shipping)
      return alert("Заповніть ім’я, телефон і місто/відділення НП.");
    alert(`Дякуємо!\nТовар: ${selected.name}\nКількість: ${qty}\nСума: ${total()} грн`);
    setSelected(null); setQty(1); setForm({ name: "", phone: "", shipping: "" });
  };

  return (
    <div className="page">
      <header className="hero">
        <h1>IT&apos;S A DATE</h1>
        <p className="subtitle">by Kyiv Dinner Club</p>
        <p className="tag">Свіжі фініки ручної роботи · Доставка Новою Поштою</p>
      </header>

      <main className="layout">
        <section className="products">
          <div className="grid">
            {PRODUCTS.map((p) => (
              <article key={p.id} className="card">
                <div className="imgBox">
                  <img
                    src={p.image}
                    alt={p.name}
                    onError={(e) => { e.currentTarget.style.opacity = "0.35"; }}
                  />
                </div>
                <div className="cardBody">
                  <h3>{p.name}</h3>
                  <p className="desc">{p.description}</p>
                  <div className="row">
                    <div className="price">{p.price} грн</div>
                    <button className="btn" onClick={() => { setSelected(p); setQty(1); }}>
                      Купити
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="checkout">
          <div className="box">
            <h3>Оформлення</h3>

            {selected ? (
              <div className="sel">
                <div className="selName">{selected.name}</div>
                <div className="selDesc">{selected.description}</div>
                <div className="selPrice">{selected.price} грн</div>
              </div>
            ) : (
              <div className="hint">Оберіть продукт ліворуч.</div>
            )}

            <form onSubmit={submit} className="form">
              <label>Ім’я
                <input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} placeholder="Ім’я отримувача" />
              </label>
              <label>Телефон
                <input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} placeholder="+380XXXXXXXXX" />
              </label>
              <label>Місто / Відділення НП
                <input value={form.shipping} onChange={(e)=>setForm({...form, shipping: e.target.value})} placeholder="Київ, відділення №..." />
              </label>
              <label>Кількість
                <input type="number" min="1" value={qty} onChange={(e)=>setQty(Number(e.target.value))} />
              </label>

              <div className="row">
                <div className="total">Всього: <b>{total()} грн</b></div>
                <button className="btn" type="submit" disabled={!selected}>Підтвердити</button>
              </div>
              <div className="note">Після підтвердження ми зателефонуємо, щоб узгодити оплату та доставку.</div>
            </form>
          </div>
        </aside>
      </main>

      <footer className="footer">© {new Date().getFullYear()} IT&apos;S A DATE! by Kyiv Dinner Club</footer>
    </div>
  );
}