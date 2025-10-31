// src/pages/OrderConformPage.jsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Button,
  Modal,
  ListGroup,
} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function OrderConformPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { paymentMethod, total, itemsCount, billingDetails } = location.state || {};

  const defaultBillingDetails = {
    fullName: "N/A",
    address: "Details not available",
    city: "N/A",
    pincode: "N/A",
    phone: "N/A",
  };

  const initialBillingDetails = billingDetails
    ? {
      fullName: billingDetails.fullName || defaultBillingDetails.fullName,
      address: billingDetails.address || defaultBillingDetails.address,
      city: billingDetails.city || defaultBillingDetails.city,
      pincode: billingDetails.pincode || defaultBillingDetails.pincode,
      phone: billingDetails.phone || defaultBillingDetails.phone,
    }
    : defaultBillingDetails;

  // Generate order ID
  const [orderInfo] = useState({
    orderId: `OD${Date.now().toString().slice(-8)}`,
    billingDetails: initialBillingDetails,
    // Dynamic delivery date: current date + 3 to 4 days randomly
    expectedDeliveryDate: (() => {
      const today = new Date();
      const deliveryDays = Math.floor(Math.random() * 2) + 3; // 3 or 4 days
      today.setDate(today.getDate() + deliveryDays);
      return today.toLocaleDateString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    })(),
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (paymentMethod && total) {
      const newOrder = {
        id: orderInfo.orderId,
        date: new Date().toLocaleDateString("en-IN"),
        total: total,
        paymentMethod: paymentMethod,
        itemsCount: itemsCount,
        shippingAddress: orderInfo.billingDetails,
        expectedDeliveryDate: orderInfo.expectedDeliveryDate,
      };

      try {
        const existingOrders = JSON.parse(localStorage.getItem("userOrders")) || [];
        existingOrders.unshift(newOrder);
        localStorage.setItem("userOrders", JSON.stringify(existingOrders));
        setShowModal(true); // Show modal after saving order
      } catch (error) {
        console.error("Error saving order:", error);
      }
    }
  }, [paymentMethod, total, orderInfo, itemsCount]);

  if (!paymentMethod) {
    return (
      <Container className="py-5 text-center">
        <Alert variant="danger">
          Order details not found. Please check your order history.
        </Alert>
        <Button variant="primary" onClick={() => navigate("/")}>
          Go to Homepage
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={9}>
          {/* SUCCESS POPUP MODAL */}
          <Modal
            show={showModal}
            onHide={() => setShowModal(false)}
            centered
            backdrop="static"
            size="md"
            className="text-center"
          >
            <Modal.Body>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                <i
                  className="fas fa-check-circle mb-3"
                  style={{ fontSize: "4rem", color: "#28a745" }}
                ></i>
                <h4 className="fw-bold text-success">Order Placed Successfully!</h4>
                <p className="text-muted mb-3">
                  Thank you for shopping with us 🎁
                </p>
                <Button
                  variant="success"
                  className="me-2"
                  onClick={() => {
                    setShowModal(false);
                    navigate("/orders");
                  }}
                >
                  View My Orders
                </Button>
                <Button
                  variant="outline-dark"
                  onClick={() => {
                    setShowModal(false);
                    navigate("/");
                  }}
                >
                  Continue Shopping
                </Button>
              </motion.div>
            </Modal.Body>
          </Modal>

          {/* ORDER SUMMARY CARD */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="shadow-lg mb-4 border-success">
              <Card.Header className="bg-light py-3 border-success">
                <div className="d-flex align-items-center">
                  <i
                    className="fas fa-check-circle me-3"
                    style={{ color: "#28a745", fontSize: "1.8rem" }}
                  ></i>
                  <div>
                    <h4 className="mb-0 text-success fw-bold">
                      ORDER CONFIRMATION
                    </h4>
                    <small className="text-muted">
                      Your order has been successfully placed.
                    </small>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                <Row className="text-center">
                  <Col md={4} className="border-end">
                    <p className="mb-1 fw-semibold text-secondary">Order ID</p>
                    <h5 className="fw-bold text-dark">{orderInfo.orderId}</h5>
                  </Col>
                  <Col md={4} className="border-end">
                    <p className="mb-1 fw-semibold text-secondary">Total Amount</p>
                    <h5 className="fw-bold text-danger">{total}</h5>
                  </Col>
                  <Col md={4}>
                    <p className="mb-1 fw-semibold text-secondary">Payment Mode</p>
                    <h5 className="fw-bold text-primary">{paymentMethod}</h5>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* DELIVERY DETAILS */}
            <Card className="shadow-sm mb-4">
              <Card.Header className="fw-bold bg-light">
                <i className="fas fa-truck me-2 text-warning"></i> DELIVERY DETAILS
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6} className="border-end">
                    <h6 className="fw-bold text-success mb-2">Expected Delivery</h6>
                    <p className="mb-1">
                      <i className="far fa-calendar-alt me-2"></i>
                      Expected by: <b>{orderInfo.expectedDeliveryDate}</b>
                    </p>
                    <p className="text-muted small">
                      You will receive {itemsCount || "your"} item(s) by this date.
                    </p>
                  </Col>
                  <Col md={6}>
                    <h6 className="fw-bold mb-2">Shipping Address</h6>
                    <p className="mb-1 fw-bold">{orderInfo.billingDetails.fullName}</p>
                    <p className="mb-1 text-muted small">
                      {orderInfo.billingDetails.address},{" "}
                      {orderInfo.billingDetails.city} -{" "}
                      {orderInfo.billingDetails.pincode}
                    </p>
                    <p className="mb-0 text-muted small">
                      Phone: {orderInfo.billingDetails.phone}
                    </p>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* ORDER SUMMARY */}
            <Card className="shadow-sm">
              <Card.Header className="fw-bold bg-light">
                <i className="fas fa-box-open me-2 text-info"></i> ORDER SUMMARY
              </Card.Header>
              <ListGroup variant="flush">
                <ListGroup.Item className="d-flex justify-content-between py-3">
                  <span className="fw-bold">Total Items</span>
                  <span>{itemsCount || 1}</span>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between py-3">
                  <span className="fw-bold">Total Amount Paid</span>
                  <span className="fw-bold text-danger fs-5">{total}</span>
                </ListGroup.Item>
              </ListGroup>
              <Card.Body className="text-center">
                <Button
                  variant="outline-primary"
                  className="fw-bold me-3"
                  onClick={() => navigate("/orders")}
                >
                  View Order Details
                </Button>
                <Button
                  variant="warning"
                  className="fw-bold"
                  onClick={() => navigate("/")}
                >
                  Continue Shopping
                </Button>
              </Card.Body>
            </Card>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}

export default OrderConformPage;
