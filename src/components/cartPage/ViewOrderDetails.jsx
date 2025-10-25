import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Alert, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase"; // Assuming your firebase config is in "../../firebase"
import { collection, query, orderBy, getDocs } from "firebase/firestore";

// --- Utility Functions ---

/**
 * Maps a single Firestore Order Document to the format expected by OrderCard.
 * @param {object} docData - The data object from the Firestore document snapshot.
 * @param {string} docId - The ID of the Firestore document (used as the order's unique ID).
 */
const mapFirestoreOrderToLocal = (docData, docId) => {
  const address = docData.addressDetails || {};
  const status = docData.orderStatus || "Processing";
  let orderDate = "N/A";

  // Convert Firestore Timestamp or use the date field
  if (docData.orderDate && docData.orderDate.toDate) {
    orderDate = docData.orderDate.toDate().toLocaleDateString("en-IN", {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } else if (docData.orderDate) {
      // Fallback for non-Timestamp fields
      orderDate = new Date(docData.orderDate).toLocaleDateString("en-IN", {
          year: 'numeric', month: 'short', day: 'numeric'
      });
  }

  return {
    // Note: OrderCard expects 'id' (from the URL / Local Storage example), 
    // but the Checkout component used 'orderId' field and Firestore document ID.
    // We'll use the unique Firestore Document ID for 'id'.
    id: docId, 
    status: status,
    date: orderDate,
    total: docData.totalAmount || 0, // Using totalAmount from Firestore
    paymentMethod: docData.paymentMethod || "N/A",
    shippingAddress: {
      name: address.fullName,
      address: address.addressLine1,
      city: address.city,
      pincode: address.postalCode,
      // Note: phone number might be in the root of the order doc as phoneNumber
      phone: docData.phoneNumber || "N/A", 
    },
    // Map the 'products' array from Firestore to the 'items' array expected by OrderCard
    items: (docData.products || []).map(p => ({
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      // Includes other details not currently displayed but good to have
    })),
  };
};

// --- OrderCard Component (responsive enhancement applied in Card.Footer) ---

const OrderCard = ({ order, navigate }) => (
  <Card className="mb-4 shadow-sm border-0 rounded-3">
    <Card.Header className="bg-light d-flex justify-content-between align-items-center border-0">
      <h5 className="mb-0 text-primary fw-bold">
        Order ID: <span className="text-dark">{order.id}</span>
      </h5>
      <span
        className={`fw-bold ${
          order.status === "Delivered"
            ? "text-success"
            : "text-warning"
        }`}
      >
        {order.status || "Processing"}
      </span>
    </Card.Header>

    <Card.Body className="bg-white">
      <Row>
        {/* These columns stack on mobile (default) and go side-by-side on medium (md) screens and up */}
        <Col md={6}>
          <p className="mb-1">
            <strong>Order Date:</strong> {order.date}
          </p>
          <p className="mb-1">
            <strong>Total Amount:</strong>{" "}
            <span className="text-danger fw-bold">
              ₹{order.total?.toLocaleString('en-IN')}
            </span>
          </p>
          <p className="mb-0">
            <strong>Payment:</strong> {order.paymentMethod}
          </p>
        </Col>

        <Col md={6} className="mt-3 mt-md-0"> {/* Add margin top on mobile only */}
          <h6 className="fw-bold mb-2">Shipping To:</h6>
          <p className="mb-1">{order.shippingAddress?.name}</p>
          <p className="mb-1 small text-muted">
            {order.shippingAddress?.address},{" "}
            {order.shippingAddress?.city} -{" "}
            {order.shippingAddress?.pincode}
          </p>
          <p className="mb-0 small text-muted">
            Ph: {order.shippingAddress?.phone}
          </p>
        </Col>
      </Row>

      {/* 🧾 Ordered Items */}
      {order.items && order.items.length > 0 && (
        <div className="mt-3 border-top pt-3">
          <h6 className="fw-bold mb-2">Items:</h6>
          {order.items.map((item, idx) => (
            <div key={idx} className="d-flex justify-content-between small mb-1">
              <span className="me-2">{item.name} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}
    </Card.Body>

    {/* 🚀 RESPONSIVENESS ENHANCEMENT: Buttons stack full-width on mobile, then are centered inline on desktop */}
    <Card.Footer className="bg-light border-0">
      {/* d-grid makes buttons full-width and stacks them on xs/sm. d-md-block and text-md-center revert to inline and centered on md+. */}
      <div className="d-grid gap-2 d-md-block text-md-center"> 
        <Button variant="info" size="sm" className="me-md-2">
          Track Package
        </Button>
        <Button variant="outline-dark" size="sm" onClick={() => navigate("/")}>
          Buy Again
        </Button>
      </div>
    </Card.Footer>
  </Card>
);

// --- Main ViewOrderDetails Component ---

function ViewOrderDetails() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // 1. Authentication Check and User ID Retrieval
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Only redirect if explicitly not logged in, otherwise let loading handle it.
        // If the user logs in, the second useEffect will run.
        setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Fetch Orders from Firestore once userId is set
  useEffect(() => {
    if (!userId) {
      if (!loading) { // If loading is already false (not logged in), don't proceed
          return;
      }
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        // ✅ Query the subcollection: /users/{userId}/orders
        const ordersRef = collection(db, "users", userId, "orders");
        // Order by the 'orderDate' field (or 'createdAt') descending
        const q = query(ordersRef, orderBy("orderDate", "desc")); 

        const querySnapshot = await getDocs(q);
        const fetchedOrders = [];
        
        querySnapshot.forEach((doc) => {
          // Map Firestore document data to the component's expected structure
          const orderData = mapFirestoreOrderToLocal(doc.data(), doc.id);
          fetchedOrders.push(orderData);
        });

        setOrders(fetchedOrders);
      } catch (error) {
        console.error("❌ Error fetching orders from Firestore:", error);
        alert("Failed to load orders. Please try refreshing.");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId]); // Re-run when userId changes

  // 🕒 Loading State
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your orders...</p>
      </Container>
    );
  }
  
  // 🚫 Redirect unauthenticated user
  if (!userId) {
     return (
        <Container className="py-5 text-center">
            <Alert variant="danger">
                You must be logged in to view your orders.
                <div className="mt-2">
                    <Button variant="primary" onClick={() => navigate("/login")}>
                        Go to Login
                    </Button>
                </div>
            </Alert>
        </Container>
      )
  }

  // 🧾 Main Render
  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        {/* Col lg={9} ensures the content doesn't stretch too wide on huge screens */}
        <Col lg={9}>
          <h2 className="mb-4 fw-bold">
            Your Orders{" "}
            <span className="text-muted fs-6">
              ({orders.length})
            </span>
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