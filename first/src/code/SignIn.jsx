import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { IoMdHome } from "react-icons/io";
import "./signin.css";
import "./App.css";

const CurveHeader = () => (
  <div className="curve-separator1">
    <svg viewBox="0 0 500 80" preserveAspectRatio="none">
      <path d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z" className="wave-wave-back1" />
      <path d="M0,0 C200,80 400,20 500,40 L500,0 L0,0 Z" className="wave-wave-front1" />
    </svg>
    <div className="curve-content1">
      <div className="curve-icon1">
        <img src="/baby-icon.png" alt="Baby Icon" />
      </div>
      <span className="curve-text1">Shishu Vriddhi</span>
    </div>
  </div>
);

function SignIn() {
  const [form, setForm] = useState({
    phone: "",
    password: "",
    role: "user",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const phoneInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "", general: "" });
  };

  const validateForm = () => {
    const temp = {};
    if (!form.phone) temp.phone = "Phone number is required.";
    if (!form.password) temp.password = "Password is required.";
    return temp;
  };

  const handleLogin = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/login/login", form);
      localStorage.setItem("phone", form.phone);
      localStorage.setItem("role", form.role);

      if (form.role === "doctor") {
        navigate("/doctor-dashboard");
      } else {
        navigate("/child-info");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed.";
      const field = err.response?.data?.field;

      if (field && (field === "phone" || field === "password")) {
        setErrors({ [field]: msg });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container1">
      <div className="main-wrapper-two1">
        <div className="left-section1">
          <video className="instruction-video" autoPlay muted loop playsInline>
            <source src="/video1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        <div className="right-section1">
          <CurveHeader />
          <button className="back-home-button" onClick={() => navigate("/")}>
            <IoMdHome size={35} />
          </button>

          <div className="signin-wrapper">
            <div className="form-container">
              <h2>Sign In</h2>

              {/* Role Selection at the Top */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">🧑‍⚕️</span>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className={`custom-input ${errors.role ? "input-error" : ""}`}
                  >
                    <option value="user">Parent</option>
                    <option value="doctor">Pediatrician</option>
                  </select>
                </div>
                {errors.role && <div className="field-error">{errors.role}</div>}
              </div>

              {/* Phone Input */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">📞</span>
                  <input
                    ref={phoneInputRef}
                    type="text"
                    name="phone"
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={handleChange}
                    className={`custom-input ${errors.phone ? "input-error" : ""}`}
                  />
                </div>
                {errors.phone && <div className="field-error">{errors.phone}</div>}
              </div>

              {/* Password Input */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={handleChange}
                    className={`custom-input ${errors.password ? "input-error" : ""}`}
                  />
                </div>
                {errors.password && <div className="field-error">{errors.password}</div>}

                {/* Forgot Password */}
                <p className="forgot-password-text">
                  <span
                    className="forgot-password-link"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot Password?
                  </span>
                </p>
              </div>

              {/* General Error */}
              {errors.general && <div className="general-error">{errors.general}</div>}

              {/* Submit Button */}
              <button className="signin-button" onClick={handleLogin} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>

              {/* Sign Up Link */}
              <p className="signup-text">
                Don’t have an account?{" "}
                <span
                  className="signup-link"
                  onClick={() => {
                    if (form.role === "doctor") {
                      navigate("/signup-doctor");
                    } else {
                      navigate("/signup");
                    }
                  }}
                >
                  Sign up as {form.role === "doctor" ? "Doctor" : "Parent"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn;
