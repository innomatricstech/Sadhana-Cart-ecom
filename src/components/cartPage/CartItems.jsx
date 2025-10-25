// src/components/Cart/CartItems.jsx
import React from "react";
import { Card, Row, Col, Button, ButtonGroup, Image } from "react-bootstrap";
import "./CartPage.css";

const CartItems = ({ items, onIncrease, onDecrease, onRemove }) => {
  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="cart-items-list">
      {items.map((item) => (
        <Card key={item.id} className="cart-item-card shadow-lg border-0 mb-4">
          <Card.Body>
            <Row className="align-items-center text-center text-md-start">
              {/* Product Image */}
              <Col xs={12} md={2} className="mb-3 mb-md-0">
                <div className="image-wrapper">
                  <Image
                    src={item.image}
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
  disabled={item.quantity <= 1} // Prevent going below 1
>
  −
</Button>
                  <Button variant="dark" disabled className="qty-display">
                    {item.quantity}
                  </Button>
                  <Button
                    variant="outline-dark"
                    onClick={() => onIncrease(item)}
                    className="qty-btn"
                  >
                    +
                  </Button>
                </ButtonGroup>
              </Col>

              {/* Remove Button */}
              <Col xs={12} md={3} className="mt-3 mt-md-0 text-md-end text-center">
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
      ))}
    </div>
  );
};
export default CartItems;
