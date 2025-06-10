import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import translations from "./translations";
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

function SignUp() {
  const [form, setForm] = useState({
    phone: "",
    otp: "",
    password: "",
    rePassword: "",
    parent_name: "",
    relation: "",
    role: "user",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const selectedLang = location.state?.lang || "en";
  const t = translations[selectedLang] || translations["en"];

  // 👉 Refs for input fields
  const phoneRef = useRef(null);
  const otpRef = useRef(null);
  const passwordRef = useRef(null);

  // 👉 Auto-focus based on current form step
  useEffect(() => {
    if (!otpSent) {
      phoneRef.current?.focus();
    } else if (otpSent && !otpVerified) {
      otpRef.current?.focus();
    } else if (otpVerified) {
      passwordRef.current?.focus();
    }
  }, [otpSent, otpVerified]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "", general: "" }));
    setSuccess("");
  };

  const validateInitial = () => {
    const temp = {};
    if (!form.phone || !/^\d{10}$/.test(form.phone)) temp.phone = t.errors.invalidPhone;
    if (!form.parent_name.trim()) temp.parent_name = t.errors.nameRequired;
    else if (!/^[a-zA-Z\s]{2,50}$/.test(form.parent_name)) temp.parent_name = t.errors.nameInvalid;
    if (!form.relation) temp.relation = t.errors.relationRequired;
    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleRequestOTP = async () => {
    if (!validateInitial()) return;
    try {
      const res = await axios.post("http://localhost:5000/login/request_otp", {
        phone: form.phone,
        language: selectedLang,
      });
      setOtpSent(true);
      setSuccess(res.data.message);
      setErrors({});
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "❌ Failed to send OTP." });
    }
  };

  const handleVerifyOTP = async () => {
    if (!form.otp || !/^\d{4}$/.test(form.otp)) {
      setErrors({ otp: t.errors.otpInvalid });
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/login/verify_otp", {
        phone: form.phone,
        otp: form.otp,
        language: selectedLang,
      });
      setOtpVerified(true);
      setSuccess(res.data.message);
      setErrors({});
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "❌ OTP verification failed." });
    }
  };

  const handleSignUp = async () => {
    const temp = {};
    if (!otpVerified) temp.general = t.errors.verifyOtpFirst;
    if (!form.password) temp.password = t.errors.passwordRequired;
    else if (form.password.length < 6) temp.password = t.errors.passwordLength;
    if (form.password !== form.rePassword) temp.rePassword = t.errors.passwordMismatch;

    setErrors(temp);
    if (Object.keys(temp).length) return;

    try {
      const res = await axios.post("http://localhost:5000/login/create_account", {
        phone: form.phone,
        password: form.password,
        parent_name: form.parent_name,
        relation: form.relation,
        role: form.role,
        language: selectedLang,
      });
      setSuccess(res.data.message);
      setTimeout(() => navigate("/signin", { state: { lang: selectedLang } }), 1500);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Signup failed." });
    }
  };

  return (
    <div className="container1">
      <div className="main-wrapper-two1">
        <div className="left-section1">
          <video className="instruction-video" autoPlay muted loop playsInline>
            <source src="/video1.mp4" type="video/mp4" />
          </video>
        </div>

        <div className="right-section1">
          <CurveHeader />
          <div className="signin-wrapper">
            <div className="form-container">
              <h2>{t.signup}</h2>

              {errors.general && <div className="general-error">{errors.general}</div>}
              {success && <div className="success-message">{success}</div>}

              {/* Step 1: Initial details and OTP request */}
              {!otpSent && (
                <>
                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">📞</span>
                      <input
                        ref={phoneRef}
                        type="text"
                        name="phone"
                        placeholder={t.phonePlaceholder}
                        onChange={handleChange}
                        className={`custom-input ${errors.phone ? "input-error" : ""}`}
                        value={form.phone}
                      />
                    </div>
                    {errors.phone && <div className="field-error">{errors.phone}</div>}
                  </div>

                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">👤</span>
                      <input
                        type="text"
                        name="parent_name"
                        placeholder={t.namePlaceholder}
                        onChange={handleChange}
                        className={`custom-input ${errors.parent_name ? "input-error" : ""}`}
                        value={form.parent_name}
                      />
                    </div>
                    {errors.parent_name && <div className="field-error">{errors.parent_name}</div>}
                  </div>

                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">👨‍👩‍👧</span>
                      <select
                        name="relation"
                        onChange={handleChange}
                        className={`custom-input ${errors.relation ? "input-error" : ""}`}
                        value={form.relation}
                      >
                        <option value="">{t.relationPlaceholder}</option>
                        <option value="Father">{t.relationOptions.father}</option>
                        <option value="Mother">{t.relationOptions.mother}</option>
                        <option value="Guardian">{t.relationOptions.guardian}</option>
                      </select>
                    </div>
                    {errors.relation && <div className="field-error">{errors.relation}</div>}
                  </div>

                  <button className="signin-button" onClick={handleRequestOTP}>
                    {t.generateOTP}
                  </button>
                </>
              )}

              {/* Step 2: OTP Verification */}
              {otpSent && !otpVerified && (
                <>
                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">🔐</span>
                      <input
                        ref={otpRef}
                        type="text"
                        name="otp"
                        placeholder={t.enterOTP}
                        onChange={handleChange}
                        className={`custom-input ${errors.otp ? "input-error" : ""}`}
                        value={form.otp}
                      />
                    </div>
                    {errors.otp && <div className="field-error">{errors.otp}</div>}
                  </div>
                  <p className="signup-link" onClick={handleRequestOTP}>
                    {t.resendOTP}
                  </p>
                  <button className="signin-button" onClick={handleVerifyOTP}>
                    {t.verifyOTP}
                  </button>
                </>
              )}

              {/* Step 3: Password Creation */}
              {otpVerified && (
                <>
                  <h3>{t.createPasswordTitle}</h3>

                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">🔒</span>
                      <input
                        ref={passwordRef}
                        type="password"
                        name="password"
                        placeholder={t.passwordPlaceholder}
                        onChange={handleChange}
                        className={`custom-input ${errors.password ? "input-error" : ""}`}
                        value={form.password}
                      />
                    </div>
                    {errors.password && <div className="field-error">{errors.password}</div>}
                  </div>

                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">🔒</span>
                      <input
                        type="password"
                        name="rePassword"
                        placeholder={t.rePasswordPlaceholder}
                        onChange={handleChange}
                        className={`custom-input ${errors.rePassword ? "input-error" : ""}`}
                        value={form.rePassword}
                      />
                    </div>
                    {errors.rePassword && <div className="field-error">{errors.rePassword}</div>}
                  </div>

                  <button className="signin-button" onClick={handleSignUp}>
                    {t.signUpButton}
                  </button>
                </>
              )}

              <p className="signup-text">
                {t.alreadyAccount}{" "}
                <span
                  className="signup-link"
                  onClick={() => navigate("/signin", { state: { lang: selectedLang } })}
                >
                  {t.signInLink}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
