import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";

// 🔹 Convert Firestore Order to Local Object
const mapFirestoreOrderToLocal = (docData, docId) => {
  const status = docData.orderStatus || "Processing";
  let orderDate = "N/A";

  if (docData.orderDate?.toDate) {
    orderDate = docData.orderDate.toDate().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return {
    id: docId,
    status,
    date: orderDate,
    total: docData.totalAmount || 0,
    paymentMethod: docData.paymentMethod || "N/A",
    shippingAddress: {
      name: docData.name || "N/A",
      address: docData.address || "N/A",
      latitude: docData.latitude || null,
      longitude: docData.longitude || null,
      phone: docData.phoneNumber || "N/A",
    },
    items: (docData.products || []).map((p) => ({
      name: p.name,
      quantity: p.quantity,
      price: p.price,
    })),
  };
};

// 🔹 Order Card
const OrderCard = ({ order, navigate }) => (
  <Card className="mb-4 shadow-sm border-0 rounded-3">
    <Card.Header className="bg-light d-flex justify-content-between align-items-center border-0">
      <h5 className="mb-0 text-primary fw-bold">
        Order ID: <span className="text-dark">{order.id}</span>
      </h5>
      <span
        className={`fw-bold ${
          order.status === "Delivered" ? "text-success" : "text-warning"
        }`}
      >
        {order.status}
      </span>
    </Card.Header>

    <Card.Body>
      <Row>
        <Col md={6}>
          <p className="mb-1">
            <strong>Order Date:</strong> {order.date}
          </p>
          <p className="mb-1">
            <strong>Total:</strong>{" "}
            <span className="text-danger fw-bold">
              ₹{order.total?.toLocaleString("en-IN")}
            </span>
          </p>
          <p className="mb-0">
            <strong>Payment:</strong> {order.paymentMethod}
          </p>
        </Col>

        <Col md={6} className="mt-3 mt-md-0">
          <h6 className="fw-bold mb-2">Shipping To:</h6>
          <p className="mb-1">{order.shippingAddress?.name}</p>
          <p className="mb-1 small text-muted">{order.shippingAddress?.address}</p>
          <p className="mb-0 small text-muted">
            Ph: {order.shippingAddress?.phone}
          </p>
        </Col>
      </Row>

      {order.items?.length > 0 && (
        <div className="mt-3 border-top pt-3">
          <h6 className="fw-bold mb-2">Items:</h6>
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="d-flex justify-content-between small mb-1"
            >
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>
                ₹{(item.price * item.quantity).toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card.Body>

    <Card.Footer className="bg-light border-0 text-center">
      <Button
        variant="info"
        size="sm"
        className="me-2"
        onClick={() =>
          window.open(
            `https://www.google.com/maps?q=${order.shippingAddress.latitude},${order.shippingAddress.longitude}`,
            "_blank"
          )
        }
      >
        View on Map
      </Button>
      <Button variant="outline-dark" size="sm" onClick={() => navigate("/")}>
        Buy Again
      </Button>
    </Card.Footer>
  </Card>
);

// 🔹 Main Component
function ViewOrderDetails() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // 🧠 Check Auth
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        navigate("/login"); // 🔁 Redirect if not logged in
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  // 🧩 Fetch Orders only if user is logged in
  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;
      setLoading(true);

      try {
        const ordersRef = collection(db, "users", userId, "orders");
        const q = query(ordersRef, orderBy("orderDate", "desc"));
        const snapshot = await getDocs(q);

        const fetched = snapshot.docs.map((doc) =>
          mapFirestoreOrderToLocal(doc.data(), doc.id)
        );
        setOrders(fetched);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]);

  // 🌀 Show Loading Spinner
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your orders...</p>
      </Container>
    );
  }

  // 🧾 Show Orders
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col lg={9}>
          <h2 className="mb-4 fw-bold">
            Your Orders{" "}
            <span className="text-muted fs-6">({orders.length})</span>
          </h2>

          {orders.length === 0 ? (
            <Alert variant="warning" className="text-center shadow-sm">
              You haven’t placed any orders yet.
              <div className="mt-2">
                <Button variant="primary" onClick={() => navigate("/")}>
                  Start Shopping
                </Button>
              </div>
            </Alert>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} navigate={navigate} />
            ))
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default ViewOrderDetails;
