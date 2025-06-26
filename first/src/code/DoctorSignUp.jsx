import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { IoMdHome } from "react-icons/io";
import translations from "./translatations23";
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
    license_id: "",
    email_id: "",
    qualification: "",
    specialization: ""
  });

  const [step, setStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const selectedLang = location.state?.lang || "en";
  const t = translations[selectedLang] || translations["en"];

  const phoneRef = useRef(null);
  const otpRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (step === 1) phoneRef.current?.focus();
    if (step === 3 && !otpVerified) otpRef.current?.focus();
    if (step === 4) passwordRef.current?.focus();
  }, [step, otpVerified]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
    setSuccess("");
  };

  const validateStep1 = () => {
    const temp = {};
    if (!form.phone || !/^\d{10}$/.test(form.phone)) temp.phone = t.errors.invalidPhone;
    if (!form.doctor_name.trim()) temp.doctor_name = t.errors.nameRequired;
    if (!form.license_id.trim()) temp.license_id = t.errors.licenseRequired;
    if (!form.email_id.trim() || !/\S+@\S+\.\S+/.test(form.email_id)) temp.email_id = t.errors.emailInvalid;
    return temp;
  };

  const validateStep2 = () => {
    const temp = {};
    if (!form.qualification.trim()) temp.qualification = t.errors.qualificationRequired;
    if (!form.specialization.trim()) temp.specialization = t.errors.specializationRequired;
    return temp;
  };

  const validateStep4 = () => {
    const temp = {};
    if (!form.password) temp.password = t.errors.passwordRequired;
    else if (form.password.length < 6) temp.password = t.errors.passwordLength;
    if (form.password !== form.rePassword) temp.rePassword = t.errors.passwordMismatch;
    return temp;
  };

  const handleRequestOTP = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login/request_otp2", {
        phone: form.phone,
        language: selectedLang,
      });
      setOtpSent(true);
      setSuccess(res.data.message);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "Failed to send OTP." });
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^\d{4}$/.test(form.otp)) return setErrors({ otp: t.errors.otpInvalid });

    try {
      const res = await axios.post("http://localhost:5000/login/verify_otp", {
        phone: form.phone,
        otp: form.otp,
        language: selectedLang,
      });
      setOtpVerified(true);
      setSuccess(res.data.message);
      setStep(4);
    } catch (err) {
      setErrors({ general: err.response?.data?.message || "OTP verification failed." });
    }
  };

  const handleNext = () => {
    let validation = {};
    if (step === 1) validation = validateStep1();
    else if (step === 2) validation = validateStep2();
    else if (step === 4) validation = validateStep4();

    if (Object.keys(validation).length) {
      setErrors(validation);
    } else {
      if (step === 2) {
        handleRequestOTP();
        setStep(3);
      } else if (step < 4) {
        setStep((prev) => prev + 1);
      } else {
        handleSignUp();
      }
    }
  };

  const handleSignUp = async () => {
    const validation = validateStep4();
    if (Object.keys(validation).length) return setErrors(validation);

    try {
      const res = await axios.post("http://localhost:5000/login/doctor/signup", {
        ...form,
        role: "doctor",
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
          <img className="instruction-video" src="/Female-Doctor-Transparent-PNG.png" alt="Female Doctor" />
        </div>

        <div className="right-section1">
          <CurveHeader />
          <button className="back-home-button" onClick={() => navigate("/", { state: { lang: selectedLang } })}>
            <IoMdHome size={35} />
          </button>

          <div className="signin-wrapper">
            <div className="form-container">
              <h2>{t.doctorSignUp}</h2>
              {errors.general && <div className="general-error">{errors.general}</div>}
              {success && <div className="success-message">{success}</div>}

              {/* Step 1: Personal Details */}
              {step === 1 && (
                <>
                  {[
                    { name: "doctor_name", icon: "👨‍⚕️", placeholder: t.namePlaceholder },
                    { name: "phone", icon: "📞", placeholder: t.phonePlaceholder, ref: phoneRef },
                    { name: "email_id", icon: "📧", placeholder: t.emailPlaceholder },
                    { name: "license_id", icon: "🆔", placeholder: t.licensePlaceholder },
                  ].map(({ name, icon, placeholder, ref }) => (
                    <div className="input-wrapper" key={name}>
                      <div className="input-row">
                        <span className="input-icon">{icon}</span>
                        <input
                          type="text"
                          ref={ref || null}
                          name={name}
                          placeholder={placeholder}
                          value={form[name]}
                          onChange={handleChange}
                          className={`custom-input ${errors[name] ? "input-error" : ""}`}
                        />
                      </div>
                      {errors[name] && <div className="field-error">{errors[name]}</div>}
                    </div>
                  ))}
                </>
              )}

              {/* Step 2: Education */}
              {step === 2 && (
                <>
                  {[
                    { name: "qualification", icon: "🎓", placeholder: t.qualificationPlaceholder },
                    { name: "specialization", icon: "🩺", placeholder: t.specializationPlaceholder },
                  ].map(({ name, icon, placeholder }) => (
                    <div className="input-wrapper" key={name}>
                      <div className="input-row">
                        <span className="input-icon">{icon}</span>
                        <input
                          type="text"
                          name={name}
                          placeholder={placeholder}
                          value={form[name]}
                          onChange={handleChange}
                          className={`custom-input ${errors[name] ? "input-error" : ""}`}
                        />
                      </div>
                      {errors[name] && <div className="field-error">{errors[name]}</div>}
                    </div>
                  ))}
                </>
              )}

              {/* Step 3: OTP */}
              {step === 3 && (
                <>
                  <div className="input-wrapper">
                    <div className="input-row">
                      <span className="input-icon">🔐</span>
                      <input
                        ref={otpRef}
                        type="text"
                        name="otp"
                        placeholder={t.otpPlaceholder}
                        value={form.otp}
                        onChange={handleChange}
                        className={`custom-input ${errors.otp ? "input-error" : ""}`}
                      />
                    </div>
                    {errors.otp && <div className="field-error">{errors.otp}</div>}
                  </div>
                  <button className="resend-otp-btn" onClick={handleRequestOTP}>{t.resendOTP}</button>
                </>
              )}

              {/* Step 4: Password Setup */}
              {step === 4 && (
                <>
                  {[
                    { name: "password", icon: "🔑", placeholder: t.passwordPlaceholder },
                    { name: "rePassword", icon: "🔒", placeholder: t.rePasswordPlaceholder },
                  ].map(({ name, icon, placeholder }) => (
                    <div className="input-wrapper" key={name}>
                      <div className="input-row">
                        <span className="input-icon">{icon}</span>
                        <input
                          ref={name === "password" ? passwordRef : null}
                          type="password"
                          name={name}
                          placeholder={placeholder}
                          value={form[name]}
                          onChange={handleChange}
                          className={`custom-input ${errors[name] ? "input-error" : ""}`}
                        />
                      </div>
                      {errors[name] && <div className="field-error">{errors[name]}</div>}
                    </div>
                  ))}
                </>
              )}

              <button onClick={step === 3 && !otpVerified ? handleVerifyOTP : handleNext} className="submit-btn">
                {step === 3 && !otpVerified ? t.verifyOTP : step === 4 ? t.signUpButton : t.nextButton}
              </button>
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

export default DoctorSignUp;
