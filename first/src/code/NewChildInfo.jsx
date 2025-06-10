import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./newchild.css";

const CurveHeader = () => (
    <div className="curve-separator100">
        <svg viewBox="0 0 500 80" preserveAspectRatio="none">
            <path d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z" className="wave-wave-back5" />
            <path d="M0,0 C200,80 400,20 500,40 L500,0 L0,0 Z" className="wave wave-front5" />
        </svg>
    <div className="curve-content1">
      <div className="curve-icon1">
        <img src="/baby-icon.png" alt="Baby Icon" />
      </div>
      <span className="curve-text1">Shishu Vriddhi</span>
    </div>
  </div>
);

function NewChildInfo() {
  const [child, setChild] = useState({
    name: "",
    date_of_birth: "",
    gender: "",
    height: "",
    weight: "",
  });
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const nameInputRef = useRef(null);

  const langMap = { en: "english", hi: "hindi", kn: "kannada" };
  const langCode = localStorage.getItem("language") || "en";
  const langKey = langMap[langCode] || "english";

  const labels = {
    english: {
      title: "Enter Child Information",
      detailsTitle: "Child Details",
      name: "Child's Name",
      dateOfBirth: "Date of Birth",
      gender: "Gender",
      genderOptions: { male: "Male", female: "Female", other: "Other" },
      height: "Height (cm)",
      weight: "Weight (kg)",
      submit: "Start Chat",
    },
  };

  const errorMsgs = {
    english: {
      phoneNotFound: "❌ Phone not found. Redirecting to login...",
      nameRequired: "Child's name is required.",
      nameInvalid: "Enter a valid name (letters and spaces only, 2–50 characters).",
      dobRequired: "Date of birth is required.",
      genderRequired: "Please select a gender.",
      heightRequired: "Please enter a valid height in cm.",
      weightRequired: "Please enter a valid weight in kg.",
      saveFailed: "Failed to save child info.",
      saveError: "Error saving child info. Please try again.",
    },
  };

  const currentLabels = labels[langKey] || labels["english"];
  const currentErrors = errorMsgs[langKey] || errorMsgs["english"];

  useEffect(() => {
    const storedPhone = localStorage.getItem("phone");
    if (storedPhone) {
      setPhone(storedPhone);
      nameInputRef.current?.focus();
    } else {
      setErrors({ general: currentErrors.phoneNotFound });
      setTimeout(() => navigate("/"), 2000);
    }
  }, [navigate]);

  const handleChange = (e) => {
    setChild({ ...child, [e.target.name]: e.target.value });
    setErrors({});
  };

  const validateInputs = () => {
    const tempErrors = {};
    if (!child.name.trim()) {
      tempErrors.name = currentErrors.nameRequired;
    } else if (!/^[a-zA-Z\s]{2,50}$/.test(child.name.trim())) {
      tempErrors.name = currentErrors.nameInvalid;
    }
    if (!child.date_of_birth) tempErrors.date_of_birth = currentErrors.dobRequired;
    if (!child.gender) tempErrors.gender = currentErrors.genderRequired;

    // Validate height and weight (positive numbers)

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  function calculateAgeInMonths(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let ageInMonths = years * 12 + months;
    if (today.getDate() < birthDate.getDate()) ageInMonths -= 1;
    return Math.max(ageInMonths, 0);
  }

  const handleSubmit = async () => {
    if (!validateInputs()) return;

    try {
      const response = await fetch("http://localhost:5000/login/save_child_info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...child, phone }),
      });

      const data = await response.json();

      if (response.ok) {
        const age = calculateAgeInMonths(child.date_of_birth);
        localStorage.setItem("childInfo", JSON.stringify({ ...child, phone, age }));
        navigate("/child-info");
      } else {
        setErrors({ general: data.message || currentErrors.saveFailed });
      }
    } catch (error) {
      console.error("Save Error:", error);
      setErrors({ general: currentErrors.saveError });
    }
  };

  return (
    <div className="container1">
      <div className="main-wrapper-two1">
        <div className="right-section1">
          <div className="signin-wrapper">
            <div className="form-container">
              <h2>ADD CHILD</h2>

              {/* Name */}
              <div className="input-wrapper">
                 <CurveHeader />
                <div className="input-row">
                  <span className="input-icon">👶</span>
                  <input
                    ref={nameInputRef}
                    type="text"
                    name="name"
                    placeholder={currentLabels.name}
                    value={child.name}
                    onChange={handleChange}
                    className={`custom-input ${errors.name ? "input-error" : ""}`}
                  />
                </div>
                {errors.name && <div className="field-error">{errors.name}</div>}
              </div>

              {/* Date of Birth */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">🎂</span>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={child.date_of_birth}
                    onChange={handleChange}
                    className={`custom-input ${errors.date_of_birth ? "input-error" : ""}`}
                  />
                </div>
                {errors.date_of_birth && <div className="field-error">{errors.date_of_birth}</div>}
              </div>

              {/* Gender */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">⚧️</span>
                  <select
                    name="gender"
                    value={child.gender}
                    onChange={handleChange}
                    className={`custom-input ${errors.gender ? "input-error" : ""}`}
                  >
                    <option value="">{currentLabels.gender}</option>
                    <option value="Male">{currentLabels.genderOptions.male}</option>
                    <option value="Female">{currentLabels.genderOptions.female}</option>
                    <option value="Other">{currentLabels.genderOptions.other}</option>
                  </select>
                </div>
                {errors.gender && <div className="field-error">{errors.gender}</div>}
              </div>

              {/* Height */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">📏</span>
                  <input
                    type="number"
                    name="height"
                    placeholder={currentLabels.height}
                    value={child.height}
                    onChange={handleChange}
                    className={`custom-input ${errors.height ? "input-error" : ""}`}
                  />
                </div>
                {errors.height && <div className="field-error">{errors.height}</div>}
              </div>

              {/* Weight */}
              <div className="input-wrapper">
                <div className="input-row">
                  <span className="input-icon">⚖️</span>
                  <input
                    type="number"
                    name="weight"
                    placeholder={currentLabels.weight}
                    value={child.weight}
                    onChange={handleChange}
                    className={`custom-input ${errors.weight ? "input-error" : ""}`}
                  />
                </div>
                {errors.weight && <div className="field-error">{errors.weight}</div>}
              </div>

              {/* General error */}
              {errors.general && <div className="general-error">{errors.general}</div>}

              <button className="signin-button" onClick={handleSubmit}>
                REGISTER CHILD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewChildInfo;
