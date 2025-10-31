import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  addToCart,
  removeFromCart,
  clearCart,
  clearCartError,
} from "../../redux/cartSlice";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import CartItems from "./CartItems";

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = getAuth();

  const cartItems = useSelector((state) => state.cart.items || []);
  const errorId = useSelector((state) => state.cart.errorId);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [stockData, setStockData] = useState({});

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Detect login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, [auth]);

  // 🧠 Fetch stock for each product (take from first sizevariant)
  useEffect(() => {
    const fetchStocks = async () => {
      const newStockData = {};

      for (const item of cartItems) {
        try {
          const docRef = doc(db, "products", item.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();

            let stockValue = 0;

            // ✅ Prefer first sizevariant stock if available
            if (
              Array.isArray(data.sizevariants) &&
              data.sizevariants.length > 0
            ) {
              stockValue = data.sizevariants[0].stock ?? 0;
            } else {
              stockValue = data.stock ?? 0;
            }

            newStockData[item.id] = stockValue;
          } else {
            newStockData[item.id] = 0;
          }
        } catch (error) {
          console.error(`Error fetching stock for ${item.id}:`, error);
          newStockData[item.id] = 0;
        }
      }

      setStockData(newStockData);
    };

    if (cartItems.length > 0) fetchStocks();
  }, [cartItems]);

  // Show toast when limit reached
  useEffect(() => {
    if (errorId) {
      const item = cartItems.find((i) => i.id === errorId);
      if (item) {
        setToastMessage(
          `You've reached the maximum stock limit for "${item.title}".`
        );
        setShowToast(true);
        dispatch(clearCartError());
      }
    }
  }, [errorId, cartItems, dispatch]);

  // ➕ Increase quantity with stock limit
  const handleIncrease = (item) => {
    const stock = stockData[item.id] ?? 0;

    if (item.quantity >= stock) {
      setToastMessage(
        `Only ${stock} unit${stock > 1 ? "s" : ""} available for "${item.title}".`
      );
      setShowToast(true);
      return;
    }

    dispatch(addToCart({ ...item, quantity: 1 }));
  };

  // ➖ Decrease quantity
  const handleDecrease = (item) => {
    if (item.quantity > 1) {
      dispatch(removeFromCart({ id: item.id, size: item.size, quantity: 1 }));
    }
  };

  // 🗑 Remove item
  const handleRemove = (item) => {
    dispatch(removeFromCart({ id: item.id, size: item.size }));
  };

  // 🧹 Clear cart
  const handleClear = () => dispatch(clearCart());

  // 💰 Total price
  const totalPrice = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  // 🛒 Checkout
  const handleCheckout = () => {
    if (isLoggedIn) navigate("/checkout");
    else navigate("/login", { state: { from: "/checkout" } });
  };

  // 🕳 Empty Cart View
  if (cartItems.length === 0)
    return (
      <Container className="text-center py-5">
        <h2 className="text-muted mb-4">Your Cart is Empty 🛒</h2>
        <p>Looks like you haven't added anything yet.</p>
        <Link to="/" className="btn btn-primary mt-3">
          Start Shopping
        </Link>
      </Container>
    );

  return (
    <Container className="cart-container py-4">
      <h2 className="cart-heading mb-4 text-center text-dark">
        🛍️ Your Shopping Cart
      </h2>

      {/* 🧩 Cart Items */}
      <Row className="g-4">
        <Col xs={12}>
          <CartItems
            items={cartItems.map((i) => ({
              ...i,
              stock: stockData[i.id] ?? 0,
            }))}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
          />
        </Col>
      </Row>

      {/* 🧾 Summary Section */}
      <Row className="justify-content-center mt-5">
        <Col xs={12} md={8} lg={6}>
          <Card className="cart-summary-card shadow-lg border-0">
            <Card.Body className="text-center">
              <h3 className="fw-bold mb-3 text-dark">
                Total:{" "}
                <span className="text-warning">{formatPrice(totalPrice)}</span>
              </h3>
              <div className="d-flex justify-content-center gap-3">
                <Button
                  variant="warning"
                  className="checkout-btn px-4 fw-semibold"
                  onClick={handleCheckout}
                >
                  Proceed to Buy
                </Button>
                <Button
                  variant="outline-danger"
                  className="clear-btn px-4 fw-semibold"
                  onClick={handleClear}
                >
                  Clear Cart
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* 🔔 Toast for stock limit */}
      <ToastContainer position="bottom-center" className="p-3">
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={3000}
          autohide
          bg="dark"
          className="text-white"
        >
          <Toast.Header closeButton={false} className="bg-danger text-white">
            <strong className="me-auto">Stock Limit Reached</strong>
          </Toast.Header>
          <Toast.Body className="text-center fw-semibold">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </Container>
  );
};

export default CartPage;
