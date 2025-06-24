import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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

function DoctorSignUp() {
  const [form, setForm] = useState({
    phone: "",
    otp: "",
    doctor_name: "",
    password: "",
    rePassword: "",
  });

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const phoneRef = useRef(null);
  const otpRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (!otpSent) phoneRef.current?.focus();
    else if (!otpVerified) otpRef.current?.focus();
    else passwordRef.current?.focus();
  }, [otpSent, otpVerified]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
    setSuccess("");
  };

  const validateInitial = () => {
    const temp = {};
    if (!form.phone || !/^\d{10}$/.test(form.phone)) temp.phone = "Enter a valid 10-digit phone number.";
    if (!form.doctor_name.trim()) temp.doctor_name = "Doctor name is required.";
    return temp;
  };

  const handleRequestOTP = async () => {
    const temp = validateInitial();
    if (Object.keys(temp).length) return setErrors(temp);

    try {
      const res = await axios.post("http://localhost:5000/login/request_otp", {
        phone: form.phone,
        language: "en",
      });
      setOtpSent(true);
      setSuccess(res.data.message);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Failed to send OTP." });
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^\d{4}$/.test(form.otp)) {
      return setErrors({ otp: "Invalid OTP format." });
    }

    try {
      const res = await axios.post("http://localhost:5000/login/verify_otp", {
        phone: form.phone,
        otp: form.otp,
        language: "en",
      });
      setOtpVerified(true);
      setSuccess(res.data.message);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "OTP verification failed." });
    }
  };

  const handleSignUp = async () => {
    const temp = {};
    if (!form.password || form.password.length < 6) temp.password = "Password must be at least 6 characters.";
    if (form.password !== form.rePassword) temp.rePassword = "Passwords do not match.";
    if (!otpVerified) temp.general = "Please verify OTP first.";

    if (Object.keys(temp).length) return setErrors(temp);

    try {
      const res = await axios.post("http://localhost:5000/login/create_account", {
        phone: form.phone,
        password: form.password,
        doctor_name: form.doctor_name,
        role: "doctor",
        language: "en",
      });

      setSuccess(res.data.message);
      setTimeout(() => navigate("/signin"), 1500);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Signup failed." });
    }
  };

  return (
    <div className="container1">
      <div className="main-wrapper-two1">
        <div className="left-section1">
        <img
  className="instruction-video"
  src="/Female-Doctor-Transparent-PNG.png"
  alt="Female Doctor"
/>

        </div>

        <div className="right-section1">
          <CurveHeader />
          <button className="back-home-button" onClick={() => navigate("/")}>
            <IoMdHome size={35} />
          </button>
          <div className="signin-wrapper">
            <div className="form-container">
              <h2>Doctor Sign Up</h2>

              {errors.general && <div className="general-error">{errors.general}</div>}
              {success && <div className="success-message">{success}</div>}

              {!otpSent && (
                <>
                  <div className="input-wrapper">
                    <input
                      ref={phoneRef}
                      type="text"
                      name="phone"
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={handleChange}
                      className={`custom-input ${errors.phone ? "input-error" : ""}`}
                    />
                    {errors.phone && <div className="field-error">{errors.phone}</div>}
                  </div>

                  <div className="input-wrapper">
                    <input
                      type="text"
                      name="doctor_name"
                      placeholder="Doctor Name"
                      value={form.doctor_name}
                      onChange={handleChange}
                      className={`custom-input ${errors.doctor_name ? "input-error" : ""}`}
                    />
                    {errors.doctor_name && <div className="field-error">{errors.doctor_name}</div>}
                  </div>

                  <button className="signin-button" onClick={handleRequestOTP}>
                    Generate OTP
                  </button>
                </>
              )}

              {otpSent && !otpVerified && (
                <>
                  <div className="input-wrapper">
                    <input
                      ref={otpRef}
                      type="text"
                      name="otp"
                      placeholder="Enter OTP"
                      value={form.otp}
                      onChange={handleChange}
                      className={`custom-input ${errors.otp ? "input-error" : ""}`}
                    />
                    {errors.otp && <div className="field-error">{errors.otp}</div>}
                  </div>

                  <button className="signin-button" onClick={handleVerifyOTP}>
                    Verify OTP
                  </button>
                </>
              )}

              {otpVerified && (
                <>
                  <div className="input-wrapper">
                    <input
                      ref={passwordRef}
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={form.password}
                      onChange={handleChange}
                      className={`custom-input ${errors.password ? "input-error" : ""}`}
                    />
                    {errors.password && <div className="field-error">{errors.password}</div>}
                  </div>

                  <div className="input-wrapper">
                    <input
                      type="password"
                      name="rePassword"
                      placeholder="Confirm Password"
                      value={form.rePassword}
                      onChange={handleChange}
                      className={`custom-input ${errors.rePassword ? "input-error" : ""}`}
                    />
                    {errors.rePassword && <div className="field-error">{errors.rePassword}</div>}
                  </div>

                  <button className="signin-button" onClick={handleSignUp}>
                    Sign Up
                  </button>
                </>
              )}

              <p className="signup-text">
                Already have an account?{" "}
                <span className="signup-link" onClick={() => navigate("/signin")}>
                  Sign In
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorSignUp;
