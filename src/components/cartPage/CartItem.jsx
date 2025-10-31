import React from "react";
import { Card, Row, Col, Button, ButtonGroup, Image } from "react-bootstrap";

const CartItem = ({ item, onIncrease, onDecrease, onRemove }) => {
  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card className="cart-item-card shadow-sm border-0 mb-3">
      <Card.Body>
        <Row className="align-items-center text-center text-md-start">
          {/* Product Image */}
          <Col xs={12} md={2} className="mb-3 mb-md-0">
            <Image
              src={item.image || "https://via.placeholder.com/100?text=IMG"}
              alt={item.title}
              fluid
              rounded
              style={{ maxHeight: "90px", objectFit: "contain" }}
            />
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
            <ButtonGroup>
              <Button
                variant="outline-secondary"
                onClick={() => onDecrease(item)}
                disabled={item.quantity <= 1}
              >
                −
              </Button>
              <Button variant="dark" disabled>
                {item.quantity}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => onIncrease(item)}
              >
                +
              </Button>
            </ButtonGroup>
          </Col>

          {/* Remove Button */}
          <Col xs={12} md={3} className="mt-3 mt-md-0 text-md-end text-center">
            <Button
              variant="danger"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => onRemove(item)}
            >
              🗑 Remove
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default CartItem;
