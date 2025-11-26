// src/pages/Catalog.jsx
import { useState } from "react";
import products from "../products.js";
import { useCart } from "../cart.jsx";

// Мапа цін для BIG / TO GO
const FORMAT_PRICES = {
  dark: { big: 300, togo: 110 },
  milk: { big: 300, togo: 110 },
  "white-pistachio": { big: 375, togo: 130 },
  caramel: { big: 350, togo: 120 },
  "matcha-raspberry": { big: 375, togo: 140 },
  mixed: { big: 300, togo: 110 },
};

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
  const [format, setFormat] = useState("big"); // "big" | "togo"

  const prices = FORMAT_PRICES[p.id] || { big: p.price, togo: p.price };
  const displayPrice = format === "togo" ? prices.togo : prices.big;

  function handleBuy() {
    // окремі товари в кошику для BIG і TO GO
    const chosenId = `${p.id}-${format}`;
    const chosenTitle =
      format === "togo" ? `${p.title} TO GO` : `${p.title} BIG`;

    const item = {
      ...p,
      id: chosenId,
      title: chosenTitle,
      price: displayPrice,
    };

    addItem(item, qty);
    open();
  }

  return (
    <article className="card">
      <div className="imgWrap">
        <img src={p.img} alt={p.title} loading="lazy" />
      </div>

      <h3 className="cardTitle">{p.title}</h3>
      {p.desc && <p className="cardDesc">{p.desc}</p>}

      {/* Блок формату BIG / TO GO */}
      <div className="formatBlock">
        <div className="formatLabel">ФОРМАТ</div>
        <div className="formatRow">
          <button
            type="button"
            className={
              format === "big" ? "fmtBtn fmtBtn--active" : "fmtBtn"
            }
            onClick={() => setFormat("big")}
          >
            BIG
          </button>
          <button
            type="button"
            className={
              format === "togo" ? "fmtBtn fmtBtn--active" : "fmtBtn"
            }
            onClick={() => setFormat("togo")}
          >
            TO GO
          </button>
        </div>
      </div>

      {/* Футер: ціна / степпер / купити */}
      <div className="cardFooter">
        <div className="price">{displayPrice} грн</div>

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

        <button className="buyBtn" onClick={handleBuy}>
          Купити
        </button>
      </div>
    </article>
  );
}