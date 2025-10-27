import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// ✅ Common Components
import Header from "./components/Navbar";
import Footer from "../src/features/footer/Footer";

// ✅ Pages
import HomePage from "./pages/Home";
import ProductDetailPage from "./pages/ProductDetailPage";
import CustomerSupportCenter from "./pages/CustomerService";
import AuthPage from "./pages/LoginPage";
import CategoryPage from "./pages/CategoryPage";

// ✅ Cart & Checkout
import CartPage from "./components/cartPage/CartPage";
import CheckoutPage from "./components/cartPage/CheckoutPage";
import CashOnDelivery from "./components/cartPage/CashOnDelivey";
import OrderConformPage from "./components/cartPage/OrderConformPage";
import ViewOrderDetails from "./components/cartPage/ViewOrderDetails"; 

// ✅ Category Components
import Fashion from "./components/category/Fashion";
import Accessories from "./components/category/Accessories";
import Cosmetics from "./components/category/Cosmetics";
import Toys from "./components/category/Toys";
import Stationary from "./components/category/Stationary";
import Book from "./components/category/Book";
import PhotoFrame from "./components/category/PhotoFrame";
import Footwears from "./components/category/Footwears";
import Jewellery from "./components/category/Jewellery";
import Mens from "./components/category/Mens";
import Kids from "./components/category/Kids";
import Electronics from "./components/category/Electronics";
import PersonalCare from "./components/category/PersonalCare";

// ✅ Footer Pages
import ReturnPolicy from "./features/footer/ReturnPolicy";
import ShippingPolicy from "./features/footer/ShippingPolicy";
import TermsAndConditions from "./features/footer/TermsAndConditions";
import AboutUs from "./features/footer/AboutUs";
import Faqs from "./features/footer/Faqs";

// ✅ New Contact Form Page
import ContactForm from "../src/features/footer/ContactSupport";  // 👈 உங்கள் ContactForm.jsx இங்கே இருக்கும் பாதையில் import பண்ணவும்

// ✅ Temporary Admin Pages
const AdminLogin = () => <div className="text-center p-5">Admin Login Page</div>;
const AdminDashboard = () => <div className="text-center p-5">Admin Dashboard Page</div>;

const AppContent = () => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");

    return (
        <>
            {!isAdminRoute && <Header />}

            <main>
                <Routes>
                    {/* 🔹 Admin Routes */}
                    <Route path="/admin" element={<AdminLogin />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />

                    {/* 🔹 Main Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<AuthPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/cod" element={<CashOnDelivery />} />
                    <Route path="/order-confirm" element={<OrderConformPage />} /> 
                    <Route path="/orders" element={<ViewOrderDetails />} /> 
                    <Route path="/support" element={<CustomerSupportCenter />} />

                    {/* 🔹 Product & Category Routes */}
                    <Route path="/category" element={<CategoryPage />} />
                    <Route path="/category/:categoryName" element={<CategoryPage />} />
                    <Route path="/product/:id" element={<ProductDetailPage />} />

                    {/* 🔹 Individual Category Pages */}
                    <Route path="/fashion" element={<Fashion />} />
                    <Route path="/accessories" element={<Accessories />} />
                    <Route path="/cosmetics" element={<Cosmetics />} />
                    <Route path="/toys" element={<Toys />} />
                    <Route path="/stationary" element={<Stationary />} />
                    <Route path="/book" element={<Book />} />
                    <Route path="/photoframe" element={<PhotoFrame />} />
                    <Route path="/footwears" element={<Footwears />} />
                    <Route path="/jewellery" element={<Jewellery />} />
                    <Route path="/mens" element={<Mens />} />
                    <Route path="/kids" element={<Kids />} />
                    <Route path="/electronics" element={<Electronics />} />
                    <Route path="/personal-care" element={<PersonalCare />} />

                    {/* 🔹 Footer Policy Pages */}
                    <Route path="/return-policy" element={<ReturnPolicy />} />
                    <Route path="/shipping-policy" element={<ShippingPolicy />} />
                    <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/faqs" element={<Faqs />} />

                    {/* 🎯 New Contact Page Route */}
                    <Route path="/contact" element={<ContactForm />} />   {/* 👈 இதுதான் முக்கியம் */}

                    {/* 🔹 404 Fallback */}
                    <Route
                        path="*"
                        element={
                            <div className="text-center mt-5 p-5">
                                <h2>404 - Page Not Found</h2>
                                <p className="text-muted">The page you are looking for doesn’t exist.</p>
                            </div>
                        }
                    />
                </Routes>
            </main>

            {!isAdminRoute && <Footer />}
        </>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
