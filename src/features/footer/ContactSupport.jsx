import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ContactSupport.css";

function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;

    // Submit to FormSubmit
    fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => {
        if (response.ok) {
          setIsSubmitted(true);
          form.reset();
          setTimeout(() => setIsSubmitted(false), 4000);
        } else {
          alert("Something went wrong. Please try again.");
        }
      })
      .catch(() => alert("Network error. Please try again."));
  };

  return (
    <div className="contact-form-container d-flex justify-content-center align-items-center">
      <div className="contact-card p-4 shadow-lg rounded">
        <h2 className="text-center mb-4 contact-title">Contact Us</h2>
        <p className="text-center mb-4 text-muted">
          Have questions or need help? Fill out the form below, and we'll get back to you soon.
        </p>

        {isSubmitted && (
          <div className="alert alert-success text-center" role="alert">
            ✅ Your message has been sent successfully!
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          action="https://formsubmit.co/innomatricstech@gmail.com"
          method="POST"
        >
          {/* Hidden Fields for FormSubmit Options */}
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="box" />
          <input
            type="hidden"
            name="_next"
            value="https://yourdomain.com/thank-you"
          />

          {/* Name */}
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Your Name</label>
            <input
              type="text"
              name="name"
              id="name"
              className="form-control"
              placeholder="Enter your full name"
              required
            />
          </div>

          {/* Email */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              name="email"
              id="email"
              className="form-control"
              placeholder="Enter your email"
              required
            />
          </div>
          {/* Message */}
          <div className="mb-3">
            <label htmlFor="message" className="form-label">Your Message</label>
            <textarea
              name="message"
              id="message"
              className="form-control"
              rows="5"
              placeholder="Write your message here..."
              required
            ></textarea>
          </div>

          {/* Submit Button */}
          <div className="d-grid gap-2">
            <button type="submit" className="btn btn-primary">
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContactForm;
