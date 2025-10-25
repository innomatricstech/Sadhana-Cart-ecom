import React, { useState, useEffect } from "react";
// Import Modal for the custom popup
import { Container, Row, Col, Card, Button, Spinner, Modal } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { clearCart } from "../../redux/cartSlice";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase";

function CashOnDelivery() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Retrieve all necessary data from navigation state
  const billingDetails = location.state?.billingDetails || {};
  const cartItems = location.state?.cartItems || [];
  const productSkus = location.state?.productSkus || {};
  const totalPrice = location.state?.totalPrice || 0;

  // States for user management and saving status
  const [userId, setUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // 1. States for managing the informational modal/popup
  const [showModal, setShowModal] = useState(false); 
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  
  // 2. State for managing the confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Helper function to show the informational popup
  const showPopup = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setShowModal(true);
  };
  
  const handleCloseModal = () => setShowModal(false);

  // Fetch user ID on component mount
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  const saveOrderToFirestore = async (paymentMethod, status = "Pending", paymentId = null) => {
    if (!userId) {
      // Replaced alert with custom popup
      showPopup("Authentication Required", "You must be logged in to place an order.");
      return false;
    }

    try {
      const ordersRef = collection(db, "users", userId, "orders");
      const orderId = `ORD-${Date.now()}`;
      const orderData = {
        userId,
        orderId,
        orderStatus: status,
        totalAmount: totalPrice,
        paymentMethod,
        phoneNumber: billingDetails.phone,
        createdAt: serverTimestamp(),
        orderDate: serverTimestamp(),
        addressDetails: {
          fullName: billingDetails.fullName,
          addressLine1: billingDetails.address,
          city: billingDetails.city,
          postalCode: billingDetails.pincode,
          state: "Karnataka",
        },
        products: cartItems.map((item) => {
          const hasVariantData = item.stock || item.weight || item.width || item.height;

          const sizevariants =
            hasVariantData || item.color || item.size
              ? {
                  sku: item.sku !== "N/A" ? item.sku : null,
                  stock: item.stock || null,
                  weight: item.weight || null,
                  width: item.width || null,
                  height: item.height || null,
                }
              : undefined;

          const finalSku = productSkus[item.id] || (item.sku !== "N/A" ? item.sku : item.id);

          return {
            productId: item.id,
            name: item.title || item.name || "Unnamed Product",
            price: item.price,
            quantity: item.quantity,
            sku: finalSku,
            brandName: item.brandName || null,
            category: item.category || null,
            color: item.color || null,
            size: item.size || null,
            images: item.images || [],
            ...(sizevariants && { sizevariants: sizevariants }),
            totalAmount: item.price * item.quantity,
          };
        }),
        paymentId,
        shippingCharges: 0,
      };
      await addDoc(ordersRef, orderData);
      return true;
    } catch (error) {
      console.error("Error saving COD order:", error);
      // Replaced alert with custom popup
      showPopup("Order Error", "Failed to save order details to the database. Please try again.");
      return false;
    }
  };

  // 3. New function to finalize the order placement after confirmation
  const handleFinalOrderPlacement = async () => {
    if (isSaving) return;

    // Close the confirmation modal and start saving process
    setShowConfirmModal(false); 
    setIsSaving(true);
    
    const orderPlaced = await saveOrderToFirestore("Cash on Delivery", "Pending");

    if (orderPlaced) {
        dispatch(clearCart());

        navigate("/order-confirm", {
            state: {
                paymentMethod: "Cash on Delivery",
                total: formatPrice(totalPrice),
                itemsCount: cartItems.length,
                billingDetails: billingDetails,
            },
        });
    }
    // Note: If orderPlaced is false, the error is handled by showPopup inside saveOrderToFirestore
    setIsSaving(false);
  };
  
  const handleConfirmOrder = () => {
    if (isSaving || !userId) return;

    // 4. Replaced window.confirm with custom modal
    setShowConfirmModal(true);
  };

  const handleBack = () => {
    // Navigate back to checkout and preserve cart & billing info
    navigate("/checkout", {
      state: {
        cartItems: cartItems,
        billingDetails: billingDetails,
        productSkus: productSkus,
        totalPrice: totalPrice,
      },
    });
  };

  if (cartItems.length === 0 || !userId) {
    return (
      <Container className="py-5 text-center">
        <h2 className="text-danger">Error</h2>
        <p>Order data is missing or you are not logged in. Please return to checkout.</p>
        <Button onClick={handleBack} variant="primary">
          Go back to Checkout
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8}>
          <h2 className="mb-4">Cash on Delivery Order Confirmation</h2>

          <Card className="mb-4 shadow-sm p-4">
            <h5 className="mb-3">Billing Information</h5>
            <p>
              <strong>Name:</strong> {billingDetails.fullName || "-"}
            </p>
            <p>
              <strong>Email:</strong> {billingDetails.email || "-"}
            </p>
            <p>
              <strong>Phone:</strong> {billingDetails.phone || "-"}
            </p>
            <p>
              <strong>Address:</strong>{" "}
              {billingDetails.address
                ? `${billingDetails.address}, ${billingDetails.city} - ${billingDetails.pincode}`
                : "-"}
            </p>
          </Card>

          <Card className="mb-4 shadow-sm p-4">
            <h5 className="mb-3">Order Summary</h5>
            {cartItems.map((item, index) => (
              <div
                key={item.id + (item.sku || "") + index}
                className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2"
              >
                <div>
                  <p className="mb-0">{item.title || item.name || "Unnamed Product"}</p>
                  <small className="d-block text-muted">Quantity: {item.quantity}</small>
                </div>
                <span className="fw-bold">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}

            <hr />
            <p className="d-flex justify-content-between mb-2">
              <span>Subtotal:</span>
              <span>{formatPrice(totalPrice)}</span>
            </p>
            <p className="d-flex justify-content-between mb-2">
              <span>Shipping:</span>
              <span className="text-success fw-semibold">Free</span>
            </p>
            <h5 className="d-flex justify-content-between fw-bold">
              <span>Total:</span>
              <span>{formatPrice(totalPrice)}</span>
            </h5>
          </Card>

          <Button
            variant="warning"
            className="w-100 py-2 fw-semibold"
            onClick={handleConfirmOrder}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Placing Order...
              </>
            ) : (
              "Confirm Cash on Delivery Order"
            )}
          </Button>
        </Col>
      </Row>

      {/* 5. Informational Modal (for errors and cancellation messages) */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title className={modalTitle.includes("Error") || modalTitle.includes("Required") ? "text-danger" : "text-warning"}>
             {modalTitle}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{modalMessage}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 6. Confirmation Modal (replaces window.confirm) */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-primary">Confirm Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to confirm your Cash on Delivery order?</p>
          <p className="fw-bold">Total Amount: {formatPrice(totalPrice)}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleFinalOrderPlacement} 
            disabled={isSaving}
          >
            Yes, Confirm Order
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CashOnDelivery;