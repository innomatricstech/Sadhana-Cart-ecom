import React from "react";
import { Card, Button, Row, Col, Image, ButtonGroup } from "react-bootstrap";

// அதிகபட்ச யூனிட் வரம்பு
const MAX_UNITS_PER_ITEM = 5;

const CartItem = ({ item, onIncrease, onDecrease, onRemove }) => {
  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);

  // + பட்டனை முடக்க நிபந்தனை
  const isMaxQuantity = item.quantity >= MAX_UNITS_PER_ITEM;

  return (
    <Card className="mb-3 shadow-sm border-0 cart-item-card">
      <Card.Body>
        <Row className="align-items-center">
          {/* Product Image */}
          <Col xs={4} md={2} className="text-center">
            <Image
              src={item.image || "https://via.placeholder.com/90?text=IMG"}
              alt={item.title}
              fluid
              rounded
              style={{ maxHeight: "90px", objectFit: "contain" }}
            />
          </Col>

          {/* Product Info */}
          <Col xs={8} md={4}>
            <h5 className="fw-semibold mb-1">{item.title}</h5>
            <p className="text-warning fw-bold mb-0">{formatPrice(item.price)}</p>
            {isMaxQuantity && (
              // அதிகபட்ச வரம்பைக் காட்டும் செய்தி (JSX கமெண்ட்)
              <p className="text-danger small mt-2 mb-0 fw-bold">
                Only {MAX_UNITS_PER_ITEM} units allowed in each order.
              </p>
            )}
          </Col>

          {/* Quantity Controls */}
          <Col xs={12} md={3} className="mt-3 mt-md-0 text-md-center">
            <ButtonGroup aria-label="Quantity controls">
              <Button
                variant="outline-secondary"
                onClick={() => onDecrease(item)}
                disabled={item.quantity <= 1} // Prevent going below 1
              >
                −
              </Button>
              <Button variant="dark" disabled>{item.quantity}</Button>
              <Button
                variant="outline-secondary"
                onClick={() => onIncrease(item)}
                // max quantity reached-ஆல் முடக்கப்பட்டுள்ளது
                disabled={isMaxQuantity}
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