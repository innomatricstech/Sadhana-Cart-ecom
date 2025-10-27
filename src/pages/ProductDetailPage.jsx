import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Spinner, Alert, Card, Button, Form, InputGroup, Modal } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { addToCart } from "../redux/cartSlice";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaStar, FaRegStar } from 'react-icons/fa';
import { db } from "../firebase";
import { doc, getDoc, collection, getDocs, query, where, limit, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// 🚀 FIX: This line has been uncommented/added to resolve the ReferenceError.
// Adjust the path if ProductSuggestions is located elsewhere.
import ProductSuggestions from "../pages/ProductSuggestions";

const EXCHANGE_RATE = 1;
const auth = getAuth();

function ProductDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Product states
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(null);

  // Image gallery
  const [mainImage, setMainImage] = useState(null);
  const [productImages, setProductImages] = useState([]);

  // Filter/sort
  const [sortBy, setSortBy] = useState("rating");
  const [filterPrice, setFilterPrice] = useState(50000);

  // Pincode input (not used in logic beyond handlers, so removed state)
  const [pincodeInput, setPincodeInput] = useState("");

  // ⭐ Quantity state
  const [quantity, setQuantity] = useState(1);

  // 🚀 Variant (Size/Stock) states - Now dynamic
  const [productVariants, setProductVariants] = useState([]);
  const [selectedSize, setSelectedSize] = useState("N/A");

  // ⭐ MERGED REVIEWS: Reviews and Ratings State
  const [reviewsData, setReviewsData] = useState({
    averageRating: 0.0,
    totalRatings: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    reviews: [] // Array of individual review objects
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');

  const styles = {
    productDetailContainer: {
      borderRadius: "12px",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
      marginTop: "25px",
    },
    detailImg: {
      maxHeight: "400px",
      width: "auto",
      objectFit: "contain",
      transition: "transform 0.3s ease-in-out",
    },
    productImageCol: {
      borderRight: "1px solid #eee",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    },
    productPrice: {
      fontSize: "2.2rem",
      fontWeight: 800,
      color: "#dc3545",
      marginTop: "15px",
      marginBottom: "15px",
    },
    thumbnail: {
      width: "60px",
      height: "60px",
      objectFit: "contain",
      cursor: "pointer",
      border: "1px solid #ddd",
      margin: "0 5px",
      padding: "3px",
      transition: "border-color 0.2s",
    },
    activeThumbnail: {
      borderColor: "#dc3545",
      boxShadow: "0 0 5px rgba(220, 53, 69, 0.5)",
    },
    // 🚀 Style for size buttons (matching the image look)
    sizeButton: {
      padding: '8px 15px',
      marginRight: '10px',
      border: '1px solid #ccc',
      backgroundColor: '#fff',
      color: '#333',
      cursor: 'pointer',
      borderRadius: '5px',
      minWidth: '50px',
      textAlign: 'center',
      transition: 'all 0.1s',
      fontWeight: '600',
    },
    activeSizeButton: {
      borderColor: '#333',
      backgroundColor: '#f8f8f8',
      boxShadow: '0 0 0 2px #333',
    },
    // Style for out of stock variant
    outOfStock: {
      backgroundColor: '#f0f0f0',
      color: '#999',
      cursor: 'not-allowed',
      textDecoration: 'line-through'
    }
  };

  // --- Auth Listener ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // ⭐ Function to fetch reviews
  const fetchReviews = async (productId) => {
    // ⬇️ FIX APPLIED: Changed collection name from "ratings" to "rating" 
    // to match the Firestore screenshot's collection name.
    const reviewsQuery = query(collection(db, "rating"), where("productId", "==", productId));
    try {
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const fetchedReviews = reviewsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      let totalRatings = fetchedReviews.length;
      let totalStars = 0;
      let distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      fetchedReviews.forEach(review => {
        const rating = review.rating || 0;
        totalStars += rating;
        if (rating >= 1 && rating <= 5) {
          distribution[rating] += 1;
        }
      });

      const averageRating = totalRatings > 0 ? (totalStars / totalRatings) : 0.0;

      setReviewsData({
        averageRating: averageRating,
        totalRatings: totalRatings,
        distribution: distribution,
        reviews: fetchedReviews.map(review => ({
          ...review,
          // The 'date' field will use the createdAT timestamp for display
          date: review.createdAT?.toDate ? review.createdAT.toDate().toISOString() : new Date().toISOString()
        }))
      });
    } catch (err) {
      console.error("🔥 Error fetching reviews:", err);
      // Optionally, set an error state for reviews
    }
  }

  // --- Fetch Product and Initial Ratings (Modified) ---
  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProductAndReviews = async () => {
      try {
        setLoading(true);
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) throw new Error(`Product with ID ${id} not found.`);

        const data = { id: productSnap.id, ...productSnap.data() };
        setProduct(data);
        await fetchReviews(id);
        const fetchedVariants = Array.isArray(data.sizevariants) ? data.sizevariants : [];
        setProductVariants(fetchedVariants);

        if (fetchedVariants.length > 0) {
          setSelectedSize(fetchedVariants[0].size || null);
        } else {
          setSelectedSize("N/A");
        }

        let images = [];
        if (Array.isArray(data.images) && data.images.length > 0) images = data.images;
        else if (data.image) images = [data.image];
        else images = ["https://via.placeholder.com/350?text=No+Image"];

        setProductImages(images);
        setMainImage(images[0]);
      } catch (err) {
        console.error("🔥 Error fetching product details:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProductAndReviews();
  }, [id]);

  // --- Fetch Similar Products (Kept the same) ---
  useEffect(() => {
    if (!product?.category) return;
    const fetchCategoryProducts = async () => {
      try {
        setCatLoading(true);
        const q = query(collection(db, "products"), where("category", "==", product.category), limit(10));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map((d) => {
          const data = d.data();
          const priceValue = (data.price || 0) * EXCHANGE_RATE;
          return {
            id: d.id,
            ...data,
            priceINR: priceValue.toFixed(0),
            priceValue,
            rating: data.rating || { rate: 4.0, count: 100 },
          };
        });
        setCategoryProducts(fetched.filter((p) => p.id !== product.id));
      } catch (err) {
        console.error("🔥 Error fetching category products:", err);
        setCatError(err.message);
      } finally {
        setCatLoading(false);
      }
    };
    fetchCategoryProducts();
  }, [product]);
  const currentVariant = useMemo(() => {
    if (productVariants.length === 0 || !selectedSize || selectedSize === "N/A") return null;
    return productVariants.find(v => v.size === selectedSize) || null;
  }, [selectedSize, productVariants]);

  const calculatedPriceINR = useMemo(() => {
    if (!product) return 0;
    const basePrice = currentVariant?.price || product.price || 0;
    return (basePrice * EXCHANGE_RATE).toFixed(0);
  }, [currentVariant, product]);

  const calculatedOriginalPriceINR = useMemo(() => {
    return (Number(calculatedPriceINR) * 1.5).toFixed(0);
  }, [calculatedPriceINR]);

  const sortedVariants = useMemo(() => {
    const sizeOrder = ["S", "M", "L", "XL", "XXL", "XXXL"];
    const sizeIndexMap = sizeOrder.reduce((acc, size, index) => {
      acc[size] = index;
      return acc;
    }, {});

    return [...productVariants].sort((a, b) => {
      const indexA = sizeIndexMap[a.size?.toUpperCase()] ?? Infinity;
      const indexB = sizeIndexMap[b.size?.toUpperCase()] ?? Infinity;
      return indexA - indexB;
    });
  }, [productVariants]);


  // --- General Handlers (Kept the same) ---
  const handlePincodeCheck = () => {
    if (pincodeInput.length === 6) {
      toast.info(`Checking Pincode ${pincodeInput}...`, { position: "bottom-left" });
      setTimeout(() => {
        toast.success(`Delivery available for ${pincodeInput}`, { position: "bottom-left", autoClose: 3000 });
      }, 600);
    } else {
      toast.error("Please enter a valid 6-digit Pincode.", { position: "bottom-left" });
    }
  };

  const handleSizeSelect = (size) => {
    setSelectedSize(size);

    if (productVariants.length > 0) {
      const variant = productVariants.find(v => v.size === size);
      if (variant && (variant.stock || 0) === 0) {
        toast.error(`Size ${size} is currently out of stock.`, { position: "top-right", autoClose: 3000 });
      }
      if (variant && quantity > (variant.stock || 0)) {
        setQuantity(1);
        if ((variant.stock || 0) > 0) {
          toast.warn(`Quantity reset to 1. Max stock for ${size} is ${variant.stock}.`, { position: "bottom-left" });
        }
      }
    }
  };

  // 🚀 Add to Cart (Kept the same)
  const handleAddToCart = () => {
    if (!product || (productVariants.length > 0 && !selectedSize) || selectedSize === null) {
      if (productVariants.length > 0) {
        toast.error("Please select a size before adding to cart.", { position: "top-right", autoClose: 3000 });
      } else {
        toast.error("Product data is incomplete.", { position: "top-right", autoClose: 3000 });
      }
      return;
    }

    let itemTitle, itemSize, itemVariant;

    if (productVariants.length > 0) {
      if (!currentVariant) {
        toast.error("Selected size variant details are missing.", { position: "top-right", autoClose: 3000 });
        return;
      }
      if ((currentVariant.stock || 0) === 0) {
        toast.error(`Size ${selectedSize} is out of stock.`, { position: "top-right", autoClose: 3000 });
        return;
      }
      if (quantity > (currentVariant.stock || Infinity)) {
        toast.error(`Cannot add ${quantity} units. Only ${currentVariant.stock} available.`, { position: "top-right", autoClose: 3000 });
        return;
      }
      itemTitle = `${product.name || product.title} (${selectedSize})`;
      itemSize = selectedSize;
      itemVariant = currentVariant;
    } else {
      itemTitle = product.name || product.title;
      itemSize = selectedSize; // Will be "N/A"
      itemVariant = undefined;
    }

    dispatch(
      addToCart({
        id: product.id,
        title: itemTitle,
        price: Number(calculatedPriceINR),
        image: mainImage || product.image || "https://via.placeholder.com/150",
        quantity: quantity,
        size: itemSize,
        variant: itemVariant,
      })
    );

    toast.success(`Added ${quantity} x "${itemTitle}" to cart!`, {
      position: "top-right",
      autoClose: 1000,
      theme: "colored",
    });
  };

  const handleBuyNow = () => {
    if (!product || (productVariants.length > 0 && !selectedSize) || selectedSize === null) {
      if (productVariants.length > 0) {
        toast.error("Please select a size to Buy Now.", { position: "top-center", autoClose: 3000 });
      } else {
        toast.error("Product data is incomplete.", { position: "top-center", autoClose: 3000 });
      }
      return;
    }

    let productTitle, checkoutSize, checkoutVariant;

    if (productVariants.length > 0) {
      if (currentVariant && (currentVariant.stock || 0) === 0) {
        toast.error(`Size ${selectedSize} is out of stock.`, { position: "top-center", autoClose: 3000 });
        return;
      }
      productTitle = `${product.name || product.title} (${selectedSize})`;
      checkoutSize = selectedSize;
      checkoutVariant = currentVariant;
    } else {
      productTitle = product.name || product.title;
      checkoutSize = selectedSize; // Will be "N/A"
      checkoutVariant = undefined;
    }

    toast.info("Proceeding directly to Checkout...", { position: "top-center", autoClose: 1000 });

    const productForCheckout = {
      ...product,
      title: productTitle,
      size: checkoutSize,
      price: Number(calculatedPriceINR),
      variant: checkoutVariant
    };

    if (isLoggedIn) {
      navigate("/checkout", { state: { paymentMethod: "online", product: productForCheckout, quantity } });
    } else {
      navigate("/login", { state: { from: "/checkout", paymentMethod: "online", product: productForCheckout, quantity } });
    }
  };

  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setUserRating(0);
    setReviewTitle('');
    setReviewText('');
  };

  const handleWriteReviewClick = () => {
    if (!isLoggedIn) {
      toast.error("Please log in to write a review.", { position: "top-center" });
      navigate('/login', { state: { from: `/product/${id}` } });
      return;
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (userRating === 0) {
      toast.error("Please select a star rating.", { position: "top-center" });
      return;
    }
    if (!auth.currentUser) {
      toast.error("User not authenticated. Please log in.", { position: "top-center" });
      return;
    }

    try {
      // Submitting to the 'rating' collection, which matches the screenshot.
      const reviewRef = collection(db, "rating"); 

      const newReview = {
        // Data from UI fields
        rating: userRating, // matches 'rating' field
        comment: reviewText, // matches 'comment' field
        title: reviewTitle,

        // Product & User Info fields
        productId: product.id, // matches 'productid' field (lowercase 'id' here, but matches value)
        userId: auth.currentUser.uid, // matches 'userId' field
        userName: auth.currentUser.displayName || auth.currentUser.email || 'Customer', // matches 'userName' field

        createdAT: serverTimestamp(),
        image: mainImage || "https://via.placeholder.com/150",
      };

      await addDoc(reviewRef, newReview);

      toast.success("Review submitted successfully! Refreshing reviews...", { position: "top-center", autoClose: 3000 });
      handleCloseReviewModal();
      // Re-fetch reviews to update the UI
      await fetchReviews(id);

    } catch (error) {
      console.error("🔥 Error submitting review:", error);
      toast.error(`Failed to submit review: ${error.message}`, { position: "top-center", autoClose: 5000 });
    }
  };
  const filteredAndSortedCategory = useMemo(() => {
    let list = [...categoryProducts];
    list = list.filter((p) => p.priceValue <= filterPrice);

    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => a.priceValue - b.priceValue);
        break;
      case "price-desc":
        list.sort((a, b) => b.priceValue - a.priceValue);
        break;
      case "name-asc":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      default:
        list.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
    }
    return list;
  }, [categoryProducts, sortBy, filterPrice]);

  // --- Render Checks (Kept the same) ---
  if (loading || !isAuthReady)
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  if (error) return <Alert variant="danger" className="mt-4 text-center">{error}</Alert>;
  if (!product) return <p className="text-center py-5">No product found.</p>;


  const discountPercentage = (((calculatedOriginalPriceINR - calculatedPriceINR) / calculatedOriginalPriceINR) * 100).toFixed(0);
  const rating = { rate: reviewsData.averageRating, count: reviewsData.totalRatings };

  const isOutOfStock = productVariants.length > 0 ? (currentVariant?.stock || 0) === 0 : false;
  const showStockStatus = productVariants.length > 0 && currentVariant;

  const isCartBuyDisabled =
    (productVariants.length > 0 && !selectedSize) ||
    (productVariants.length > 0 && isOutOfStock) ||
    (productVariants.length > 0 && quantity > (currentVariant?.stock || 0));

  return (
    <Container className="py-4">
      <ToastContainer />

      <Card style={styles.productDetailContainer} className="p-4 mb-5">
        <Row>
          <Col md={5} style={styles.productImageCol}>
            <img src={mainImage} alt={product.name} className="img-fluid mb-3" style={styles.detailImg} />
            <div className="d-flex justify-content-center flex-wrap mt-3 mb-3">
              {productImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  onClick={() => setMainImage(img)}
                  style={{
                    ...styles.thumbnail,
                    ...(mainImage === img ? styles.activeThumbnail : {}),
                  }}
                />
              ))}
            </div>
          </Col>

          <Col md={7}>
            <h2 className="fw-bold">{product.name || product.title}</h2>
            <p className="text-primary fw-semibold text-uppercase">{product.category}</p>
            <div className="product-rating mb-3">
              <span className="text-warning fw-bold me-2">
                {rating.rate.toFixed(1)} <i className="fas fa-star small"></i>
              </span>
              <span className="text-muted small">({rating.count} reviews)</span>
            </div>
            <hr />
            <h2 style={styles.productPrice}>
              ₹{calculatedPriceINR} /-
              <small className="text-muted ms-3 fs-6 text-decoration-line-through">₹{calculatedOriginalPriceINR}</small>
            </h2>
            <span className="badge bg-danger fs-6 mb-3">{discountPercentage}% OFF!</span>
            <p className="text-muted small">{product.description || "No description available."}</p>

            {/* 🚀 Size Selector */}
            <div className="mb-4 pt-3 border-top">
              {sortedVariants.length > 0 && (
                <Form.Label className="fw-semibold">Select Size:</Form.Label>
              )}
              <div className="d-flex align-items-center flex-wrap">
                {sortedVariants.length > 0 ? (
                  sortedVariants.map((variant) => (
                    <Button
                      key={variant.size}
                      onClick={() => handleSizeSelect(variant.size)}
                      variant="light"
                      style={{
                        ...styles.sizeButton,
                        ...(selectedSize === variant.size ? styles.activeSizeButton : {}),
                        ...((variant.stock || 0) === 0 ? styles.outOfStock : {}),
                      }}
                      disabled={(variant.stock || 0) === 0}
                    >
                      {variant.size}
                    </Button>
                  ))
                ) : (
                  null
                )}
              </div>
            </div>
            {showStockStatus && (
              <div className="mb-3">
                {isOutOfStock ? (
                  <span className="text-danger fw-bold">Out of Stock</span>
                ) : (
                  <span className="text-success fw-bold">In Stock ({currentVariant.stock} available)</span>
                )}
              </div>
            )}

            {/* ⭐ Quantity Selector */}
            <div className="mb-4 pt-3 border-top">
              <Form.Label className="fw-semibold">Quantity:</Form.Label>
              <InputGroup style={{ width: '150px' }}>
                <Button
                  variant="outline-secondary"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={isOutOfStock}
                >
                  -
                </Button>
                <Form.Control
                  type="number"
                  min="1"
                  max={productVariants.length > 0 ? (currentVariant?.stock || 1) : 99}
                  value={quantity}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    const maxStock = productVariants.length > 0 ? (currentVariant?.stock || 1) : 99;
                    setQuantity(Math.min(value, maxStock));
                  }}
                  style={{ textAlign: 'center' }}
                  disabled={isOutOfStock}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setQuantity(q => Math.min(q + 1, productVariants.length > 0 ? (currentVariant?.stock || Infinity) : 99))}
                  disabled={isOutOfStock || (productVariants.length > 0 && quantity >= (currentVariant?.stock || 1)) || (productVariants.length === 0 && quantity >= 99)}
                >
                  +
                </Button>
              </InputGroup>
            </div>

            <div className="mb-3">
              <i className="fas fa-truck text-success me-2 small"></i>
              <span className="text-success small">
                Delivery <b>2–5 Business Days</b>
              </span>
            </div>

            <hr />
            <div className="d-grid gap-3 d-md-block pt-3 border-top mt-4">
              <Button
                variant="warning"
                className="fw-bold me-3"
                onClick={handleAddToCart}
                disabled={isCartBuyDisabled}
              >
                <i className="fas fa-shopping-cart me-2"></i> ADD TO CART
              </Button>
              <Button
                variant="danger"
                className="fw-bold"
                onClick={handleBuyNow}
                disabled={productVariants.length > 0 && (!selectedSize || isOutOfStock)}
              >
                <i className="fas fa-bolt me-2"></i> BUY NOW
              </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Similar Products (Kept the same) */}
      <h3 className="mb-4 fw-bold">More from the {product.category} category</h3>

      <Row className="mb-3 align-items-end">
        <Col md={4}>
          <Form.Label>Max Price (₹): ₹{filterPrice.toLocaleString()}</Form.Label>
          <Form.Range min={0} max={100000} step={100} value={filterPrice} onChange={(e) => setFilterPrice(Number(e.target.value))} />
        </Col>
        <Col md={4}>
          <Form.Label>Sort By:</Form.Label>
          <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name A-Z</option>
          </Form.Select>
        </Col>
      </Row>

      {catLoading ? (
        <div className="text-center py-3">
          <Spinner animation="border" size="sm" />
          </div>
      ) : catError ? (
        <Alert variant="warning">{catError}</Alert>
      ) : filteredAndSortedCategory.length === 0 ? (
        <Alert variant="info">No products found in this category.</Alert>
      ) : (
        <Row xs={1} sm={2} lg={4} className="g-4">
          {filteredAndSortedCategory.map((p) => (
            <Col key={p.id}>
              <Card className="h-100 shadow-sm border-0">
                <Link to={`/product/${p.id}`} className="text-decoration-none text-dark">
                  <div className="d-flex justify-content-center align-items-center p-3" style={{ height: "150px" }}>
                    <Card.Img src={p.images || p.image || "https://via.placeholder.com/120"} style={{ height: "120px", objectFit: "contain" }} />
                  </div>
                  <Card.Body>
                    <Card.Title className="fs-6 fw-bold text-truncate">{p.name || p.title}</Card.Title>
                    <div className="d-flex align-items-center mb-2">
                      <span className="text-warning fw-bold me-2">
                        {p.rating.rate.toFixed(1)} <i className="fas fa-star small"></i>
                      </span>
                      <span className="text-muted small">({p.rating.count})</span>
                    </div>
                    <Card.Text className="fw-bold text-danger fs-5 mt-auto">₹{p.priceINR}</Card.Text>
                    <Button
                      variant="warning"
                      size="sm"
                      className="mt-2"
                      onClick={(e) => {
                        e.preventDefault();
                        dispatch(addToCart({ id: p.id, title: p.name || p.title, price: p.priceValue, image: p.images || p.image, quantity: 1 }));
                        toast.success(`Added "${p.name || p.title}" to cart!`, { position: "top-right", autoClose: 2000 });
                      }}
                    >
                      Add to Cart
                    </Button>
                  </Card.Body>
                </Link>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card className="p-4 mt-5 border-0 shadow-sm">
        <Row>
          <Col md={4} className="border-end">
            <h3 className="fw-bold mb-4">Ratings</h3>
            <div className="d-flex align-items-center mb-3">
              <span className="display-4 fw-bold me-3">{reviewsData.averageRating.toFixed(1)}</span>
              <div>
                <p className="mb-0 fw-bold">{reviewsData.totalRatings} Product Ratings</p>
              </div>
            </div>

            <div className="mb-4">
              {Object.entries(reviewsData.distribution).sort(([a], [b]) => b - a).map(([star, count]) => {
                const total = reviewsData.totalRatings;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                return (
                  <Row key={star} className="align-items-center my-1 g-1">
                    <Col xs={1} className="text-end small text-muted">{star}<FaStar className="text-warning ms-1" size={10} /></Col>
                    <Col xs={9}>
                      <div className="progress" style={{ height: '8px', backgroundColor: '#e9ecef' }}>
                        <div
                          className="progress-bar bg-warning"
                          role="progressbar"
                          style={{ width: `${percentage}%` }}
                          aria-valuenow={percentage}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                    </Col>
                    <Col xs={2} className="text-start small text-muted ps-2">{count}</Col>
                  </Row>
                )
              })}
            </div>

            <h4 className="fw-bold mt-4 mb-3">Review this product</h4>
            <p className="text-muted small">Share your thoughts with other customers</p>
            <Button
              variant="dark"
              onClick={handleWriteReviewClick}
              className="fw-bold"
            >
              Write a review
            </Button>
          </Col>

          {/* --- Right Column: Reviews List --- */}
          <Col md={8} className="ps-md-5">
            <h3 className="fw-bold mb-4">Reviews</h3>

            {reviewsData.reviews.length === 0 ? (
              <div className="p-3 text-center" style={{ backgroundColor: '#e6f7ff', borderRadius: '5px' }}>
                <p className="text-info fw-semibold mb-0">There are no reviews yet.</p>
              </div>
            ) : (
              reviewsData.reviews.map((review, index) => (
                <div key={index} className="border-bottom pb-3 mb-3">
                  <div className="d-flex align-items-center mb-1">
                    {[...Array(5)].map((_, i) => (
                      i < review.rating ? <FaStar key={i} className="text-warning me-1" size={14} /> : <FaRegStar key={i} className="text-muted me-1" size={14} />
                    ))}
                    <span className="fw-bold ms-2">{review.title}</span>
                  </div>
                  <p className="mb-1 small text-muted">by {review.userName || 'Customer'} on {new Date(review.date).toLocaleDateString()}</p>
                  <p className="small">{review.comment}</p> {/* Use 'comment' field */}
                </div>
              ))
            )}
          </Col>
        </Row>
      </Card>

      {/* --- Write Review Modal --- */}
      <Modal show={showReviewModal} onHide={handleCloseReviewModal} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Write a Review</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmitReview}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Your Rating</Form.Label>
              <div>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => setUserRating(star)}
                    style={{ cursor: 'pointer' }}
                    className="me-1"
                  >
                    {star <= userRating ? <FaStar className="text-warning" size={24} /> : <FaRegStar className="text-muted" size={24} />}
                  </span>
                ))}
              </div>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Review Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Summarize your experience"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Your Review</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="What did you like or dislike about the product?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="danger" type="submit" disabled={userRating === 0}>
              Submit Review
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* NOTE: Now functional with ProductSuggestions imported */}
      {product && <ProductSuggestions currentProductId={product.id} category={product.category} />}
    </Container>
  );
}

export default ProductDetailPage;