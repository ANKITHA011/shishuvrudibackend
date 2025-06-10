import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import translations from "./translations";
import "./signin.css";
import { IoMdHome } from "react-icons/io";

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
  const [form, setForm] = useState({ phone: "", password: "", language: "", role: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const phoneInputRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const lang = location.state?.lang || "en";
    setForm((prev) => ({ ...prev, language: lang }));
    phoneInputRef.current?.focus();
  }, [location.state]);

  const t = translations[form.language || "en"];

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "", general: "" }));
  };

  const validateForm = () => {
    const temp = {};
    if (!form.phone) temp.phone = t.errors.phoneRequired;
    if (!form.password) temp.password = t.errors.passwordRequired;
    if (!form.language) temp.language = t.errors.languageRequired;
    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/login/login", form);
      localStorage.setItem("phone", form.phone);
      localStorage.setItem("language", form.language);
      navigate("/child-info");
    } catch (err) {
      const msg = err.response?.data?.message || t.errors.loginFailed;
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
          <button className="back-home-button" onClick={() => navigate("/", { state: { lang: form.language } })}>
  <IoMdHome size={35}/>
</button>

          <div className="signin-wrapper">
            <div className="form-container">
              <h2>{t.title}</h2>

              {["phone", "password"].map((field) => (
                <div key={field} className="input-wrapper">
                  <div className="input-row">
                    <span className="input-icon">{field === "phone" ? "📞" : "🔒"}</span>
                    <input
                      ref={field === "phone" ? phoneInputRef : null}
                      type={field === "phone" ? "text" : "password"}
                      name={field}
                      placeholder={t[`${field}Placeholder`]}
                      value={form[field]}
                      onChange={handleChange}
                      className={`custom-input ${errors[field] ? "input-error" : ""}`}
                    />
                  </div>
                  {errors[field] && <div className="field-error">{errors[field]}</div>}

                  {field === "password" && (
                    <p className="forgot-password-text">
                      <span
                        className="forgot-password-link"
                        onClick={() => navigate("/forgot-password", { state: { lang: form.language } })}
                      >
                        {t.forgotPassword || "Forgot Password?"}
                      </span>
                    </p>
                  )}
                </div>
              ))}

              {errors.general && <div className="general-error">{errors.general}</div>}

              <button className="signin-button" onClick={handleLogin} disabled={loading}>
                {loading ? `${t.signInButton}...` : t.signInButton}
              </button>

              <p className="signup-text">
                {t.signupPrompt}{" "}
                <span
                  className="signup-link"
                  onClick={() => navigate("/signup", { state: { lang: form.language } })}
                >
                  {t.signupLink}
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
