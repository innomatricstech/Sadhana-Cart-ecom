import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { Navbar, Nav, Container, Button, Modal, Form } from "react-bootstrap";

import { motion } from "framer-motion";
// Redux actions
import { setLocation } from "../redux/store";
import AuthPage from "../pages/LoginPage";
import SecondHeader from "./searchBar/SecondHeader";
import "./Navbar.css";

// Firebase imports for search and auth
import { db } from "../firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";

const auth = getAuth();

/**
 * Fetches product suggestions from Firestore based on the search text.
 * @param {string} searchText - The text entered by the user.
 * @returns {Promise<Array<{id: string, name: string}>>} A list of matching product suggestions.
 */
const fetchSuggestions = async (searchText) => {
    // Placeholder implementation for brevity
    if (!searchText || searchText.trim().length < 2) return [];

    const lowerCaseSearch = searchText.trim().toLowerCase();
    const productsRef = collection(db, "products");
    const q = query(productsRef);

    try {
        const snapshot = await getDocs(q);
        let suggestionsMap = new Map();

        snapshot.docs.forEach(doc => {
            const productData = doc.data();
            const productName = productData.name;
            if (!productName) return;

            if (productName.toLowerCase().includes(lowerCaseSearch)) {
                suggestionsMap.set(productName, doc.id);
            }
        });

        return Array.from(suggestionsMap).map(([name, id]) => ({
            id: id,
            name: name
        }));

    } catch (error) {
        console.error("Error fetching search suggestions:", error);
        return [];
    }
};

const LoginConfirmationModal = ({ show, onClose, userName }) => {
    if (!show) return null;

    return (
        <Modal
            show={show}
            onHide={onClose}
            centered
            dialogClassName="modal-90w"
            className="login-success-modal" // Custom CSS target
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.7, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, type: "spring", damping: 15, stiffness: 300 }}
            >
                <Modal.Body className="p-4 text-center py-5">

                    <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="text-success mb-4"
                    >
                        <i className="fas fa-check-circle"></i>
                    </motion.div>

                    <h4 className="mb-2 fw-bolder text-dark">
                        Welcome Back!
                    </h4>

                    <p className="text-muted mt-3 mb-0">
                        Hello,
                        <span className="fw-bold text-primary mx-1">
                            {userName}
                        </span>!
                        You are now signed in.
                    </p>

                </Modal.Body>
            </motion.div>
        </Modal>
    );
};

const LogoutConfirmationModal = ({ show, onClose }) => {
    if (!show) return null;

    return (
        <Modal
            show={show}
            onHide={onClose}
            centered
            dialogClassName="modal-90w"
            className="logout-success-modal"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.7, y: -50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, type: "spring", damping: 15, stiffness: 300 }}
            >
                <Modal.Body className="p-4 text-center py-5">
                    <motion.div
                        initial={{ rotate: -180, scale: 0.5 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-danger mb-4"
                    >
                        <i className="fas fa-sign-out-alt"></i>
                    </motion.div>

                    <h4 className="mb-2 fw-bold text-danger">
                        Logout Successful!
                    </h4>
                    <p className="text-muted mt-3 mb-0">
                        You've been securely logged out. Redirecting now...
                    </p>
                </Modal.Body>
            </motion.div>
        </Modal>
    );
};


