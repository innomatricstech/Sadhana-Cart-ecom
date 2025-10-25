import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { addToCart, removeFromCart, clearCart, clearCartError } from "../../redux/cartSlice";
import { Container, Row, Col, Card, Button, Toast, ToastContainer } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import CartItem from "./CartItem";

const MAX_UNITS_PER_ITEM = 5;

const EmptyCart = () => (
  <Container className="text-center py-5">
    <h2 className="text-muted mb-4">Your Cart is Empty 🛒</h2>
    <p>Looks like you haven't added anything to your cart yet.</p>
    <Link to="/" className="btn btn-primary mt-3">Start Shopping</Link>
  </Container>
);

const CartPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = getAuth();

  const cartItems = useSelector((state) => state.cart.items || []);
  const errorId = useSelector((state) => state.cart.errorId);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Detect user login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, [auth]);

  // Toast for max units
  useEffect(() => {
    if (errorId) {
      const item = cartItems.find(i => i.id === errorId);
      if (item) {
        setToastMessage(`We're sorry! Only ${MAX_UNITS_PER_ITEM} unit(s) allowed in each order.`);
        setShowToast(true);
        dispatch(clearCartError());
      }
    }
  }, [errorId, cartItems, dispatch]);

  const handleIncrease = (item) => dispatch(addToCart({ ...item, quantity: 1 }));
  const handleDecrease = (item) => { if (item.quantity > 1) dispatch(removeFromCart({ id: item.id, quantity: 1 })); };
  const handleRemove = (item) => dispatch(removeFromCart({ id: item.id }));
  const handleClear = () => dispatch(clearCart());

  const totalPrice = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

  const handleCheckout = () => {
    if (isLoggedIn) navigate("/checkout");
    else navigate("/login", { state: { from: "/checkout" } });
  };

  if (cartItems.length === 0) return <EmptyCart />;

  return (
    <Container className="cart-container py-4">
      <h2 className="cart-heading mb-4 text-center text-dark">🛍️ Your Shopping Cart</h2>

      <Row className="g-4">
        {cartItems.map((item) => (
          <Col xs={12} key={item.id}>
            <CartItem
              item={item}
              onIncrease={handleIncrease}
              onDecrease={handleDecrease}
              onRemove={handleRemove}
            />
          </Col>
        ))}
      </Row>

      <Row className="justify-content-center mt-5">
        <Col xs={12} md={8} lg={6}>
          <Card className="cart-summary-card shadow-lg border-0">
            <Card.Body className="text-center">
              <h3 className="fw-bold mb-3 text-dark">
                Total: <span className="text-warning">{formatPrice(totalPrice)}</span>
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
            <strong className="me-auto">Quantity Limit Reached</strong>
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
