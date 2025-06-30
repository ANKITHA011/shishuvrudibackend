import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { IoMdHome } from "react-icons/io";
import { FaUserMd, FaUser } from "react-icons/fa";
import "./signin.css";
import "./App.css";
import { UI_MESSAGES } from "./messages"; // 👈 Translation file

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
  const location = useLocation();
  const selectedLang = location.state?.lang || "en"; // ✅ Language from previous screen
  const msg = UI_MESSAGES[selectedLang] || UI_MESSAGES.en;

  const [form, setForm] = useState({
    phone: "",
    password: "",
    role: "user",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const phoneInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    phoneInputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "", general: "" });
  };

  const validateForm = () => {
    const temp = {};
    if (!form.phone) temp.phone = msg.phoneRequired || "Phone number is required.";
    if (!form.password) temp.password = msg.passwordRequired || "Password is required.";
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
      const res = await axios.post("http://localhost:5000/login/login", {
        ...form,
        language: selectedLang, // ✅ Pass selected language to backend
      });

      const { userid, name } = res.data;

      localStorage.setItem("phone", form.phone);
      localStorage.setItem("role", form.role);

      if (form.role === "doctor") {
        localStorage.setItem("doctorId", userid);
        localStorage.setItem("doctorName", name);
        localStorage.setItem("selectedLang",selectedLang);
        navigate("/doctor-dashboard");
      } else {
        localStorage.setItem("userId", userid);
        localStorage.setItem("parentName", name);
        localStorage.setItem("selectedLang",selectedLang);
        navigate("/child-info");
      }
    } catch (err) {
      const msgText = err.response?.data?.message || "Login failed.";
      const field = err.response?.data?.field;
      if (field && (field === "phone" || field === "password")) {
        setErrors({ [field]: msgText });
      } else {
        setErrors({ general: msgText });
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
          <button className="back-home-button" onClick={() => navigate("/",{ state: { lang: language } })}>
            <IoMdHome size={35} />
          </button>

          <div className="signin-wrapper">
            <div className="form-container">
              <h2>{msg.signIn}</h2>

              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">
                    {form.role === "doctor" ? <FaUserMd size={20} /> : <FaUser size={20} />}
                  </span>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className={`custom-input ${errors.role ? "input-error" : ""}`}
                  >
                    <option value="user">{msg.parent}</option>
                    <option value="doctor">{msg.pediatrician}</option>
                  </select>
                </div>
                {errors.role && <div className="field-error">{errors.role}</div>}
              </div>

              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">📞</span>
                  <input
                    ref={phoneInputRef}
                    type="text"
                    name="phone"
                    placeholder={msg.phonePlaceholder}
                    value={form.phone}
                    onChange={handleChange}
                    className={`custom-input ${errors.phone ? "input-error" : ""}`}
                  />
                </div>
                {errors.phone && <div className="field-error">{errors.phone}</div>}
              </div>

              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    name="password"
                    placeholder={msg.passwordPlaceholder}
                    value={form.password}
                    onChange={handleChange}
                    className={`custom-input ${errors.password ? "input-error" : ""}`}
                  />
                </div>
                {errors.password && <div className="field-error">{errors.password}</div>}
                <p className="forgot-password-text">
                  <span className="forgot-password-link" onClick={() => navigate("/forgot-password")}>
                    {msg.forgotPassword}
                  </span>
                </p>
              </div>

              {errors.general && <div className="general-error">{errors.general}</div>}

              <button className="signin-button" onClick={handleLogin} disabled={loading}>
                {loading ? msg.signingIn : msg.signIn}
              </button>

              <p className="signup-text">
                {msg.noAccount}{" "}
                <span
                  className="signup-link"
                  onClick={() => {
                    const path = form.role === "doctor" ? "/signup-doctor" : "/signup";
                    navigate(path, { state: { lang: selectedLang } });
                  }}
                >
                  {msg.signup} {form.role === "doctor" ? msg.pediatrician : msg.parent}
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
