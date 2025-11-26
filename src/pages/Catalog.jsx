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
  const [format, setFormat] = useState("big"); // "big" | "to-go"

  const isToGo = format === "to-go";

  // Якщо є окрема ціна для TO GO — беремо її, інакше лишається стандартна
  const unitPrice =
    isToGo && typeof p.toGoPrice === "number" ? p.toGoPrice : p.price;

  // Назва і id в кошику — різні для BIG / TO GO
  const cartTitle = isToGo ? `${p.title} TO GO` : `${p.title} BIG`;
  const cartId = isToGo ? `${p.id}-to-go` : `${p.id}-big`;

  return (
    <article className="card">
      <div className="imgWrap">
        <img src={p.img} alt={p.title} loading="lazy" />
      </div>

      <h3 className="cardTitle">{p.title}</h3>
      {p.desc && <p className="cardDesc">{p.desc}</p>}

      {/* BIG / TO GO — текстовий перемикач у стилі заголовка */}
      <div className="formatRow">
        <button
          type="button"
          className={
            "fmtChoice" + (format === "big" ? " fmtChoice--active" : "")
          }
          onClick={() => setFormat("big")}
        >
          BIG
        </button>
        <button
          type="button"
          className={
            "fmtChoice" + (format === "to-go" ? " fmtChoice--active" : "")
          }
          onClick={() => setFormat("to-go")}
        >
          TO GO
        </button>
      </div>

      {/* Низ картки: ціна | кількість | Купити */}
      <div className="cardFooter">
        <div className="price">{unitPrice} грн</div>

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
            addItem(
              {
                ...p,
                id: cartId,
                title: cartTitle,
                price: unitPrice,
              },
              qty
            );
            open();
          }}
        >
          Купити
        </button>
      </div>
    </article>
  );
}