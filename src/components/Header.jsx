import { useEffect, useRef } from "react";
import { useCart } from "../cart.jsx";

const CartSvg = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Кошик">
    <path d="M6 6h14l-1.6 7.2a2 2 0 0 1-2 1.6H9.1a2 2 0 0 1-2-1.5L5.2 3.8H3"
      stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9.5" cy="19.5" r="1.5" fill="#111"/>
    <circle cx="16.5" cy="19.5" r="1.5" fill="#111"/>
  </svg>
);

export default function Header() {
  const { count, open } = useCart();
  const titleRef = useRef(null);
  const cartRef  = useRef(null);

  useEffect(() => {
    const align = () => {
      const t = titleRef.current, c = cartRef.current;
      if (!t || !c) return;
      const tb = t.getBoundingClientRect();
      const cb = c.getBoundingClientRect();
      const y = window.scrollY + tb.top + (tb.height - cb.height)/2;
      c.style.top = `${Math.round(y)}px`;
    };
    align();
    window.addEventListener("resize", align);
    window.addEventListener("scroll", align, { passive: true });
    return () => {
      window.removeEventListener("resize", align);
      window.removeEventListener("scroll", align);
    };
  }, []);

  return (
    <header className="siteHeader">
      <div className="siteHeader__inner">
        <div className="brandWrap">
          <h1 ref={titleRef} className="brand">IT’S A DATE!</h1>
          <div className="subBrand">by Kyiv Dinner Club</div>
        </div>
      </div>

      <button
        ref={cartRef}
        type="button"
        className="cartFixed"
        onClick={open}
        aria-label="Відкрити кошик"
      >
        <CartSvg />
        {!!count && <span className="cartBadge">{count}</span>}
      </button>
    </header>
  );
}