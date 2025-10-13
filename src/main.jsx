import React, { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/* ===== НАЛАШТУВАННЯ ===== */
const INSTAGRAM_URL = "https://www.instagram.com/kyivdinnerclub/";

/* ===== ТОВАРИ (картинки мають лежати в public/img/) ===== */
const PRODUCTS = [
  {
    id: "dark",
    title: "Dark Chocolate Dates",
    price: 300,
    img: "/img/dark.png",
    desc: "Фініки без кісточки, темний шоколад, арахісова паста, мальдонська сіль.",
  },
  {
    id: "milk",
    title: "Milk Chocolate Dates",
    price: 300,
    img: "/img/milk.png",
    desc: "Фініки без кісточки, молочний шоколад, арахісова паста, мальдонська сіль.",
  },
  {
    id: "white-pistachio",
    title: "White Chocolate & Pistachio Dates",
    price: 375,
    img: "/img/white-pistachio.png",
    desc: "Фініки без кісточки, білий шоколад, фісташкова паста, вершки.",
  },
  {
    id: "caramel",
    title: "Caramel Chocolate & Walnut Dates",
    price: 350,
    img: "/img/caramel.png",
    desc: "Карамельний шоколад, праліне з грецького горіха, волоський горіх.",
  },

  // 💚 Новий продукт — між Caramel і Mixed
  {
    id: "matcha-raspberry",
    title: "Matcha & Raspberry Dates",
    price: 375,
    img: "/img/matcha-raspberry.png",
    desc: "Фініки без кісточки, ганаш з малиновим пюре, білий шоколад з матча.",
  },

  {
    id: "mixed",
    title: "Mixed (Milk & Dark) Chocolate Dates",
    price: 300,
    img: "/img/mixed.png",
    desc: "Мікс молочного й темного шоколаду, арахісова паста, мальдонська сіль.",
  },
];
const fmt = (n) => `${n} грн`;

/* ================= APP ================= */
function App() {
  const [cart, setCart] = useState([]);            // [{id,title,price,img,qty}]
  const [cartOpen, setCartOpen] = useState(false);
  const [stage, setStage] = useState("cart");      // "cart" | "checkout"

  // Коли модалка відкрита — ховаємо IG/Cart і не даємо перекривати
  useEffect(() => {
    if (cartOpen) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [cartOpen]);

  function addItem(p, qty = 1) {
    setCart(prev => {
      const i = prev.findIndex(x => x.id === p.id);
      if (i === -1) return [...prev, { ...p, qty }];
      const copy = [...prev];
      copy[i] = { ...copy[i], qty: Math.min(99, copy[i].qty + qty) };
      return copy;
    });
    setCartOpen(true);
    setStage("cart");
  }

  function changeQty(id, d) {
    setCart(prev => prev.map(it => it.id===id ? {...it, qty: Math.max(1, Math.min(99, it.qty + d))} : it));
  }

  function removeItem(id){ setCart(prev => prev.filter(it => it.id!==id)); }
  function clearCart(){ setCart([]); }

  const total = useMemo(() => cart.reduce((s,it)=>s+it.price*it.qty,0), [cart]);
  const count = useMemo(() => cart.reduce((s,it)=>s+it.qty,0), [cart]);

  return (
    <>
      <Header count={count} onOpen={()=>setCartOpen(true)} />

      <main className="container">
        <Catalog products={PRODUCTS} onBuy={addItem} />
      </main>

      {cartOpen && (
        <Modal onClose={()=>{setCartOpen(false); setStage("cart");}}>
          <div className="modalHead">
            <h3>{stage === "cart" ? "Кошик" : "Оформлення"}</h3>
            <button className="iconBtn" onClick={()=>{setCartOpen(false); setStage("cart");}} aria-label="Закрити">×</button>
          </div>

          {stage === "cart" ? (
            cart.length === 0 ? (
              <div className="cartEmpty">
                <p>Порожньо. Додайте щось смачне 🙂</p>
                <button className="btn ghost" onClick={()=>setCartOpen(false)}>Повернутись до каталогу</button>
              </div>
            ) : (
              <>
                <ul className="cartList">
                  {cart.map(it => (
                    <li className="cartRow" key={it.id}>
                      <img className="thumb" src={it.img} alt={it.title} />
                      <div className="cTitle">{it.title}</div>
                      <div className="qtyRow">
                        <button className="qtyBtn" onClick={()=>changeQty(it.id,-1)} aria-label="Менше">–</button>
                        <span className="qty">{it.qty}</span>
                        <button className="qtyBtn" onClick={()=>changeQty(it.id,1)} aria-label="Більше">+</button>
                      </div>
                      <div className="cPrice">{fmt(it.price * it.qty)}</div>
                      <button className="iconBtn rowX" onClick={()=>removeItem(it.id)} aria-label="Видалити">×</button>
                    </li>
                  ))}
                </ul>

                <div className="modalFoot">
                  <div className="sum">Всього: <b>{fmt(total)}</b></div>
                  <div className="actions">
                    <button className="btn ghost" onClick={()=>setCartOpen(false)}>Продовжити покупки</button>
                    <button className="btn primary" onClick={()=>setStage("checkout")}>Оформити</button>
                  </div>
                </div>
              </>
            )
          ) : (
            <>
              <div className="summaryInModal">
                {cart.map(it => (
                  <div className="summaryRow" key={it.id}>
                    <img className="thumb" src={it.img} alt={it.title} />
                    <div className="cTitle">{it.title}</div>
                    <div className="qtyRow">
                      <button className="qtyBtn" onClick={()=>changeQty(it.id,-1)} aria-label="Менше">–</button>
                      <span className="qty">{it.qty}</span>
                      <button className="qtyBtn" onClick={()=>changeQty(it.id,1)} aria-label="Більше">+</button>
                    </div>
                    <div className="cPrice">{fmt(it.price * it.qty)}</div>
                  </div>
                ))}
                <div className="summaryFoot">Всього: <b>{fmt(total)}</b></div>
              </div>

              <form className="formInModal" onSubmit={(e)=>{e.preventDefault(); alert("Тут буде перехід на MonoPay."); clearCart(); setStage("cart"); setCartOpen(false);}}>
                <div className="grid2">
                  <div>
                    <label>Ім’я</label>
                    <input name="firstName" required placeholder="Ім’я отримувача" />
                  </div>
                  <div>
                    <label>Прізвище</label>
                    <input name="lastName" required placeholder="Прізвище" />
                  </div>
                </div>
                <div>
                  <label>Телефон</label>
                  <input name="phone" required placeholder="+380XXXXXXXXX" />
                </div>
                <div>
                  <label>Місто / Відділення Нової Пошти</label>
                  <input name="np" required placeholder="Київ, відділення №..." />
                </div>

                <div className="modalFoot">
                  <div className="sum">Всього: <b>{fmt(total)}</b></div>
                  <div className="actions">
                    <button type="button" className="btn ghost" onClick={()=>setStage("cart")}>Назад до кошика</button>
                    <button type="submit" className="btn primary">Підтвердити та оплатити</button>
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

/* ================= ХЕДЕР ================= */
function Header({ count, onOpen }) {
  const titleRef = useRef(null);
  const cartRef = useRef(null);
  const igRef = useRef(null);

  useEffect(()=>{
    const align=()=>{
      const t=titleRef.current, c=cartRef.current, ig=igRef.current;
      if (!t) return;

      // На мобільному — фіксуємо у верхньому правому куті (щоб не накладалось)
      if (window.innerWidth <= 640) {
        if (c) c.style.top = "12px";
        if (ig) ig.style.top = "12px";
        return;
      }
      // На десктопі — по центру заголовку
      const tb = t.getBoundingClientRect();
      const top = window.scrollY + tb.top + (tb.height - 28)/2;
      if (c) c.style.top = `${Math.round(top)}px`;
      if (ig) ig.style.top = `${Math.round(top)}px`;
    };

    align();
    window.addEventListener("resize",align);
    window.addEventListener("scroll",align,{passive:true});
    return ()=>{window.removeEventListener("resize",align); window.removeEventListener("scroll",align);};
  },[]);

  return (
    <header className="siteHeader">
      <div className="siteHeader__inner">
        <div className="brandWrap">
          <h1 ref={titleRef} className="brand">IT’S A DATE!</h1>
          <div className="subBrand">by Kyiv Dinner Club</div>
        </div>
      </div>

      <a
        ref={igRef}
        className="igFixed"
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
      >
        <InstagramSvg />
      </a>

      <button
        ref={cartRef}
        className="cartFixed"
        onClick={onOpen}
        aria-label="Кошик"
      >
        <CartSvg />
        {!!count && <span className="cartBadge">{count}</span>}
      </button>
    </header>
  );
}

/* ================= ІКОНКИ ================= */
const CartSvg = ({ size=28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Кошик">
    <path d="M6 6h14l-1.6 7.2a2 2 0 0 1-2 1.6H9.1a2 2 0 0 1-2-1.5L5.2 3.8H3"
      stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9.5" cy="19.5" r="1.5" fill="#111"/>
    <circle cx="16.5" cy="19.5" r="1.5" fill="#111"/>
  </svg>
);

const InstagramSvg = ({ size=28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Instagram">
    <rect x="3" y="3" width="18" height="18" rx="5" stroke="#111" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="3.8" stroke="#111" strokeWidth="1.8"/>
    <circle cx="17.3" cy="6.7" r="1.2" fill="#111"/>
  </svg>
);

/* ================= КАТАЛОГ ================= */
function Catalog({ products, onBuy }) {
  const [qtyMap, setQtyMap] = useState({});
  const setQty = (id, f) => setQtyMap(m => ({...m, [id]: Math.max(1, Math.min(99, f(m[id]||1)))}));

  return (
    <section className="grid">
      {products.map(p => (
        <article className="card" key={p.id}>
          <div className="imgWrap">
            <img src={p.img} alt={p.title} />
          </div>
          <h3 className="cardTitle">{p.title}</h3>
          {p.desc && <p className="cardDesc">{p.desc}</p>}
          <div className="cardFooter">
            <div className="price">{fmt(p.price)}</div>
            <div className="qtyGroup">
              <button className="qtyBtn" onClick={()=>setQty(p.id,n=>n-1)} aria-label="Менше">–</button>
              <span className="qtyVal">{qtyMap[p.id]||1}</span>
              <button className="qtyBtn" onClick={()=>setQty(p.id,n=>n+1)} aria-label="Більше">+</button>
            </div>
            <button className="buyBtn" onClick={()=>onBuy(p, qtyMap[p.id]||1)}>Купити</button>
          </div>
        </article>
      ))}
    </section>
  );
}

/* ================= МОДАЛКА ================= */
function Modal({ children, onClose }) {
  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode><App /></StrictMode>
);