export default function Header() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const searchBarRef = useRef(null);

    // ⭐ location state is read here
    const { location } = useSelector((state) => state.header);
    const cartItems = useSelector((state) => state.cart?.items || []);
    
    // ✅ Use .length to count unique items instead of .reduce to sum quantities.
    const cartCount = cartItems.length;

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [newLocation, setNewLocation] = useState(location || "");
    const [search, setSearch] = useState("");

    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);

    const [showLoginModal, setShowLoginModal] = useState(false);
    // Logout success modal
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    // State to hold the user's name for the login modal
    const [loggedInUserName, setLoggedInUserName] = useState('');


    // Auth State Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    // ⭐ Sync the local modal input state when Redux location changes (important for UX)
    useEffect(() => {
        setNewLocation(location || "");
    }, [location]);

    // KEY FUNCTION: Handle successful login from AuthPage
    const handleLoginSuccess = (user) => {
        // Close the sign-in modal
        closeAuthModal();

        // Determine the name to display (uses display name or email prefix)
        const nameToDisplay = user.displayName || user.email.split('@')[0];
        setLoggedInUserName(nameToDisplay);

        // Show the GREEN animated login success modal
        setShowLoginModal(true);

        // Hide the modal after a short delay
        setTimeout(() => {
            setShowLoginModal(false);
        }, 2000);
    };


    // Logout Handler 
    const handleLogout = async () => {
        try {
            await signOut(auth);
            setShowAuthModal(false);

            // Show the RED logout success modal
            setShowLogoutModal(true);

            // Navigate after a short delay
            setTimeout(() => {
                setShowLogoutModal(false);
                navigate("/");
            }, 2000);

        } catch (error) {
            console.error("Logout Error:", error);
            alert("Failed to log out. Please try again.");
        }
    };

    const openAuthModal = () => setShowAuthModal(true);
    const closeAuthModal = () => setShowAuthModal(false);

    const openLocationModal = () => {
        setNewLocation(location || ""); // Reset modal input to current Redux location on open
        setShowLocationModal(true);
    };
    const closeLocationModal = () => setShowLocationModal(false);

    const saveLocation = () => {
        if (newLocation.trim() !== "") {
            // ⭐ Dispatch action to save the location to Redux
            dispatch(setLocation(newLocation));
            closeLocationModal();
        }
    };

    const goToCart = () => navigate("/cart");

    // 🚀 NEW FUNCTION: Navigate to the orders page
    const goToOrders = () => {
        // You should define the route for your orders page here
        navigate("/orders"); 
    };

    // [ ... Search suggestion logic remains here ... ]
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (search.trim().length > 1) {
                const fetchedSuggestions = await fetchSuggestions(search.trim());
                setSuggestions(fetchedSuggestions);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const handleSuggestionClick = (product) => {
        setSearch(product.name);
        setShowSuggestions(false);
        navigate(`/product/${product.id}`);
    };

    // 🌟 CORE FUNCTION TO HANDLE SEARCH BUTTON CLICK / FORM SUBMISSION
    const handleSearchSubmit = () => {
        if (search.trim()) {
            setShowSuggestions(false);
            // This is the correct navigation to the search results page
            navigate(`/search-results?q=${encodeURIComponent(search.trim())}`);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchSubmit();
        }
    };

    // Hide suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);


    return (
        <>
            <Navbar
                expand="lg"
                className="navbar-custom shadow-sm sticky-top"
                variant="light"
            >
                <Container fluid className="px-3 d-flex flex-wrap">
                    {/* 1. BRAND/LOGO */}
                    <motion.div
                        className="d-flex align-items-center brand-container me-auto"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Navbar.Brand
                            href="/"
                            className="shopclues-logo d-flex align-items-center"
                        >
                            <img src="./Sadhanacart1.png" alt="" style={{width:"25px"}} />
                            <span className="brand-text">Sadhana
                                <span style={{ color: "orangered" }}>Cart</span></span>
                        </Navbar.Brand>
                    </motion.div>
                    
                    {/* 2. RIGHT SIDE ICONS (Mobile) */}
                    <div className="d-flex d-lg-none align-items-center ms-auto">
                        
                        {/* Mobile: My Orders Icon (NEW ADDITION) */}
                        <motion.div 
                            whileTap={{ scale: 0.95 }} 
                            className="me-2"
                            onClick={goToOrders} 
                            style={{ cursor: 'pointer' }}
                        >
                            <Button variant="outline-dark" className="account-button-mobile" title="My Orders">
                                <i className="fas fa-box-open"></i>
                            </Button>
                        </motion.div>


                        {/* Mobile: Account/Sign In Icon */}
                        {currentUser ? (
                            <motion.div whileTap={{ scale: 0.95 }} className="me-2">
                                <Button variant="outline-dark" className="account-button-mobile" onClick={handleLogout} title="Logout">
                                    <i className="fas fa-sign-out-alt"></i>
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div whileTap={{ scale: 0.95 }} className="me-2">
                                <Button variant="outline-dark" className="account-button-mobile" onClick={openAuthModal}>
                                    <i className="fas fa-user"></i>
                                </Button>
                            </motion.div>
                        )}
                        {/* Mobile: Cart Icon */}
                        <motion.div whileTap={{ scale: 0.95 }}>
                            <Button variant="warning" className="cart-button-mobile" onClick={goToCart}>
                                <i className="fas fa-shopping-cart"></i>
                                {/* UPDATED: Mobile Cart Count */}
                                <span className="cart-count-mobile">{cartCount}</span> 
                            </Button>
                        </motion.div>
                    </div>

                    {/* 3. MOBILE SEARCH BAR */}
                    <motion.div
                        ref={searchBarRef}
                        className="search-bar-container-mobile d-lg-none my-2 position-relative w-100"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        style={{ transformOrigin: 'center' }}
                    >
                        <Form
                            className="d-flex search-form"
                            // 🌟 Search is triggered here when submitting the form (e.g., pressing enter)
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSearchSubmit();
                            }}
                        >
                            <Form.Control
                                type="search"
                                placeholder="What is on your mind today?"
                                className="search-input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => {
                                    if (suggestions.length > 0 && search.trim().length > 1) setShowSuggestions(true);
                                }}
                                onKeyDown={handleKeyPress}
                            />
                            <motion.div whileTap={{ scale: 0.95 }}>
                                
                            </motion.div>
                        </Form>

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <motion.div
                                className="suggestions-dropdown p-0 bg-white shadow rounded-bottom border border-top-0"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <ul className="list-unstyled mb-0">
                                    {suggestions.map((product) => (
                                        <li
                                            key={product.id}
                                            className="suggestion-item"
                                            onClick={() => handleSuggestionClick(product)}
                                            tabIndex={0}
                                        >
                                            {product.name}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </motion.div>
                    
                    {/* 4. DESKTOP NAVIGATION/ICONS */}
                    <Navbar.Collapse id="responsive-navbar-nav" className="d-none d-lg-flex flex-grow-1">
                        <Nav className="mx-auto align-items-center flex-grow-1">
                            <motion.div
                                ref={searchBarRef}
                                className="search-bar-container my-2 my-lg-0 position-relative w-100"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.2 }}
                                style={{ transformOrigin: 'center' }}
                            >
                                
                                    <Form
                                        className="d-flex align-items-center justify-content-center gap-2"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            handleSearchSubmit();
                                        }}
                                    >
                                        <Form.Control
                                            type="search"
                                            placeholder="What is on your mind today?"
                                            className="form-control rounded-pill shadow-sm"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onFocus={() => {
                                                if (suggestions.length > 0 && search.trim().length > 1)
                                                    setShowSuggestions(true);
                                            }}
                                            onKeyDown={handleKeyPress}
                                        />
                                        
                                    </Form>

                                {/* Search Suggestions Dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <motion.div
                                        className="suggestions-dropdown p-0 bg-white shadow rounded-bottom border border-top-0"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <ul className="list-unstyled mb-0">
                                            {suggestions.map((product) => (
                                                <li
                                                    key={product.id}
                                                    className="suggestion-item"
                                                    onClick={() => handleSuggestionClick(product)}
                                                    tabIndex={0}
                                                >
                                                    {product.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </motion.div>
                                )}
                            </motion.div>
                        </Nav>

                        {/* Right Side Icons/Links - Desktop */}
                        <Nav className="align-items-center ms-lg-3">
                            
                            
                            {/* 🚀 My Orders Link - NOW IN DESKTOP AND COLLAPSED MENU */}
                            <motion.div
                                className="orders-link me-3 d-flex flex-column align-items-center justify-content-center text-center"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={goToOrders} 
                                style={{ cursor: 'pointer' }}
                            >
                                {/* Changed icon for 'My Orders' */}
                                <i className="fas fa-box-open fa-lg mb-1"></i> 
                                <span className="small fw-semibold" style={{ whiteSpace: 'nowrap' }}>
                                    My Orders
                                </span>
                            </motion.div>


                            {/* CONDITIONAL USER DISPLAY */}
                            {currentUser ? (
                                // LOGGED IN (Desktop View)
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="me-2 d-flex align-items-center">
                                    <div className="text-end me-3" style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                                        <div className="fw-bold text-dark">
                                            Hi, {currentUser.displayName || currentUser.email.split('@')[0]} 👋
                                        </div>
                                        <small className="text-muted" style={{ display: 'block' }}>
                                            {currentUser.email}
                                        </small>
                                    </div>
                                    <Button variant="outline-dark" className="account-button" onClick={handleLogout} title="Logout">
                                        <i className="fas fa-sign-out-alt"></i>
                                        <span className="ms-1">Logout</span>
                                    </Button>
                                </motion.div>
                            ) : (
                                // LOGGED OUT (Desktop View)
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="me-2">
                                    <Button variant="outline-dark" className="account-button" onClick={openAuthModal}>
                                        <i className="fas fa-user me-1"></i>
                                        <span>Sign In</span>
                                    </Button>
                                </motion.div>
                            )}

                            {/* Cart (Desktop View) */}
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button variant="warning" className="cart-button" onClick={goToCart}>
                                    <i className="fas fa-shopping-cart"></i>
                                    <span>Cart </span>
                                    {/* UPDATED: Desktop Cart Count */}
                                    <span className="cart-count">{cartCount}</span> 
                                </Button>
                            </motion.div>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* SECOND HEADER */}
            <SecondHeader />

            {/* Auth Modal - Pass the success handler */}
            <Modal show={showAuthModal} onHide={closeAuthModal} centered>
                <Modal.Body>
                    <AuthPage
                        onClose={closeAuthModal}
                        onLoginSuccess={handleLoginSuccess} // KEY PROP
                    />
                </Modal.Body>
            </Modal>

            {/* Location Modal */}
            <Modal
                show={showLocationModal}
                onHide={closeLocationModal}
                centered
                backdrop="static"
                className="location-modal"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Set Delivery Location 📍</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group>
                                <Form.Label>Enter your location:</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Eg: Chennai, Tamil Nadu"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={closeLocationModal}>
                            Cancel
                        </Button>
                        <Button variant="warning" onClick={saveLocation}>
                            Save Location
                        </Button>
                    </Modal.Footer>
                </motion.div>
            </Modal>
            <LoginConfirmationModal
                show={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                userName={loggedInUserName}
            />
            <LogoutConfirmationModal
                show={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
            />
        </>
    );
}