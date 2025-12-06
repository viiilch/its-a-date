// src/components/Header.jsx
import React from "react";
import { InstagramSvg, CartSvg } from "./Icons";

function Header({ count, onOpen }) {
  return (
    <header className="siteHeader">
      <div className="siteHeader__inner">
        <div className="brandWrap">
          <h1 className="brand">
            <img
              src="/img/its-a-date-logo.svg"
              alt="IT’S A DATE!"
              className="brandLogo"
            />
          </h1>
          <div className="subBrand">Kyiv Dinner Club</div>
        </div>

        {/* Іконки у правому кутку (десктоп), під логотипом по центру (мобілка) */}
        <div className="headerIcons">
          <a
            className="igFixed"
            href="https://www.instagram.com/kyivdinnerclub/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <InstagramSvg />
          </a>

          <button
            className="cartFixed"
            onClick={onOpen}
            aria-label="Кошик"
          >
            <CartSvg />
            {!!count && <span className="cartBadge">{count}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;