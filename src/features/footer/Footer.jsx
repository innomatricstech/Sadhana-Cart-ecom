import React, { useEffect } from "react";
import { Link, useLocation } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import "./Footer.css";

const Footer = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [location.pathname]);

  return (
    <footer className="footer text-light pt-5">
      <div className="container">
        <div className="row">

          {/* Column 1: Logo and About Us */}
          <div className="col-md-3 col-sm-6 mb-4">
            <div className="d-flex align-items-center mb-3">
              <img src="/Sadhanacart1.png" alt="SadhanaCart Logo" className="footer-logo-img me-2" />
              <h5 className="mb-0 footer-logo-text">Sadhana <span style={{ color: "orangered" }}>Cart</span></h5>
            </div>
            <h6 className="footer-heading mb-2">About Us</h6>
            <p className="footer-text mb-4">
              SadhanaCart is a multipurpose Ecommerce Platform for Electronics, Fashion, Groceries, Gifts, Medical, and more.
            </p>
            <p className="footer-copyright mb-0">
              Copyright © 2024-2025, All Right <br />
              Reserved Sadhan Cart Team.

              <p>Developed by Innomatrics Technologies</p>
            </p>
          </div>

          {/* Column 2: Contact Info */}
          <div className="col-md-3 col-sm-6 mb-4">
            <h6 className="footer-heading mb-2">Call Us</h6>
            <p className="mb-4">
              <a href="tel:+919448810877" className="text-light text-decoration-none">
                +91 94488 10877
              </a>
            </p>

            <h6 className="footer-heading mb-2">Mail Us</h6>
            <p className="mb-4">
              <a
                href="mailto:support@sadhanacart.com?subject=Customer%20Inquiry&body=Hello%20SadhanaCart%20Team,%0A%0AType%20your%20message%20here..."
                className="text-light text-decoration-none"
              >
                support@sadhanacart.com
              </a>
            </p>

            <h6 className="footer-heading mb-2">Working Hours</h6>
            <p className="mb-0">Monday to Saturday</p>
            <p className="mb-0">9:00 AM – 6:00 PM</p>
          </div>

          {/* Column 3: Useful Links */}
          <div className="col-md-3 col-sm-6 mb-4">
            <h6 className="footer-heading mb-2">Useful Links</h6>
            <ul className="list-unstyled footer-link-list">
              <li><Link to="/return-policy" className="text-light text-decoration-none">Return Policy</Link></li>
              <li><Link to="/shipping-policy" className="text-light text-decoration-none">Shipping Policy</Link></li>
              <li><Link to="/terms-and-conditions" className="text-light text-decoration-none">Terms & Conditions</Link></li>
              <li><Link to="/about-us" className="text-light text-decoration-none">About Us</Link></li>
              <li>
                <a href="https://wa.me/919448810877" target="_blank" rel="noopener noreferrer" className="text-light text-decoration-none">
                  Chat With Us
                </a>
              </li>
              <li><Link to="/faqs" className="text-light text-decoration-none">FAQs</Link></li>
            </ul>
          </div>

          {/* Column 4: Location */}
          <div className="col-md-3 col-sm-6 mb-4">
            <h6 className="footer-heading mb-2">Located At</h6>
            <p className="text-warning fw-semibold mb-1">Registered Office</p>
            <address className="footer-address">
              Ground Floor, Ward No. 24, A No. 4-14-155/36A,<br />
              Teachers Colony, Near LIC Office,<br />
              Gangawati – 583222, District Koppal,<br />
              Karnataka.
            </address>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
