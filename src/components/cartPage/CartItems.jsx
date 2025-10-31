import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  ButtonGroup,
  Image,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import "./CartPage.css";

const CartItems = ({ items, onIncrease, onDecrease, onRemove }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  const handleIncreaseClick = (item) => {
    const isMaxQuantity =
      item.stock !== undefined && item.quantity >= item.stock;

    if (isMaxQuantity) {
      setToastMessage(
        `⚠️ Maximum stock reached! Only ${item.stock} unit${
          item.stock > 1 ? "s" : ""
        } available for "${item.title}".`
      );
      setShowToast(true);
      return;
    }

    onIncrease(item);
  };

  return (
    <>
      <div className="cart-items-list">
        {items.map((item) => {
          const isMaxQuantity =
            item.stock !== undefined && item.quantity >= item.stock;

          return (
            <Card
              key={`${item.id}_${item.size}`}
              className="cart-item-card shadow-lg border-0 mb-4"
            >
              <Card.Body>
                <Row className="align-items-center text-center text-md-start">
                  {/* Product Image */}
                  <Col xs={12} md={2} className="mb-3 mb-md-0">
                    <div className="image-wrapper">
                      <Image
                        src={
                          item.image || "https://via.placeholder.com/90?text=IMG"
                        }
                        alt={item.title}
                        fluid
                        rounded
                        className="cart-item-image"
                      />
                    </div>
                  </Col>

                  {/* Product Info */}
                  <Col xs={12} md={4}>
                    <h5 className="fw-bold text-dark mb-1">{item.title}</h5>
                    <p className="text-secondary small mb-1">
                      Size: {item.size}
                    </p>
                    <p className="text-warning fw-semibold mb-1 fs-5">
                      {formatPrice(item.price)}
                    </p>
                    <p className="text-muted small mb-0">
                      Subtotal:{" "}
                      <strong className="text-success">
                        {formatPrice(item.price * item.quantity)}
                      </strong>
                    </p>
                  </Col>

                  {/* Quantity Controls */}
                  <Col xs={12} md={3} className="mt-3 mt-md-0 text-center">
                    <ButtonGroup className="quantity-group">
                      <Button
                        variant="outline-dark"
                        onClick={() => onDecrease(item)}
                        disabled={item.quantity <= 1}
                      >
                        −
                      </Button>
                      <Button variant="dark" disabled className="qty-display">
                        {item.quantity}
                      </Button>
                      <Button
                        variant="outline-dark"
                        onClick={() => handleIncreaseClick(item)}
                        className="qty-btn"
                      >
                        +
                      </Button>
                    </ButtonGroup>
                  </Col>

                  {/* Remove Button */}
                  <Col
                    xs={12}
                    md={3}
                    className="mt-3 mt-md-0 text-md-end text-center"
                  >
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="remove-btn px-4 fw-semibold"
                      onClick={() => onRemove(item)}
                    >
                      🗑 Remove
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* 🔔 Toast Popup */}
      <ToastContainer position="bottom-center" className="p-3">
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={3000}
          autohide
          bg="dark"
          className="text-white border border-danger shadow"
        >
          <Toast.Header closeButton={false} className="bg-danger text-white">
            <strong className="me-auto">Stock Limit Reached</strong>
          </Toast.Header>
          <Toast.Body className="text-center fw-semibold">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  );
};

export default CartItems;
