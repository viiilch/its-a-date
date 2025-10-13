import Header from "./components/Header.jsx";
import Catalog from "./pages/Catalog.jsx";
import { CartProvider, CartModal } from "./cart.jsx";

export default function App() {
  return (
    <CartProvider>
      <Header />
      <main className="container">
        <Catalog />
      </main>
      <CartModal />
      <footer className="footer">© 2025 IT’S A DATE by Kyiv Dinner Club</footer>
    </CartProvider>
  );
}