import React, { useState, useEffect, useCallback } from "react";
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

// 🛑 IMPORTANT: Use your actual Razorpay Key ID
const RAZORPAY_KEY_ID = "rzp_live_RF5gE7NCdAsEIs";

// 🌐 Alternative Geocoding Service: OpenStreetMap Nominatim
// Note: This API is free but requires a valid 'email' parameter for policy compliance.
const NOMINATIM_CONTACT_EMAIL = "your.app.contact@example.com";

// Utility function for debouncing (Performance Improvement)
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

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

  // Merge cart + Buy Now items (avoid duplicates) and ensure SKU
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

  // State for coordinates
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [geocodingError, setGeocodingError] = useState(null);
  // ✨ NEW: State for current location fetching
  const [isLocating, setIsLocating] = useState(false);

  const fetchProductMainSku = async (productId) => {
    try {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const data = productSnap.data();
        const mainSku = data.sku || data.basesku || productId;
        return mainSku;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching product SKU:", error);
      return null;
    }
  };

  // Auth check & SKU Fetching
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        fetchUserData(user.uid);

        const uniqueProductIds = [
          ...new Set(cartItemsFromRedux.map((item) => item.id)),
        ];

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
    return () => unsubscribe();
  }, [navigate, location.pathname, cartItemsFromRedux]);

  const fetchUserData = async (uid) => {
    setLoading(true);
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Fetch existing coordinates if available (fixing the 'lattitude' typo)
        const coords = data.shipping_address?.coordinates;
        if (coords) {
          setCoordinates({ lat: coords.latitude, lng: coords.longitude });
          setGeocodingError(null);
        }

        setBillingDetails((prev) => ({
          ...prev,
          fullName: data.name || prev.fullName,
          email: data.email || prev.email,
          phone: data.phone || prev.phone || "",
          address: data.shipping_address?.addressLine1 || prev.address,
          city: data.shipping_address?.city || prev.city,
          pincode: data.shipping_address?.postalCode || prev.pincode,
        }));
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🌐 Function to geocode the full address string using OpenStreetMap Nominatim API.
   * @param {object} details - The current billing details state.
   */
  const geocodeAddress = useCallback(async (details) => {
    const fullAddress = `${details.address}, ${details.city}, ${details.pincode}`;

    // Safety check for incomplete address
    if (fullAddress.trim().length < 10) {
      setGeocodingError("Address is incomplete.");
      setCoordinates({ lat: null, lng: null });
      return;
    }

    setGeocodingError("Locating address...");

    try {
      // Nominatim API call (Public endpoint)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          fullAddress
        )}&format=json&limit=1&email=${NOMINATIM_CONTACT_EMAIL}`
      );
      const data = await response.json();

      if (data.length > 0) {
        // Nominatim uses 'lon' for longitude, 'lat' for latitude
        const { lat, lon } = data[0];
        setCoordinates({ lat: parseFloat(lat), lng: parseFloat(lon) });
        setGeocodingError(null);
        console.log("Nominatim successful:", { lat, lng: lon });
      } else {
        setCoordinates({ lat: null, lng: null });
        setGeocodingError(
          `Address could not be accurately located. Please check the spelling.`
        );
        console.error("Geocoding failed: No results found.");
      }
    } catch (error) {
      console.error("Error during Nominatim API call:", error);
      setCoordinates({ lat: null, lng: null });
      setGeocodingError("Failed to connect to geocoding service (Network Error).");
    }
  }, []); // useCallback dependency array is empty

  // Debounce the geocoding call
  const debouncedGeocodeAddress = useCallback(
    debounce((details) => {
      geocodeAddress(details);
    }, 1000), // 1000ms (1 second) debounce time
    [geocodeAddress]
  );

  /**
   * ✨ FIX: Reverse geocodes coordinates to fill in address fields, ensuring street number, street, and area.
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   */
  const reverseGeocodeCoordinates = async (lat, lng) => {
    setIsLocating(true);
    setGeocodingError("Reverse geocoding address...");

    try {
      // Nominatim API call for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&email=${NOMINATIM_CONTACT_EMAIL}`
      );
      const data = await response.json();

      if (data.address) {
        const address = data.address;
        
        // --- 1. Extract Components Safely (Fallback to "" if undefined) ---
        // House/Door Number (This is what the user is explicitly asking for)
        const doorNumber = address.house_number || address.building || address.office || "";

        // Street/Road Name
        const streetName = address.road || address.pedestrian || address.street || address.residential || "";

        // Area/Locality (Suburb, Neighbourhood, Village, Hamlet) - e.g., "BTM Layout"
        const areaLocality = address.suburb || address.neighbourhood || address.hamlet || address.village || "";

        // --- 2. Build the Address Line in Desired Order (Door, Street, Area) ---
        
        // The core components of a physical address
        let addressComponents = [];
        if (doorNumber) addressComponents.push(doorNumber);
        if (streetName) addressComponents.push(streetName);
        // Include area only if street/door is also present (to avoid just showing "BTM Layout")
        if (streetName && areaLocality) addressComponents.push(areaLocality); 
        
        let cleanedAddress = addressComponents.join(", ");
        
        // ✨ FINAL ROBUST FALLBACK: If the manually built address is too short OR 
        // if we are missing the street number, use a large slice of the full display name. 
        // This display name is the most likely place to contain a written-out street number/name combination.
        if (cleanedAddress.length < 10 || (doorNumber === "" && streetName === "")) {
            // Take the first 5 components of the full display_name string for maximum detail
            const fullDisplayNameParts = data.display_name.split(",").map(p => p.trim()).filter(p => p !== '');
            // Only take address parts, not city/state/country
            cleanedAddress = fullDisplayNameParts.slice(0, Math.min(5, fullDisplayNameParts.length)).join(", ");

             // If the fallback is still weak, just use the area/locality as a last resort.
            if (cleanedAddress.length < 10 && areaLocality) {
                cleanedAddress = areaLocality;
            }
        }

        const newAddressDetails = {
          // Use the structured address line. Fallback to country if nothing else is found.
          address: cleanedAddress || address.country || "",
          
          // Use common city/town fields with a safe fallback
          city: address.city || address.town || address.county || address.state_district || address.village || "",
          
          // Use postcode with a safe fallback
          pincode: address.postcode || "",
        };

        // Update billing state with the new details
        setBillingDetails((prev) => ({
          ...prev,
          // Only update if the geocoded value is not an empty string
          address: newAddressDetails.address || prev.address,
          city: newAddressDetails.city || prev.city,
          pincode: newAddressDetails.pincode || prev.pincode,
        }));

        // Update coordinates state (Nominatim result coordinates might be slightly different than input)
        setCoordinates({ lat: parseFloat(data.lat), lng: parseFloat(data.lon) });
        setGeocodingError(null);
        alert("Address pre-filled from current location! Please check and edit the House/Door Number if necessary.");
      } else {
        setCoordinates({ lat: null, lng: null });
        setGeocodingError("Reverse geocoding failed: Address not found for coordinates.");
      }
    } catch (error) {
      console.error("Error during reverse geocoding:", error);
      setGeocodingError("Failed to connect to reverse geocoding service.");
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * Fetches current location using browser Geolocation API.
   */
  const fetchCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeocodingError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setGeocodingError("Fetching current GPS coordinates...");
    setCoordinates({ lat: null, lng: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        reverseGeocodeCoordinates(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        let errorMessage = "Could not get location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage =
            "Location access denied. Please allow location access in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Timed out while trying to get location.";
        }
        setGeocodingError(errorMessage);
        console.error("Geolocation error:", error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveBillingDetails = async (details) => {
    if (!userId) return;

    // The final geocoding call before saving
    await geocodeAddress(details);

    try {
      const docRef = doc(db, "users", userId);
      await setDoc(
        docRef,
        {
          name: details.fullName,
          email: details.email,
          phone: details.phone,
          shipping_address: {
            addressLine1: details.address,
            city: details.city,
            postalCode: details.pincode,
            state: "Karnataka",
            // Save coordinates
            coordinates:
              coordinates.lat && coordinates.lng
                ? {
                  latitude: coordinates.lat,
                  longitude: coordinates.lng,
                }
                : null,
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
               address: `${billingDetails.address} ,${billingDetails.city} ,${billingDetails.pincode} ,${"Karnataka"}`,
               latitude: coordinates.lat,
               longitude: coordinates.lng,
               name: billingDetails.fullName,
        products: mergedCartItems.map((item) => {
          const hasVariantData =
            item.stock || item.weight || item.width || item.height;
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
          const finalSku =
            productSkus[item.id] || (item.sku !== "N/A" ? item.sku : item.id);

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

      alert("Order placed successfully!");
      navigate("/orders");
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Error saving order details. Please try again.");
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;

    // Update state first
    const newDetails = { ...billingDetails, [id]: value };
    setBillingDetails(newDetails);

    if (id === "address" || id === "pincode" || id === "city") {
      // Trigger debounced geocoding when address fields are sufficiently populated
      if (
        newDetails.address.length > 5 &&
        newDetails.pincode.length > 5 &&
        newDetails.city.length > 2
      ) {
        debouncedGeocodeAddress(newDetails);
      } else {
        // Clear coordinates and error if address is incomplete
        setCoordinates({ lat: null, lng: null });
        setGeocodingError(null);
      }
    }
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

    // Perform geocoding one last time before saving
    await geocodeAddress(billingDetails);

    // Final check for confirmed coordinates
    if (!coordinates.lat || !coordinates.lng) {
      alert(
        "Could not confirm shipping address location. Please check the address details and ensure the address is complete."
      );
      return;
    }

    // Save user details with coordinates to Firestore before initiating payment
    await saveBillingDetails(billingDetails);

    // COD Logic
    if (paymentMethod === "cod") {
      navigate("/cod", {
        state: {
          billingDetails,
          cartItems: mergedCartItems,
          productSkus,
          totalPrice,
          coordinates, // Pass coordinates
        },
      });
      return;
    }

    // Razorpay Logic (Online Payment)
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

              {/* ✨ Use Current Location Button */}
              <div className="mb-3 d-flex justify-content-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={fetchCurrentLocation}
                  disabled={!userId || isLocating}
                >
                  {isLocating ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      Locating...
                    </>
                  ) : (
                    "📍 Use Current Location"
                  )}
                </Button>
              </div>
              {/* END NEW */}

              <Form.Group className="mb-3" controlId="address">
                <Form.Label>Address *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Enter full street address (including door/house number)"
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
              
              {/* Geocoding Status/Error */}
              {/* {geocodingError && (
                  <Alert variant={geocodingError.includes("failed") || geocodingError.includes("denied") ? "danger" : "info"} className="mt-2">
                      {geocodingError}
                      {geocodingError.includes("Accurately located") && coordinates.lat && coordinates.lng && (
                          <span className="text-success fw-bold ms-2"> (Location Confirmed)</span>
                      )}
                  </Alert>
              )} */}

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
                // Button is disabled if geocoding has failed (coordinates are null) or is locating
                disabled={!coordinates.lat || isLocating}
              >
                🔒 Pay {formatPrice(totalPrice)}
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Order Summary with Product Image & Name */}
        <Col md={5} className="mt-4 mt-md-0">
          <h3 className="fw-bold mb-4 text-success border-bottom pb-2">
            Order Summary
          </h3>

          <Card className="shadow-lg border-0 p-4 bg-light">
            {mergedCartItems && mergedCartItems.length > 0 ? (
              mergedCartItems.map((item, index) => {
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
                    style={{
                      transition: "0.3s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
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
                        Total:{" "}
                        {formatPrice((item.price || 0) * (item.quantity || 1))}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted py-3">
                No items in your order.
              </p>
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
                  <span className="text-success">
                    {formatPrice(totalPrice)}
                  </span>
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