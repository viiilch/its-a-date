function Card({ p }) {
  const { addItem, open } = useCart();

  const [qty, setQty] = useState(1);

  // ✅ TO GO є тільки якщо в продукті є toGoPrice
  const hasToGo = typeof p.toGoPrice === "number";

  const [format, setFormat] = useState("big"); // "big" | "to-go"

  // ✅ якщо товар без TO GO — не даємо залипнути на to-go
  useEffect(() => {
    if (!hasToGo && format === "to-go") setFormat("big");
  }, [hasToGo, format]);

  const isToGo = format === "to-go";

  const unitPrice = isToGo ? p.toGoPrice : p.price;
  const cartTitle = isToGo ? `${p.title} TO GO` : p.title;

  // ✅ для товарів без TO GO (стікерпак) — id без "-big"
  const cartId = isToGo
    ? `${p.id}-to-go`
    : hasToGo
      ? `${p.id}-big`
      : p.id;

  return (
    <article className="card">
      <div className="imgWrap">
        <img src={p.img} alt={p.title} loading="lazy" />
      </div>

      <h3 className="cardTitle">{p.title}</h3>
      {p.desc && <p className="cardDesc">{p.desc}</p>}

      {/* ✅ або показуємо розмір (для стікерпаку), або BIG/TO GO (для фініків) */}
      {p.sizeLabel ? (
        <div className="sizeRow">{p.sizeLabel}</div>
      ) : (
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

          {hasToGo && (
            <button
              type="button"
              className={
                "fmtChoice" + (format === "to-go" ? " fmtChoice--active" : "")
              }
              onClick={() => setFormat("to-go")}
            >
              TO GO
            </button>
          )}
        </div>
      )}

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
              { ...p, id: cartId, title: cartTitle, price: unitPrice },
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