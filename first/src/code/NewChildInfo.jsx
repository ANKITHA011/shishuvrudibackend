import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./newchild.css";
// Volume2, Mic, LogOut are imported but only LogOut is used in CurveHeader.
// If Volume2 and Mic are not used elsewhere, they can be removed.
import { LogOut } from "lucide-react";
import { IoMdHome } from "react-icons/io";
import { PiBabyBold } from "react-icons/pi";
import translations from "./translations3";


const CurveHeader = () => {
  const navigate = useNavigate();

  return (
    // The curve-separator100 will now flow with its parent
    <div className="curve-separator100">
      <svg viewBox="0 0 500 80" preserveAspectRatio="none">
        <path d="M0,0 C200,160 400,0 500,80 L500,0 L0,0 Z" className="wave-wave-back5" />
        <path d="M0,0 C200,80 400,20 500,40 L500,0 L0,0 Z" className="wave wave-front5" />
      </svg>
      {/* Content for the curve header */}
      <div className="curve-content100">
        <div className="curve-icon100">
          <img src="/baby-icon.png" alt="Baby Icon" />
          <span className="curve-text100">Shishu Vriddhi</span>
        </div>

        <div className="top-navigation">
          <div className="nav-icon" onClick={() => navigate("/")}>
            <IoMdHome size={35} />
          </div>
          <div className="nav-icon" onClick={() => navigate("/child-info")}>
            <PiBabyBold size={35} />
          </div>
          <div className="nav-icon" onClick={() => navigate("/signin", { state: { lang: 'en' } })}>
            <LogOut size={35} />
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const langCode = localStorage.getItem("selectedLang") || "en";
  const langKey = langMap[langCode] || "english";

  // Initialize language state
  const [language, setLanguage] = useState("en");
  const t = translations[language] || translations.en;
   const dummyInputRef = useRef(null);

  useEffect(() => {
    // Check for language in location state first, then localStorage
    const langFromLocation = location.state?.lang;
    const langFromStorage = localStorage.getItem("selectedLang");
    const lang = langFromLocation || langFromStorage || "en";
    
    setLanguage(lang);
    localStorage.setItem("selectedLang", lang);

     if (dummyInputRef.current) {
      dummyInputRef.current.focus();
    }
  }, [location.state]);

  const labels = {
    english: {
      title: "Enter Child Information",
      detailsTitle: "Child Details",
      name: t.childname,
      dateOfBirth: t.dateofbirth,
      gender: t.gender,
      //genderOptions: { male: "Male", female: "Female", other: "Other" },
      genderOptions: t.genderOptions,
      height: t.heightcm,
      weight: t.weightkg,
      submit: "Start Chat",
      registerchild:t.registerchild
    },
  };

  const errorMsgs = {
    english: {
      phoneNotFound: "❌ Phone not found. Redirecting to login...",
      nameRequired: t.nameRequired,
      nameInvalid: t.nameInvalid,
      dobRequired: t.dobisrequired,
      genderRequired: t.selectgender,
      heightRequired: t.entervalidheight,
      weightRequired:t.entervalidweight,
      saveFailed: t.failedtosave,
      saveError: t.errorsavinginfo,
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
  }, [navigate, currentErrors.phoneNotFound]);

  const handleChange = (e) => {
    setChild({ ...child, [e.target.name]: e.target.value });
    setErrors({});
  };

  const validateInputs = () => {
    const tempErrors = {};
    if (!child.name.trim()) {
      tempErrors.name = currentErrors.nameRequired;
    } 
    if (!child.date_of_birth) tempErrors.date_of_birth = currentErrors.dobRequired;
    if (!child.gender) tempErrors.gender = currentErrors.genderRequired;


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
        navigate("/chatbot", { state: { refresh: true } });

      } else {
        setErrors({ general: data.message || currentErrors.saveFailed });
      }
    } catch (error) {
      console.error("Save Error:", error);
      setErrors({ general: currentErrors.saveError });
    }
  };

  return (
      <div className="signin-wrapper100">
        {/* CurveHeader is now part of the form's content */}
        <CurveHeader />
        <h2>{t.addChild}</h2>
         <div className="signin-inner100">
        {/* Child's Name */}
        <div className="input-wrapper100">
          <label className="field-label100">{currentLabels.name}</label>
          <div className="input-row100">
            <span className="input-icon100">👶</span>
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
        <div className="input-wrapper100">
          <label className="field-label100">{t.dateofbirth || "⚠️ Missing Translation: addChild"}</label>
          <div className="input-row100">
            <span className="input-icon100">🎂</span>
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
        <div className="input-wrapper100">
          <label className="field-label100">{currentLabels.gender}</label>
          <div className="input-row100">
            <span className="input-icon100">⚧️</span>
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
        <div className="input-wrapper100">
          <label className="field-label100">{currentLabels.height}</label>
          <div className="input-row100">
            <span className="input-icon100">📏</span>
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
        <div className="input-wrapper100">
          <label className="field-label100">{currentLabels.weight}</label>
          <div className="input-row100">
            <span className="input-icon100">⚖️</span>
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
          {currentLabels.registerchild}
        </button>
      </div>
     </div>
  );
}

export default NewChildInfo;