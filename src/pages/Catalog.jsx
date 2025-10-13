// src/pages/Catalog.jsx
import { useState } from "react";
import products from "../products.js";
import { useCart } from "../cart.jsx";

export default function Catalog() {
  return (
    <section className="grid">
      {products.map((p) => (
        <Card key={p.id} p={p} />
      ))}
    </section>
  );
}

function Card({ p }) {
  const { addItem, open } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <article className="card">
      <div className="imgWrap">
        <img src={p.img} alt={p.title} loading="lazy" />
      </div>

      <h3 className="cardTitle">{p.title}</h3>
      {p.desc && <p className="cardDesc">{p.desc}</p>}

      {/* Футер у три колонки: ціна | степпер | Купити */}
      <div className="cardFooter">
        <div className="price">{p.price} грн</div>

        <div className="qtyGroup">
          <button
            className="qtyBtn"
            aria-label="Менше"
            onClick={() => setQty((n) => Math.max(1, n - 1))}
          >
            –
          </button>
          <span className="qtyVal">{qty}</span>
          <button
            className="qtyBtn"
            aria-label="Більше"
            onClick={() => setQty((n) => Math.min(99, n + 1))}
          >
            +
          </button>
        </div>

        <button
          className="buyBtn"
          onClick={() => {
            addItem(p, qty);
            open();
          }}
        >
          Купити
        </button>
      </div>
    </article>
  );
}