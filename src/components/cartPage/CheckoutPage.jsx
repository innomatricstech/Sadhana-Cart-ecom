import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Spinner,
  Alert,
  Image,
} from "react-bootstrap";
import { useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../../firebase";
import "./CartPage.css";

const RAZORPAY_KEY_ID = "rzp_live_RF5gE7NCdAsEIs";

const loadRazorpayScript = (src) =>
  new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const cartItemsFromRedux = useSelector((state) => state.cart.items || []);
  const productFromBuyNow = location.state?.product;
  const quantityFromBuyNow = location.state?.quantity || 1;

  // ✅ Merge cart + Buy Now items (avoid duplicates) and ensure SKU
  const mergedCartItems = cartItemsFromRedux.map((item) => ({
    ...item,
    sku: item.sku || item.SKU || item.product_sku || item.skuCode || "N/A",
  }));

  if (productFromBuyNow) {
    const buyNowItem = {
      ...productFromBuyNow,
      quantity: quantityFromBuyNow,
      sku:
        productFromBuyNow.sku ||
        productFromBuyNow.SKU ||
        productFromBuyNow.product_sku ||
        productFromBuyNow.skuCode ||
        "N/A",
    };
    const exists = mergedCartItems.find(
      (item) => item.id === buyNowItem.id && item.sku === buyNowItem.sku
    );
    if (exists) {
      exists.quantity += buyNowItem.quantity;
    } else {
      mergedCartItems.push(buyNowItem);
    }
  }

  const totalPrice = mergedCartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  // ⭐ State to store fetched main SKUs for all cart items (Map: {productId: main_sku})
  const [productSkus, setProductSkus] = useState({});
  const [billingDetails, setBillingDetails] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("razorpay");

  /**
   * Function to fetch the main SKU from a product document in 'products' collection.
   */
  const fetchProductMainSku = async (productId) => {
    try {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const data = productSnap.data();
        // Prioritize main 'sku' or 'basesku' from Firestore, otherwise use ID
        const mainSku = data.sku || data.basesku || productId;
        return mainSku; // Return the fetched SKU
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching product SKU:", error);
      return null;
    }
  };


  // ✅ Auth check & SKU Fetching
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        fetchUserData(user.uid);

        // Fetch SKUs for all unique product IDs in the cart
        const uniqueProductIds = [...new Set(cartItemsFromRedux.map(item => item.id))];

        const fetchAllSkus = async () => {
          const skuMap = {};
          for (const id of uniqueProductIds) {
            const sku = await fetchProductMainSku(id);
            if (sku) {
              skuMap[id] = sku;
            }
          }
          setProductSkus(skuMap);
        };

        fetchAllSkus();

      } else {
        setLoading(false);
        alert("Please log in to continue checkout.");
        navigate("/login", { state: { from: location.pathname } });
      }
    });
    // Added cartItemsFromRedux to dependency array to re-fetch SKUs if cart contents change
    return () => unsubscribe();
  }, [navigate, location.pathname, cartItemsFromRedux]); 

  const fetchUserData = async (uid) => {
    setLoading(true);
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBillingDetails((prev) => ({
          ...prev,
          fullName: data.name || prev.fullName,
          email: data.email || prev.email,
          phone: data.phone || prev.phone || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBillingDetails = async (details) => {
    if (!userId) return;
    try {
      const docRef = doc(db, "users", userId);
      await setDoc(
        docRef,
        {
          name: details.fullName,
          email: details.email,
          phone: details.phone,
          shipping_address: {
            address: details.address,
            city: details.city,
            pincode: details.pincode,
          },
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving billing details:", error);
    }
  };

  const saveOrderToFirestore = async (
    paymentMethod,
    status = "Pending",
    paymentId = null
  ) => {
    if (!userId) return;
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
        products: mergedCartItems.map((item) => {
          
          // Check for size/weight variant data, or if color/size is present (to include sizevariants object)
          const hasVariantData = item.stock || item.weight || item.width || item.height;

          // Construct sizevariants object (contains the variant SKU, which is item.sku)
          const sizevariants = hasVariantData || item.color || item.size ? {
              // Use the SKU specific to the cart item variant. If it was "N/A" (generic), pass null.
              sku: item.sku !== "N/A" ? item.sku : null, 
              stock: item.stock || null,
              weight: item.weight || null,
              width: item.width || null,
              height: item.height || null,
          } : undefined;

          // ⭐ CORRECTED LOGIC: Prioritize Fetched Product SKU, then Variant SKU, then Product ID.
          // This ensures the main product 'sku' is never "N/A" if an ID exists.
          const finalSku = productSkus[item.id] || (item.sku !== "N/A" ? item.sku : item.id);

          return {
            productId: item.id,
            name: item.title || item.name || "Unnamed Product",
            price: item.price,
            quantity: item.quantity,
            
            // ✅ UPDATED: Use the determined finalSku
            sku: finalSku,
            
            brandName: item.brandName || null,
            category: item.category || null,
            color: item.color || null,
            size: item.size || null,
            images: item.images || [],
            
            // SKU/Variant Container (Only add if variant data or color/size exists)
            ...(sizevariants && { sizevariants: sizevariants }), 
            
            totalAmount: item.price * item.quantity,
          };
        }),
        paymentId,
        shippingCharges: 0,
      };
      await addDoc(ordersRef, orderData);
      
      // ✅ Moved alert and navigate here. If the order is placed here (Razorpay), it redirects.
      // If /cod calls this function, it should handle the success message/navigation there.
      alert("Order placed successfully!");
      navigate("/orders");
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Error saving order details. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    setBillingDetails({ ...billingDetails, [e.target.id]: e.target.value });
  };

  const formatPrice = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);

  const handlePayment = async (e) => {
    e.preventDefault();
    const requiredFields = [
      "fullName",
      "email",
      "phone",
      "address",
      "city",
      "pincode",
    ];
    for (const field of requiredFields) {
      if (!billingDetails[field]) {
        alert(`Please fill in the required field: ${field}`);
        return;
      }
    }
    await saveBillingDetails(billingDetails);

    // 🛑 START OF MODIFIED COD LOGIC 🛑
    if (paymentMethod === "cod") {
      // ⚠️ DO NOT call saveOrderToFirestore here. 
      // The order details are passed to the /cod page, which will display them for confirmation.
      // The /cod page must contain the logic to save the order to Firestore after user confirmation.
      navigate("/cod", {
        state: { 
          billingDetails, 
          cartItems: mergedCartItems,
          // Pass productSkus and totalPrice so the /cod page can construct the final order data
          productSkus,
          totalPrice 
        },
      });
      return;
    }
    // 🛑 END OF MODIFIED COD LOGIC 🛑


    const res = await loadRazorpayScript(
      "https://checkout.razorpay.com/v1/checkout.js"
    );
    if (!res) return alert("Razorpay SDK failed to load.");

    const amountInPaise = Math.round(totalPrice * 100);
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: amountInPaise,
      currency: "INR",
      name: "SadhanaCart",
      description: "Purchase Checkout",
      handler: async function (response) {
        alert(
          "Payment Successful! Payment ID: " + response.razorpay_payment_id
        );
        await saveOrderToFirestore(
          "Razorpay",
          "Paid",
          response.razorpay_payment_id
        );
      },
      prefill: {
        name: billingDetails.fullName,
        email: billingDetails.email,
        contact: billingDetails.phone,
      },
      notes: {
        address: billingDetails.address,
        pincode: billingDetails.pincode,
      },
      theme: { color: "#FFA500" },
    };
    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3 text-dark">Fetching billing details...</p>
      </Container>
    );
  }

  // ✅ FIX: The missing closing tag for Container was here
  if (mergedCartItems.length === 0) {
    return (
      <Container className="py-5 text-center">
        <Alert variant="info">
          Your cart is empty.{" "}
          <Button variant="link" onClick={() => navigate("/")}>
            Go shopping
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5 checkout-container">
      <Row>
        {/* Billing Information */}
        <Col md={7}>
          <h3 className="fw-bold mb-4 text-warning border-bottom pb-2">
            Billing Information
          </h3>
          <Card className="shadow-lg border-0 p-4 bg-light">
            <Form onSubmit={handlePayment}>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="fullName">
                    <Form.Label>Full Name *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter full name"
                      required
                      value={billingDetails.fullName}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="email">
                    <Form.Label>Email Address *</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="Enter email"
                      required
                      value={billingDetails.email}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3" controlId="phone">
                <Form.Label>Phone Number *</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="Enter phone number"
                  required
                  value={billingDetails.phone}
                  onChange={handleInputChange}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="address">
                <Form.Label>Address *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Enter full street address"
                  required
                  value={billingDetails.address}
                  onChange={handleInputChange}
                />
              </Form.Group>
              <Row>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="city">
                    <Form.Label>City *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="City"
                      required
                      value={billingDetails.city}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6} className="mb-3">
                  <Form.Group controlId="pincode">
                    <Form.Label>PIN Code *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="PIN code"
                      required
                      value={billingDetails.pincode}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Payment Method *</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    label="Razorpay (Online Payment)"
                    name="paymentMethod"
                    id="razorpay"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    label="Cash on Delivery (COD)"
                    name="paymentMethod"
                    id="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                </div>
              </Form.Group>
              <Button
                variant="warning"
                className="w-100 mt-3 py-2 fw-bold shadow-sm"
                type="submit"
              >
                🔒 Pay {formatPrice(totalPrice)}
              </Button>
            </Form>
          </Card>
        </Col>

 {/* Order Summary with Product Image & Name */}
<Col md={5} className="mt-4 mt-md-0">
  <h3 className="fw-bold mb-4 text-success border-bottom pb-2">Order Summary</h3>

  <Card className="shadow-lg border-0 p-4 bg-light">
    {mergedCartItems && mergedCartItems.length > 0 ? (
      mergedCartItems.map((item, index) => {
        // Try all possible image paths
        const imageSrc =
          item.images?.[0] ||
          item.image ||
          item.imageUrl ||
          item.thumbnail ||
          item.img ||
          "";

        return (
          <div
            key={item.id + (item.sku || "") + index}
            className="d-flex align-items-center mb-4 p-3 rounded border bg-white"
            style={{ transition: "0.3s", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          >
            {/* Product Image */}
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={item.title || item.name || "Product"}
                thumbnail
                width={90}
                height={90}
                className="me-3"
                style={{
                  objectFit: "cover",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                }}
              />
            ) : (
              <div
                className="me-3 d-flex align-items-center justify-content-center bg-light"
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  color: "#999",
                  fontSize: "0.8rem",
                }}
              >
                No Image
              </div>
            )}

            {/* Product Details */}
            <div className="flex-grow-1">
              <p className="fw-bold text-dark mb-1">
                {item.title || item.name || "Unnamed Product"}
              </p>
              {item.color && (
                <small className="d-block text-muted">
                  Color: {item.color}
                </small>
              )}
              {item.category && (
                <small className="d-block text-muted">
                  Category: {item.category}
                </small>
              )}
              <small className="d-block text-muted">
                Quantity: {item.quantity || 1}
              </small>
              <small className="d-block text-muted">
                Price per item: {formatPrice(item.price || 0)}
              </small>
              <span className="fw-bold text-primary">
                Total: {formatPrice((item.price || 0) * (item.quantity || 1))}
              </span>
            </div>
          </div>
        );
      })
    ) : (
      <p className="text-center text-muted py-3">No items in your order.</p>
    )}

    {/* Totals Section */}
    {mergedCartItems && mergedCartItems.length > 0 && (
      <div className="mt-3 border-top pt-3">
        <p className="d-flex justify-content-between mb-2">
          <span>Subtotal:</span>
          <span>{formatPrice(totalPrice)}</span>
        </p>
        <p className="d-flex justify-content-between mb-2">
          <span>Shipping:</span>
          <span className="text-success fw-semibold">Free</span>
        </p>
        <hr />
        <h5 className="d-flex justify-content-between fw-bold">
          <span>Total:</span>   
          <span className="text-success">{formatPrice(totalPrice)}</span>
        </h5>
      </div>
    )}
  </Card>
</Col>

      </Row>
    </Container>
  );
};

export default CheckoutPage;